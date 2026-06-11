-- Fix the missed_payment developer simulation so it reproduces a REAL missed
-- payment, and prevent stale grace windows from leaking into other statuses.
--
-- Two bugs:
--   1. The missed_payment branch nulled subscription_tier and never set
--      grace_period_end. But the real stripe-webhook (invoice.payment_failed)
--      sets a 7-day grace window and KEEPS the paid tier. So the simulation
--      could only ever produce the hard 'missed_payment' lock, never the
--      'missed_payment_grace' state a real subscriber first experiences
--      (full access during grace + a "Fix Payment" banner). DOEL 1 requires the
--      sim to behave exactly like a real subscriber.
--   2. grace_period_end was never cleared by the other status branches. The
--      frontend computes gracePeriodActive purely from grace_period_end and
--      folds it into hasFullAccess REGARDLESS of subscription_status — so a
--      grace window left over from a previous missed_payment simulation would
--      grant full access to a later expired_trial / canceled_and_inactive
--      simulation, silently breaking those hard-locks.
--
-- Fix: clear grace_period_end at the top (covers every branch), then have the
-- missed_payment branch set a 7-day grace window + keep the tier, matching the
-- production webhook. Owner rule: a missed payment is NOT cut off immediately —
-- grace first (keep access + banner), hard-lock only after grace expires.

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

  -- Clear any leftover grace window by default. Only the missed_payment branch
  -- re-sets it. Without this, a grace_period_end from a previous missed_payment
  -- simulation would leak into the next status (gracePeriodActive -> hasFullAccess
  -- in the frontend) and break the expired_trial / canceled_and_inactive locks.
  UPDATE users SET grace_period_end = NULL, payment_status = NULL WHERE id = p_user_id;

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
    -- Match production (stripe-webhook invoice.payment_failed): 7-day grace
    -- window and KEEP the paid tier. During grace get_user_status_type returns
    -- 'missed_payment_grace' -> the customer keeps full access + sees the red
    -- "Fix Payment" banner; access is revoked only when grace_period_end passes
    -- ('missed_payment' hard-lock).
    v_subscription_end := v_now + interval '7 days';

    UPDATE users SET
      subscription_status = 'missed_payment',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      grace_period_end = v_now + interval '7 days',
      payment_status = 'unpaid',
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    -- Keep the subscriber row "subscribed" with its tier — a failed invoice does
    -- not cancel the subscription, it just enters grace. (get_user_status_type
    -- checks missed_payment before the subscribed flag, so status stays correct.)
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
$function$;
