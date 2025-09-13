-- Security Hardening: Phase 3 - Fix remaining functions

-- Fix all remaining functions that are missing search_path

-- 1. Fix admin functions
CREATE OR REPLACE FUNCTION public.admin_apply_developer_status(p_user_id uuid, p_status text, p_tier text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := now();
  v_trial_end timestamptz;
  v_subscription_end timestamptz;
  v_effective_tier public.subscription_tier;
  v_calendar_result jsonb;
  v_existing_sub_id uuid;
BEGIN
  -- Normalize tier if provided
  IF p_tier IS NOT NULL AND p_tier <> '' THEN
    v_effective_tier := p_tier::public.subscription_tier;
  ELSE
    v_effective_tier := 'professional'::public.subscription_tier;
  END IF;

  -- Branch on requested developer status
  IF p_status = 'setup_incomplete' THEN
    v_trial_end := v_now + interval '30 days';

    UPDATE public.users SET
      subscription_status = 'trial',
      subscription_tier = 'professional',
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = NULL,
      business_type = NULL,
      updated_at = v_now
    WHERE id = p_user_id;

    -- Ensure subscribers reflects non-subscribed state
    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

  ELSIF p_status = 'active_trial' THEN
    v_trial_end := v_now + interval '30 days';

    UPDATE public.users SET
      subscription_status = 'trial',
      subscription_tier = 'professional',
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    -- Not subscribed during trial
    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    -- Ensure user has a calendar again
    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'expired_trial' THEN
    v_trial_end := v_now - interval '1 day';

    UPDATE public.users SET
      subscription_status = 'expired',
      subscription_tier = NULL,
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    -- Ensure subscribers shows not subscribed
    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    -- Ensure user has a calendar again
    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'missed_payment' THEN
    v_subscription_end := v_now; -- End immediately

    UPDATE public.users SET
      subscription_status = 'missed_payment',
      subscription_tier = NULL,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    -- Subscribers becomes not subscribed
    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, v_subscription_end, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'paid_subscriber' THEN
    v_subscription_end := v_now + interval '30 days';

    UPDATE public.users SET
      subscription_status = 'active',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    -- Subscribers reflects active subscription
    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), true, v_subscription_end, v_effective_tier::text);
    ELSE
      UPDATE public.subscribers
      SET subscribed = true,
          subscription_end = v_subscription_end,
          subscription_tier = v_effective_tier::text,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'canceled_but_active' THEN
    v_subscription_end := v_now + interval '7 days';

    UPDATE public.users SET
      subscription_status = 'canceled',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    -- Subscribers still subscribed until end date
    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), true, v_subscription_end, v_effective_tier::text);
    ELSE
      UPDATE public.subscribers
      SET subscribed = true,
          subscription_end = v_subscription_end,
          subscription_tier = v_effective_tier::text,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'canceled_and_inactive' THEN
    v_subscription_end := v_now - interval '1 day';

    UPDATE public.users SET
      subscription_status = 'expired',
      subscription_tier = NULL,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    -- Subscribers becomes not subscribed
    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, v_subscription_end, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown status');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'applied_status', p_status,
    'tier', COALESCE(p_tier, 'professional'),
    'calendar_result', COALESCE(v_calendar_result, jsonb_build_object('message','no_calendar_change')),
    'processed_at', v_now
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 2. Fix admin_ensure_user_has_calendar
CREATE OR REPLACE FUNCTION public.admin_ensure_user_has_calendar(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_count integer;
  v_calendar_id uuid;
BEGIN
  -- Check if user has any active calendars
  SELECT COUNT(*) INTO v_calendar_count
  FROM public.calendars
  WHERE user_id = p_user_id AND is_active = true;
  
  -- If no calendars exist, create a default one
  IF v_calendar_count = 0 THEN
    INSERT INTO public.calendars (
      user_id,
      name,
      slug,
      description,
      timezone,
      color,
      is_active,
      is_default
    ) VALUES (
      p_user_id,
      'Personal Calendar',
      'personal-' || substr(p_user_id::text, 1, 8),
      'Your personal appointment calendar',
      'Europe/Amsterdam',
      '#3B82F6',
      true,
      true
    ) RETURNING id INTO v_calendar_id;
    
    -- Create a default service type for the new calendar
    INSERT INTO public.service_types (
      calendar_id,
      user_id,
      name,
      duration,
      price,
      description,
      color,
      is_active
    ) VALUES (
      v_calendar_id,
      p_user_id,
      'Standaard Afspraak',
      30,
      50.00,
      'Standaard service type voor afspraken',
      '#3B82F6',
      true
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Default calendar created',
      'calendar_id', v_calendar_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already has calendars',
      'calendar_count', v_calendar_count
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to ensure calendar: ' || SQLERRM
    );
END;
$function$;

-- 3. Fix admin_update_user_subscription
CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(p_user_id uuid, p_subscription_status text DEFAULT NULL::text, p_subscription_tier text DEFAULT NULL::text, p_trial_end_date text DEFAULT NULL::text, p_subscription_end_date text DEFAULT NULL::text, p_business_name text DEFAULT NULL::text, p_business_type text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
  v_current_user record;
BEGIN
  -- Get current user data
  SELECT * INTO v_current_user
  FROM public.users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Update user subscription and business data
  UPDATE public.users 
  SET 
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    subscription_tier = CASE 
      WHEN p_subscription_tier IS NULL THEN NULL
      WHEN p_subscription_tier = '' THEN NULL
      ELSE p_subscription_tier::public.subscription_tier
    END,
    trial_end_date = CASE 
      WHEN p_trial_end_date IS NULL THEN trial_end_date
      WHEN p_trial_end_date = '' THEN NULL
      ELSE p_trial_end_date::timestamp with time zone
    END,
    subscription_end_date = CASE 
      WHEN p_subscription_end_date IS NULL THEN subscription_end_date
      WHEN p_subscription_end_date = '' THEN NULL
      ELSE p_subscription_end_date::timestamp with time zone
    END,
    business_name = CASE 
      WHEN p_business_name IS NULL THEN business_name
      WHEN p_business_name = '' THEN NULL
      ELSE p_business_name
    END,
    business_type = CASE 
      WHEN p_business_type IS NULL THEN business_type
      WHEN p_business_type = '' THEN NULL
      ELSE p_business_type
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Get updated user data
  SELECT * INTO v_current_user
  FROM public.users
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User subscription updated successfully',
    'user', row_to_json(v_current_user)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update user: ' || SQLERRM
    );
END;
$function$;

-- 4. Fix the remaining functions
CREATE OR REPLACE FUNCTION public.complete_user_setup(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Only allow transition if user is currently in setup_incomplete state
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_user_id 
      AND (business_name IS NULL OR business_type IS NULL)
      AND subscription_status = 'trial'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not in setup incomplete state'
    );
  END IF;
  
  -- User should already have business_name and business_type set by this point
  -- This function just confirms the setup is complete
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Setup completed, user is now in active trial'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_automatic_status_transitions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_expired_trials integer := 0;
  v_expired_subscriptions integer := 0;
BEGIN
  -- Update expired trials
  UPDATE public.users 
  SET subscription_status = 'expired',
      updated_at = NOW()
  WHERE subscription_status = 'trial' 
    AND trial_end_date <= NOW()
    AND business_name IS NOT NULL 
    AND business_type IS NOT NULL;
  
  GET DIAGNOSTICS v_expired_trials = ROW_COUNT;
  
  -- Update expired subscriptions (canceled subscriptions past end date)
  UPDATE public.users 
  SET subscription_status = 'expired',
      updated_at = NOW()
  WHERE subscription_status = 'canceled' 
    AND subscription_end_date <= NOW();
  
  GET DIAGNOSTICS v_expired_subscriptions = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'expired_trials', v_expired_trials,
    'expired_subscriptions', v_expired_subscriptions,
    'processed_at', NOW()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_existing_users_retroactively()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Update existing users without trial dates
  UPDATE public.users 
  SET 
    trial_start_date = COALESCE(trial_start_date, created_at),
    trial_end_date = COALESCE(trial_end_date, created_at + interval '7 days')
  WHERE trial_start_date IS NULL OR trial_end_date IS NULL;
  
  -- Update subscription status for expired trials
  UPDATE public.users 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial' 
    AND trial_end_date <= NOW()
    AND subscription_status != 'expired';
  
  -- Set default subscription tier for existing users
  UPDATE public.users 
  SET subscription_tier = 'starter'
  WHERE subscription_tier IS NULL 
    AND subscription_status IN ('active', 'paid');
    
  -- Log the update
  RAISE NOTICE 'Updated existing users retroactively';
END;
$function$;