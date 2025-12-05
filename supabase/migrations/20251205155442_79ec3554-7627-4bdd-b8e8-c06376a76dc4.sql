-- Fix the get_user_status_type function to properly check ALL setup requirements
-- Not just business_name/business_type, but also: calendar, service type, availability

CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_subscriber RECORD;
  v_now timestamptz := now();
  v_has_calendar boolean;
  v_has_service boolean;
  v_has_availability boolean;
BEGIN
  -- Get user data
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  
  -- Check if FULL setup is complete (all 4 requirements):
  -- 1. Business name AND business type
  -- 2. At least one calendar
  -- 3. At least one active service type
  -- 4. At least one availability rule
  
  -- Check for calendar
  SELECT EXISTS(
    SELECT 1 FROM calendars 
    WHERE user_id = p_user_id 
    AND (is_deleted IS NULL OR is_deleted = false)
  ) INTO v_has_calendar;
  
  -- Check for active service type
  SELECT EXISTS(
    SELECT 1 FROM service_types st
    JOIN calendars c ON st.calendar_id = c.id
    WHERE c.user_id = p_user_id 
    AND st.is_active = true
    AND (c.is_deleted IS NULL OR c.is_deleted = false)
  ) INTO v_has_service;
  
  -- Check for availability rules
  SELECT EXISTS(
    SELECT 1 FROM availability_rules ar
    JOIN availability_schedules asch ON ar.schedule_id = asch.id
    JOIN calendars c ON asch.calendar_id = c.id
    WHERE c.user_id = p_user_id
    AND (c.is_deleted IS NULL OR c.is_deleted = false)
  ) INTO v_has_availability;
  
  -- If ANY setup requirement is missing, return setup_incomplete
  IF v_user.business_name IS NULL 
     OR v_user.business_type IS NULL 
     OR NOT v_has_calendar 
     OR NOT v_has_service 
     OR NOT v_has_availability THEN
    RETURN 'setup_incomplete';
  END IF;
  
  -- Check for missed payment with grace period
  IF v_user.subscription_status IN ('past_due', 'incomplete', 'missed_payment') THEN
    IF v_user.grace_period_end IS NOT NULL AND v_user.grace_period_end > v_now THEN
      RETURN 'missed_payment_grace';
    ELSE
      RETURN 'missed_payment';
    END IF;
  END IF;
  
  -- Check if user is an active paid subscriber
  SELECT * INTO v_subscriber 
  FROM subscribers 
  WHERE user_id = p_user_id;
  
  IF FOUND AND v_subscriber.subscribed = true THEN
    RETURN 'paid_subscriber';
  END IF;
  
  -- Check cancellation status
  IF v_user.subscription_status = 'canceled' THEN
    IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
      RETURN 'canceled_but_active';
    ELSE
      RETURN 'canceled_and_inactive';
    END IF;
  END IF;
  
  -- Check trial status
  IF v_user.subscription_status = 'trial' THEN
    IF v_user.trial_end_date IS NOT NULL THEN
      IF v_user.trial_end_date > v_now THEN
        RETURN 'active_trial';
      ELSE
        RETURN 'expired_trial';
      END IF;
    ELSE
      RETURN 'active_trial';
    END IF;
  END IF;
  
  -- Check if trial has expired
  IF v_user.trial_end_date IS NOT NULL AND v_user.trial_end_date <= v_now THEN
    RETURN 'expired_trial';
  END IF;
  
  -- Default to setup_incomplete if no valid subscription status
  RETURN 'setup_incomplete';
END;
$$;