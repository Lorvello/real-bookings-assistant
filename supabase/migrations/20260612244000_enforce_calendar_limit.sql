-- BILLING/TIER: enforce the plan's max_calendars server-side (it was UI-only, so a
-- direct API call could create unlimited calendars). Mirrors the frontend access
-- model. Designed to NEVER block a legit/paying user:
--  - service_role / internal chains (auth.uid() NULL) bypass entirely.
--  - the first calendar (count 0) is always allowed (0 < any limit >= 1).
--  - unlimited tiers (max_calendars NULL, e.g. professional) are never blocked.
--  - on any uncertainty (no status/tier) it allows (permissive default).
CREATE OR REPLACE FUNCTION public.enforce_calendar_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_status text;
  v_tier text;
  v_max int;
  v_count int;
  v_grace timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- service_role / internal

  BEGIN
    v_status := public.get_user_status_type(NEW.user_id);
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW; -- can't determine -> permissive
  END;

  SELECT subscription_tier, grace_period_end INTO v_tier, v_grace
  FROM public.users WHERE id = NEW.user_id;

  -- Lapsed states drop to Free (1 calendar); missed_payment keeps its tier in grace.
  IF v_status IN ('expired_trial', 'canceled_and_inactive') THEN
    v_tier := 'free';
  ELSIF v_status = 'missed_payment' THEN
    IF v_grace IS NULL OR v_grace <= now() THEN v_tier := 'free'; END IF;
  END IF;

  IF v_tier IS NULL THEN RETURN NEW; END IF;

  SELECT max_calendars INTO v_max FROM public.subscription_tiers
   WHERE tier_name = v_tier::public.subscription_tier;
  IF v_max IS NULL THEN RETURN NEW; END IF; -- unlimited

  SELECT count(*) INTO v_count FROM public.calendars
   WHERE user_id = NEW.user_id AND COALESCE(is_deleted, false) = false;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Calendar limit reached for your plan (max %). Upgrade to add more.', v_max
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END; $fn$;

DROP TRIGGER IF EXISTS trigger_enforce_calendar_limit ON public.calendars;
CREATE TRIGGER trigger_enforce_calendar_limit
BEFORE INSERT ON public.calendars
FOR EACH ROW EXECUTE FUNCTION public.enforce_calendar_limit();
