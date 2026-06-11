-- Fix canceled_* dev statuses: canceled_but_active must set subscribers.subscribed=false
-- (else get_user_status_type's subscribed=true check returns paid_subscriber first),
-- and canceled_and_inactive must set users.subscription_status='canceled' (not 'expired')
-- so get_user_status_type maps it correctly.

CREATE OR REPLACE FUNCTION public.admin_apply_developer_status(p_user_id uuid, p_status text, p_tier text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_trial_end TIMESTAMPTZ;
  v_subscription_end TIMESTAMPTZ;
  v_effective_tier subscription_tier;
  v_calendar_result JSONB;
  v_existing_sub_id UUID;
BEGIN
  -- CRITICAL: Check if caller is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  -- Normalize tier if provided
  IF p_tier IS NOT NULL AND p_tier <> '' THEN
    v_effective_tier := p_tier::subscription_tier;
  ELSE
    v_effective_tier := 'professional'::subscription_tier;
  END IF;

  -- Branch on requested developer status
  IF p_status = 'setup_incomplete' THEN
    v_trial_end := v_now + interval '30 days';

    UPDATE users SET
      subscription_status = 'trial',
      subscription_tier = 'professional',
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = NULL,
      business_type = NULL,
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

  ELSIF p_status = 'active_trial' THEN
    v_trial_end := v_now + interval '30 days';

    UPDATE users SET
      subscription_status = 'trial',
      subscription_tier = 'professional',
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'expired_trial' THEN
    v_trial_end := v_now - interval '1 day';

    UPDATE users SET
      subscription_status = 'expired',
      subscription_tier = NULL,
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'missed_payment' THEN
    v_subscription_end := v_now;

    UPDATE users SET
      subscription_status = 'missed_payment',
      subscription_tier = NULL,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, v_subscription_end, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'paid_subscriber' THEN
    v_subscription_end := v_now + interval '30 days';

    UPDATE users SET
      subscription_status = 'active',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), true, v_subscription_end, v_effective_tier::text);
    ELSE
      UPDATE subscribers
      SET subscribed = true,
          subscription_end = v_subscription_end,
          subscription_tier = v_effective_tier::text,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'canceled_but_active' THEN
    v_subscription_end := v_now + interval '7 days';

    UPDATE users SET
      subscription_status = 'canceled',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, v_subscription_end, v_effective_tier::text);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = v_effective_tier::text,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'canceled_and_inactive' THEN
    v_subscription_end := v_now - interval '1 day';

    UPDATE users SET
      subscription_status = 'canceled',
      subscription_tier = NULL,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, v_subscription_end, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

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
$function$
;
