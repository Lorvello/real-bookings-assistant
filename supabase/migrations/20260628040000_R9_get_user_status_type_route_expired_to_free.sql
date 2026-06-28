-- F-012 fix: get_user_status_type must route a completed-setup user whose
-- subscription_status='expired' to a lapsed-Free state (expired_trial), not fall
-- through to setup_incomplete (which hard-locks to maxCalendars:0). The
-- check-subscription no-customer branch writes status='expired' with null
-- trial/subscription dates, and update_expired_trials() sets 'expired' too;
-- without this branch such a genuinely-lapsed (but fully set-up) tenant gets a
-- hard lock instead of the access-model's Free downgrade.
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

  SELECT * INTO v_subscriber FROM subscribers WHERE user_id = p_user_id;
  IF FOUND AND v_subscriber.subscribed = true THEN
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
