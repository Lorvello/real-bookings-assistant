-- R92 (PREEMPT, sev-1 paywall-leak regression, filed IUX_r91_verify.md / IUX_r92.md)
--
-- PROBLEM. R46 (20260703120000_R46_P9_cancel_at_period_end_visibility.sql) rewrote
-- get_user_status_type() to fix a real bug (a pending Stripe cancel-at-period-end never
-- surfaced because the canceled-check sat after the subscribers.subscribed short-circuit).
-- R46's own comment claims "every other branch is byte-identical to the live R9 definition
-- (20260628040000)" -- but R9 predates R11/F013 (20260628120000), which had already added a
-- `v_user_lapsed` guard around the subscribers short-circuit specifically to stop a stale
-- subscribers.subscribed=true row from overriding a genuinely-lapsed trial/subscription. R46
-- based its rewrite on the PRE-F013 body, silently dropping that guard while reordering the
-- canceled-check ahead of the subscribers-check.
--
-- Net effect (reproduced live 2026-07-04 against a fresh throwaway tenant): any tenant whose
-- trial has genuinely expired (trial_end_date in the past) but whose subscribers row still
-- says subscribed=true (the NORMAL state left behind by the hourly update-expired-trials cron,
-- which only writes users.subscription_status and never touches subscribers) gets
-- get_user_status_type() = 'paid_subscriber' instead of 'expired_trial'. Full paywall bypass,
-- and it also flows into the WhatsApp webhook's `entitled` array (paid_subscriber is entitled),
-- incorrectly keeping message-forwarding active for a lapsed tenant.
--
-- FIX. Restore R11/F013's v_user_lapsed guard, composed with R46's reordering (not reverting
-- it): keep the canceled-check FIRST (R46's fix for cancel-at-period-end visibility depends on
-- reaching that branch before the subscribers short-circuit), then compute v_user_lapsed and
-- gate the subscribers short-circuit with it (R11/F013's fix). A tenant with
-- subscription_status='canceled' never reaches the subscribers check at all (it returns from
-- the canceled-check branch), so v_user_lapsed's own 'canceled' clause is dead code in the
-- current control flow, but it is kept for defense-in-depth / documentation of intent and
-- exact parity with the F013 predicate, matching how F013 originally defined "lapsed". Every
-- other branch (trial, expired, setup_incomplete, missed_payment*) is untouched from the live
-- R46 definition.
--
-- This restores the R11/F013 fix and preserves the R46 fix simultaneously:
--  * expired trial + stale subscribers.subscribed=true -> now correctly 'expired_trial' again
--  * active trial + subscribers.subscribed=true/false -> unchanged 'active_trial'
--  * genuine cancel-at-period-end (status='canceled', subscription_end_date in the future,
--    regardless of subscribers.subscribed) -> unchanged 'canceled_but_active' (R46's own fix,
--    untouched, still fires before the subscribers check)

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
  v_user_lapsed boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: not your user record' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM calendars
    WHERE user_id = p_user_id AND (is_deleted IS NULL OR is_deleted = false)
  ) INTO v_has_calendar;

  SELECT EXISTS(
    SELECT 1 FROM service_types st
    JOIN calendars c ON st.calendar_id = c.id
    WHERE c.user_id = p_user_id AND st.is_active = true
      AND (c.is_deleted IS NULL OR c.is_deleted = false)
  ) INTO v_has_service;

  SELECT EXISTS(
    SELECT 1 FROM availability_rules ar
    JOIN availability_schedules asch ON ar.schedule_id = asch.id
    JOIN calendars c ON asch.calendar_id = c.id
    WHERE c.user_id = p_user_id AND (c.is_deleted IS NULL OR c.is_deleted = false)
  ) INTO v_has_availability;

  IF v_user.business_name IS NULL OR btrim(v_user.business_name) = ''
     OR v_user.business_type IS NULL OR btrim(v_user.business_type) = ''
     OR NOT v_has_calendar OR NOT v_has_service OR NOT v_has_availability THEN
    RETURN 'setup_incomplete';
  END IF;

  IF v_user.subscription_status IN ('past_due', 'incomplete', 'missed_payment') THEN
    IF v_user.grace_period_end IS NOT NULL AND v_user.grace_period_end > v_now THEN
      RETURN 'missed_payment_grace';
    ELSE
      RETURN 'missed_payment';
    END IF;
  END IF;

  -- R46: check a pending cancellation BEFORE the subscribers short-circuit below.
  -- subscription_status='canceled' covers BOTH the genuine full-deletion path
  -- (handleSubscriptionDeleted) AND the pending-cancel-at-period-end path
  -- (handleSubscriptionUpdated with cancel_at_period_end=true, R46). Either way,
  -- subscription_end_date decides canceled_but_active vs canceled_and_inactive. Unchanged
  -- from R46; this branch's own visibility fix is preserved as-is.
  IF v_user.subscription_status = 'canceled' THEN
    IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
      RETURN 'canceled_but_active';
    ELSE
      RETURN 'canceled_and_inactive';
    END IF;
  END IF;

  -- R92 (restores R11/F013): determine whether public.users itself reports a lapsed account.
  -- The subscribers.subscribed short-circuit below MUST NOT override this, or a stale
  -- subscribers row leaks paid access onto a genuinely lapsed tenant. By this point
  -- subscription_status is guaranteed NOT 'canceled' (handled above), so the 'canceled' clause
  -- here is inert under current control flow; kept for exact parity with F013's original
  -- predicate and as a guard against any future reordering.
  v_user_lapsed := (
    v_user.subscription_status = 'expired'
    OR (v_user.subscription_status = 'trial'
        AND v_user.trial_end_date IS NOT NULL
        AND v_user.trial_end_date <= v_now)
    OR (v_user.subscription_status IN ('active', 'paid')
        AND v_user.subscription_end_date IS NOT NULL
        AND v_user.subscription_end_date <= v_now)
    OR (v_user.subscription_status = 'canceled'
        AND v_user.subscription_end_date IS NOT NULL
        AND v_user.subscription_end_date <= v_now)
  );

  SELECT * INTO v_subscriber FROM subscribers WHERE user_id = p_user_id;
  IF FOUND AND v_subscriber.subscribed = true AND NOT v_user_lapsed THEN
    RETURN 'paid_subscriber';
  END IF;

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

  IF v_user.trial_end_date IS NOT NULL AND v_user.trial_end_date <= v_now THEN
    RETURN 'expired_trial';
  END IF;

  -- F-012: a completed-setup tenant explicitly marked 'expired' (e.g. via
  -- update_expired_trials() or check-subscription's no-customer branch) is
  -- genuinely lapsed, not setup-incomplete. Route to expired_trial so the
  -- frontend grants the Free downgrade (1 calendar, no WhatsApp-AI) per the
  -- freemium-downgrade access model, instead of a maxCalendars:0 hard lock.
  IF v_user.subscription_status = 'expired' THEN
    RETURN 'expired_trial';
  END IF;

  RETURN 'setup_incomplete';
END;
$function$;
