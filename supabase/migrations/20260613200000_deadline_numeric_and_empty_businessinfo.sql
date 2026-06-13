-- LR-R101: #95 cancellation_deadline_hours integer->numeric(5,2) (0.5u werd 1u) +
-- cancel_booking_for_agent v_deadline numeric. #383: get_user_status_type ziet lege/
-- whitespace business_name/type nu als setup_incomplete (align met de frontend-wizard).

alter table public.calendar_settings alter column cancellation_deadline_hours type numeric(5,2);

CREATE OR REPLACE FUNCTION public.cancel_booking_for_agent(p_booking_id uuid, p_phone text, p_reason text DEFAULT 'Geannuleerd via WhatsApp'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_b bookings%ROWTYPE; v_allow boolean; v_deadline numeric; v_hours numeric; BEGIN SELECT * INTO v_b FROM bookings WHERE id = p_booking_id; IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Boeking niet gevonden'); END IF; IF v_b.customer_phone IS DISTINCT FROM p_phone THEN RETURN jsonb_build_object('success',false,'error','Deze boeking hoort niet bij dit telefoonnummer'); END IF; IF v_b.status = 'cancelled' THEN RETURN jsonb_build_object('success',false,'error','Deze afspraak is al geannuleerd'); END IF; SELECT cs.allow_cancellations, cs.cancellation_deadline_hours INTO v_allow, v_deadline FROM calendar_settings cs WHERE cs.calendar_id = v_b.calendar_id; IF v_allow IS NOT NULL AND v_allow = false THEN RETURN jsonb_build_object('success',false,'error','Annuleren via de assistent is niet toegestaan; neem contact op met de zaak'); END IF; v_hours := EXTRACT(EPOCH FROM (v_b.start_time - now()))/3600; IF v_deadline IS NOT NULL AND v_hours < v_deadline THEN RETURN jsonb_build_object('success',false,'error', format('Te laat om te annuleren: dat moet minimaal %s uur van tevoren. Neem contact op met de zaak.', v_deadline)); END IF; UPDATE bookings SET status='cancelled', cancelled_at=now(), cancellation_reason=p_reason, updated_at=now() WHERE id=p_booking_id; RETURN jsonb_build_object('success',true,'booking_id',p_booking_id,'cancelled_at',now()); END; $function$
;

CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user RECORD;
  v_subscriber RECORD;
  v_now timestamptz := now();
  v_has_calendar boolean;
  v_has_service boolean;
  v_has_availability boolean;
BEGIN
  -- SECURITY: authenticated callers may only query themselves; admins and
  -- service_role / internal (auth.uid() NULL) bypass.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: not your user record' USING ERRCODE = '42501';
  END IF;
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
  IF v_user.business_name IS NULL OR btrim(v_user.business_name) = '' 
     OR v_user.business_type IS NULL OR btrim(v_user.business_type) = '' 
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
$function$
;
