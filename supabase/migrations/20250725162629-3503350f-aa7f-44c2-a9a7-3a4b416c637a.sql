-- Update the handle_new_user function to automatically set up new users with Professional trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    subscription_status,
    subscription_tier,
    trial_start_date,
    trial_end_date,
    business_name,
    business_type,
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
    NULL, -- Keep NULL to trigger setup incomplete
    NULL, -- Keep NULL to trigger setup incomplete
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Update get_user_status_type function to prioritize setup incomplete check
CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
  
  -- FIRST: Check for setup incomplete (prioritize this)
  IF v_user.business_name IS NULL OR v_user.business_type IS NULL THEN
    RETURN 'setup_incomplete';
  END IF;
  
  -- THEN: Check subscription status
  CASE v_user.subscription_status
    WHEN 'trial' THEN
      IF v_user.trial_end_date IS NULL THEN
        RETURN 'setup_incomplete';
      ELSIF v_user.trial_end_date > v_now THEN
        RETURN 'trial';
      ELSE
        RETURN 'expired_trial';
      END IF;
      
    WHEN 'active' THEN
      IF v_user.subscription_end_date IS NULL OR v_user.subscription_end_date > v_now THEN
        RETURN 'subscriber';
      ELSE
        RETURN 'expired_trial';
      END IF;
      
    WHEN 'canceled' THEN
      IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
        RETURN 'canceled_subscriber';
      ELSE
        RETURN 'canceled_and_inactive';
      END IF;
      
    WHEN 'expired' THEN
      RETURN 'expired_trial';
      
    ELSE
      RETURN 'unknown';
  END CASE;
END;
$$;