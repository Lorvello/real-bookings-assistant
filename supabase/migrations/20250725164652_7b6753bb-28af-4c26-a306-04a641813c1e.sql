-- Update handle_new_user to ensure setup incomplete status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    subscription_status,
    subscription_tier,
    trial_start_date,
    trial_end_date,
    business_name,      -- Keep NULL for setup incomplete
    business_type,      -- Keep NULL for setup incomplete
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    'trial',
    'professional',
    NOW(),
    NOW() + interval '7 days',
    NULL,               -- Force NULL for setup incomplete
    NULL,               -- Force NULL for setup incomplete
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;

-- Create improved user status type function that returns correct frontend status names
CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user record;
  v_now timestamp with time zone := NOW();
BEGIN
  -- Get user data
  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  
  -- Check for setup incomplete (business_name or business_type is NULL)
  IF v_user.business_name IS NULL OR v_user.business_type IS NULL THEN
    RETURN 'setup_incomplete';
  END IF;
  
  -- Active paid subscription
  IF v_user.subscription_status = 'active' AND v_user.subscription_tier IS NOT NULL THEN
    RETURN 'paid_subscriber';
  END IF;
  
  -- Canceled but still active (subscription_end_date in future)
  IF v_user.subscription_status = 'canceled' AND 
     v_user.subscription_end_date IS NOT NULL AND 
     v_user.subscription_end_date > v_now THEN
    RETURN 'canceled_but_active';
  END IF;
  
  -- Canceled and inactive (subscription_end_date in past)
  IF v_user.subscription_status = 'canceled' AND 
     v_user.subscription_end_date IS NOT NULL AND 
     v_user.subscription_end_date <= v_now THEN
    RETURN 'canceled_and_inactive';
  END IF;
  
  -- Expired subscription
  IF v_user.subscription_status = 'expired' OR
     (v_user.subscription_status = 'canceled' AND v_user.subscription_end_date IS NULL) THEN
    RETURN 'expired_trial';
  END IF;
  
  -- Active trial (trial_end_date in future)
  IF v_user.subscription_status = 'trial' AND 
     v_user.trial_end_date IS NOT NULL AND 
     v_user.trial_end_date > v_now THEN
    RETURN 'active_trial';
  END IF;
  
  -- Expired trial (trial_end_date in past)
  IF v_user.subscription_status = 'trial' AND 
     v_user.trial_end_date IS NOT NULL AND 
     v_user.trial_end_date <= v_now THEN
    RETURN 'expired_trial';
  END IF;
  
  RETURN 'unknown';
END;
$function$;

-- Create function to transition users from setup_incomplete to active_trial
CREATE OR REPLACE FUNCTION public.complete_user_setup(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

-- Create automatic status transition function (to be called by cron)
CREATE OR REPLACE FUNCTION public.process_automatic_status_transitions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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