-- Add missed_payment case to admin_apply_developer_status function
CREATE OR REPLACE FUNCTION public.admin_apply_developer_status(p_user_id uuid, p_status text, p_tier text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

    -- Do not ensure calendar here; setup flow may create it later

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