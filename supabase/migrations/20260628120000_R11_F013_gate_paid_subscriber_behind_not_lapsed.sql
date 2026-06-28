-- R11 / F-013 (sev-2 paywall-leak, class-fix at the READ site)
--
-- PROBLEM. get_user_status_type() returns 'paid_subscriber' the moment
-- subscribers.subscribed = true, BEFORE any check of whether the user's own
-- record in public.users has lapsed. ~4 lapse-writers (check-subscription's
-- no-customer branch [fixed F-011], update_expired_trials(),
-- process_automatic_status_transitions(), update_existing_users_retroactively())
-- flip users.subscription_status to 'expired' but leave subscribers.subscribed
-- untouched. On any tenant where subscribers is stale, that yields
-- users=expired + subscribers.subscribed=true -> RPC='paid_subscriber' = full
-- paid access on a lapsed tenant = PAYWALL LEAK (identical class to F-011).
--
-- ROBUST FIX (this migration). Instead of chasing every writer, gate the
-- paid_subscriber branch at the single READ site: only honour
-- subscribers.subscribed=true when public.users is NOT lapsed. "Lapsed" =
--   * subscription_status = 'expired', OR
--   * a 'trial' whose trial_end_date is in the past, OR
--   * an 'active'/'paid' subscription whose subscription_end_date is in the past, OR
--   * a 'canceled' subscription whose subscription_end_date is in the past.
-- When users is lapsed, fall through to the existing canceled/trial/expired
-- logic, which routes the tenant to expired_trial / canceled_and_inactive (the
-- Free downgrade) exactly as the freemium-downgrade access model requires.
--
-- This neutralizes update_expired_trials() and
-- process_automatic_status_transitions() (both set status='expired') so D-008
-- can schedule the cron without surfacing the leak. It does NOT change the
-- decision for a genuinely paid/active subscriber (status active/paid/trial,
-- not past end) nor for canceled_but_active (end-date in the future), so the
-- R9 8-state sweep does not regress.

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

  -- F-013: determine whether public.users itself reports a lapsed account.
  -- The subscribers.subscribed short-circuit below MUST NOT override this, or a
  -- stale subscribers row leaks paid access onto a lapsed tenant.
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

  IF v_user.subscription_status = 'canceled' THEN
    IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
      RETURN 'canceled_but_active';
    ELSE
      RETURN 'canceled_and_inactive';
    END IF;
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
