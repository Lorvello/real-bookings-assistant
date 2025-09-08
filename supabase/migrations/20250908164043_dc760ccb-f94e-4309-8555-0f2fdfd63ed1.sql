-- Ensure a single authoritative user status calculator
CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user RECORD;
  v_sub RECORD;
  v_now timestamptz := now();
BEGIN
  -- Load user profile essentials
  SELECT 
    u.id,
    u.subscription_status,
    u.subscription_tier,
    u.trial_end_date,
    u.subscription_end_date,
    u.business_name,
    u.business_type
  INTO v_user
  FROM public.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;

  -- 1) Setup incomplete takes precedence
  IF v_user.business_name IS NULL OR v_user.business_type IS NULL THEN
    RETURN 'setup_incomplete';
  END IF;

  -- Fetch latest subscriber record (Stripe truth source)
  SELECT s.subscribed, s.subscription_end
  INTO v_sub
  FROM public.subscribers s
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC
  LIMIT 1;

  -- 2) Active paid subscriber (Stripe) → may still be canceled but active in app state
  IF COALESCE(v_sub.subscribed, false) IS TRUE THEN
    IF v_user.subscription_status = 'canceled' THEN
      IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
        RETURN 'canceled_but_active';
      ELSE
        RETURN 'canceled_and_inactive';
      END IF;
    END IF;
    RETURN 'paid_subscriber';
  END IF;

  -- 3) Not subscribed currently → check cancellation states
  IF v_user.subscription_status = 'canceled' THEN
    IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
      RETURN 'canceled_but_active';
    ELSE
      RETURN 'canceled_and_inactive';
    END IF;
  END IF;

  -- 4) Trial logic
  IF v_user.subscription_status = 'trial' THEN
    IF v_user.trial_end_date IS NOT NULL AND v_user.trial_end_date > v_now THEN
      RETURN 'active_trial';
    ELSE
      RETURN 'expired_trial';
    END IF;
  END IF;

  -- 5) Explicit expired (safety net)
  IF v_user.subscription_status = 'expired' THEN
    RETURN 'expired_trial';
  END IF;

  RETURN 'unknown';
END;
$$;