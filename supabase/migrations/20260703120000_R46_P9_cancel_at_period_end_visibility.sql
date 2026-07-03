-- R46 (P9-CANCELSTATE-INVISIBLE, sev-2, filed IUX_r45.md): a real Stripe portal
-- cancellation schedules cancel_at_period_end=true while subscription.status stays
-- 'active'. stripe-webhook's handleSubscriptionUpdated never read that flag, so
-- users.subscription_status stayed 'active' and get_user_status_type()'s existing
-- canceled_but_active branch was structurally unreachable: the app showed zero
-- cancellation indication for the whole remaining paid period. Underlying Stripe
-- billing was always correct (no double-charge risk); this is a pure display/trust
-- gap. Fix: add a `cancel_at_period_end` column for observability + make the webhook
-- write subscription_status='canceled' on a pending-cancel event (reusing the
-- doctrine-correct canceled_but_active state machine, not a new parallel status) +
-- reorder get_user_status_type() so the subscribers.subscribed short-circuit no
-- longer masks a pending cancellation.

-- 1. New nullable column, defaults false, never breaks an existing row.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.cancel_at_period_end IS
  'Mirrors Stripe subscription.cancel_at_period_end. System-managed (stripe-webhook only, service_role); see guard_users_subscription_columns trigger. True means the owner has scheduled a cancel that takes effect at subscription_end_date; subscription_status is set to ''canceled'' in lockstep by handleSubscriptionUpdated/handleSubscriptionDeleted so get_user_status_type() can route correctly.';

-- 2. Extend the existing client-write guard trigger (20260612180000) to also protect
--    this column. Client-side writes to subscription-state columns are system-managed
--    (stripe-webhook via service_role only); CREATE OR REPLACE keeps the trigger
--    binding identical, just adds one more guarded column to the same check.
CREATE OR REPLACE FUNCTION public.guard_users_subscription_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.subscription_status   IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_tier  IS DISTINCT FROM OLD.subscription_tier
       OR NEW.trial_end_date     IS DISTINCT FROM OLD.trial_end_date
       OR NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date
       OR NEW.grace_period_end   IS DISTINCT FROM OLD.grace_period_end
       OR NEW.payment_status     IS DISTINCT FROM OLD.payment_status
       OR NEW.cancel_at_period_end IS DISTINCT FROM OLD.cancel_at_period_end THEN
      RAISE EXCEPTION 'Subscription state is system-managed and cannot be changed directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. get_user_status_type(): reorder so a pending cancellation (users.subscription_status
--    = 'canceled') is checked BEFORE the subscribers.subscribed short-circuit. Stripe
--    keeps subscribers.subscribed=true until the period genuinely ends (customer.
--    subscription.deleted, handled separately by handleSubscriptionDeleted which already
--    flips subscribed=false), so without this reordering a pending-cancel write to
--    users.subscription_status would still be masked by the subscribers short-circuit
--    returning 'paid_subscriber' first. Every other branch is byte-identical to the live
--    R9 definition (20260628040000); only the ORDER of the subscribers-check and the
--    canceled-check is swapped.
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
  -- subscription_status='canceled' now covers BOTH the genuine full-deletion path
  -- (handleSubscriptionDeleted) AND the pending-cancel-at-period-end path
  -- (handleSubscriptionUpdated with cancel_at_period_end=true, R46). Either way,
  -- subscription_end_date decides canceled_but_active vs canceled_and_inactive,
  -- exactly as before this fix; only the ordering relative to the subscribers check
  -- changed.
  IF v_user.subscription_status = 'canceled' THEN
    IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
      RETURN 'canceled_but_active';
    ELSE
      RETURN 'canceled_and_inactive';
    END IF;
  END IF;

  SELECT * INTO v_subscriber FROM subscribers WHERE user_id = p_user_id;
  IF FOUND AND v_subscriber.subscribed = true THEN
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
