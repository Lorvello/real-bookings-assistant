-- R41: harden check_team_member_limit (DoD round-4 MEDIUM)
--
-- Two real bugs in the team-size gate used by accept_team_invitation,
-- invite_team_member and accept_team_invitation_for_user:
--   1. It read the tier ONLY from users.subscription_tier. For a paid subscriber whose
--      users mirror is null (the subscribers/users drift, e.g. a manually-provisioned
--      account), the tier — and therefore max_team_members — came back NULL.
--   2. NULL max made `count < NULL` evaluate to NULL, and the callers' `IF NOT check(...)
--      THEN reject` skipped the reject on NULL → ANY user with an unresolved tier
--      (expired / null-mirror) could add UNLIMITED members, bypassing the gate.
--
-- Fix: resolve the tier from users, then from an active subscribers row, then default to
-- the most-restrictive 'free'. Treat a NULL max as genuinely unlimited (enterprise) only
-- after a real tier resolved. Count semantics unchanged.
CREATE OR REPLACE FUNCTION public.check_team_member_limit(p_user_id uuid, p_calendar_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_count integer;
  v_max_members integer;
  v_subscription_tier text;
BEGIN
  -- Resolve the effective tier the same way the status RPC does: prefer the users
  -- mirror, fall back to an ACTIVE subscribers row, else the most restrictive 'free'.
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users
  WHERE id = p_user_id;

  IF v_subscription_tier IS NULL THEN
    SELECT subscription_tier INTO v_subscription_tier
    FROM public.subscribers
    WHERE user_id = p_user_id AND subscribed = true;
  END IF;

  IF v_subscription_tier IS NULL THEN
    v_subscription_tier := 'free';
  END IF;

  SELECT max_team_members INTO v_max_members
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::public.subscription_tier;

  SELECT COUNT(*) + 1 INTO v_current_count
  FROM public.calendar_members cm
  WHERE cm.calendar_id = p_calendar_id;

  -- A NULL cap on a resolved tier means unlimited (enterprise). A non-subscriber can
  -- never reach here with NULL because we defaulted to 'free' (cap 1).
  IF v_max_members IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_current_count < v_max_members;
END;
$function$;
