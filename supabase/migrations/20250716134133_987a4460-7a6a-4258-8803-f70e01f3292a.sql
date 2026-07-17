-- Update the get_user_status_type function to include canceled_and_inactive status
CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get user details
  SELECT * INTO v_user
  FROM public.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  
  -- Check for active paid subscription
  IF v_user.subscription_status = 'active' AND 
     (v_user.subscription_end_date IS NULL OR v_user.subscription_end_date > v_now) THEN
    RETURN 'subscriber';
  END IF;
  
  -- Check for canceled but still active subscription
  IF v_user.subscription_status = 'canceled' AND 
     v_user.subscription_end_date IS NOT NULL AND 
     v_user.subscription_end_date > v_now THEN
    RETURN 'canceled_subscriber';
  END IF;
  
  -- Check for canceled and inactive subscription
  IF v_user.subscription_status = 'canceled' AND 
     v_user.subscription_end_date IS NOT NULL AND 
     v_user.subscription_end_date <= v_now THEN
    RETURN 'canceled_and_inactive';
  END IF;
  
  -- Check for active trial
  IF v_user.subscription_status = 'trial' AND 
     v_user.trial_end_date IS NOT NULL AND 
     v_user.trial_end_date > v_now THEN
    RETURN 'trial';
  END IF;
  
  -- Check for expired trial
  IF v_user.subscription_status = 'trial' AND 
     v_user.trial_end_date IS NOT NULL AND 
     v_user.trial_end_date <= v_now THEN
    RETURN 'expired_trial';
  END IF;
  
  -- Check for setup incomplete (no business_name or business_type)
  IF v_user.business_name IS NULL OR v_user.business_type IS NULL THEN
    RETURN 'setup_incomplete';
  END IF;
  
  -- Default fallback
  RETURN 'unknown';
END;
$$;