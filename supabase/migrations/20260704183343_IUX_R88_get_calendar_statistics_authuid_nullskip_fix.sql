-- R88 (PREEMPT, AUTHUID-NULLCOMPARISON-PATTERN-SWEEP closing round): fix the 3rd confirmed
-- instance of the auth.uid() NULL-comparison footgun, this time in get_calendar_statistics.
--
-- Root cause (same class as R86 accept_team_invitation_for_user and R87 invite_team_member):
-- `IF v_user_id != auth.uid() THEN reject` NULL-skips whenever v_user_id is NULL, which happens
-- for a guessed/nonexistent p_calendar_id (the SELECT INTO simply finds no row). In SQL,
-- `NULL != <anything>` evaluates to NULL, not TRUE, so the reject never fires and the function
-- falls through to the aggregate query, which legitimately returns all-zero because no bookings
-- match a nonexistent calendar_id. Net effect: any AUTHENTICATED caller supplying an arbitrary
-- calendar_id gets a 200 all-zero response instead of a rejection, an existence/emptiness oracle
-- across guessed calendar ids (not real data disclosure for a real foreign calendar, since the
-- pre-existing `v_user_id != auth.uid()` comparison already correctly rejects when both sides are
-- non-NULL and differ, e.g. a real calendar owned by someone else).
--
-- Confirmed live pre-fix (R88 evidence, fresh throwaway fixtures, never touching Lorvello):
-- authenticated attacker against a real foreign calendar -> correctly rejected (P0001);
-- authenticated attacker against a guessed/nonexistent calendar_id -> silent all-zero stats
-- object, HTTP 200, instead of a rejection.
--
-- Fix: same fail-closed pattern used in R86/R87. Explicit auth.uid() IS NULL early reject
-- (defense in depth: covers a future anon-grant regression at the function-body layer too),
-- plus widen the ownership check to `v_user_id IS NULL OR v_user_id != auth.uid()` so a
-- nonexistent/foreign calendar_id fails closed instead of NULL-skipping through.
--
-- Grant hygiene: live grants were anon=false (not anonymously exploitable, matching R87-verify's
-- observation), authenticated=true, service_role=true. Call-site grep across supabase/functions/
-- and src/ found ZERO real callers (only an auto-generated TS type stub in
-- src/integrations/supabase/types.ts references the name, never a real `.rpc(...)` invocation).
-- No legitimate reason for `authenticated` to call this RPC directly today, so it is revoked from
-- PUBLIC and authenticated as well, leaving only service_role (matching this loop's established
-- least-privilege convention: revoke what has no real call site, per R86/R87's own methodology).

CREATE OR REPLACE FUNCTION public.get_calendar_statistics(p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_user_id uuid;
BEGIN
  -- Fail closed for an unauthenticated (anon) caller BEFORE touching any data. Without this,
  -- `v_user_id != auth.uid()` evaluates to NULL (not TRUE) when auth.uid() is NULL, so the
  -- reject below would silently never fire for an anonymous caller (defense in depth; the
  -- authenticated-only grant already blocks this path at the perimeter today).
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied to calendar statistics';
  END IF;

  SELECT user_id INTO v_user_id
  FROM public.calendars
  WHERE id = p_calendar_id;

  -- Widened to also fail closed when v_user_id is NULL (a guessed/nonexistent calendar_id),
  -- the exact existence-oracle NULL-skip this migration fixes.
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied to calendar statistics';
  END IF;

  SELECT jsonb_build_object(
    'total_bookings', COUNT(*),
    'completed_bookings', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_bookings', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'pending_bookings', COUNT(*) FILTER (WHERE status = 'pending'),
    'total_revenue', COALESCE(SUM(total_price), 0),
    'this_month', jsonb_build_object(
      'bookings', COUNT(*) FILTER (WHERE start_time >= date_trunc('month', CURRENT_DATE)),
      'revenue', COALESCE(SUM(total_price) FILTER (WHERE start_time >= date_trunc('month', CURRENT_DATE)), 0)
    )
  ) INTO v_result
  FROM public.bookings
  WHERE calendar_id = p_calendar_id;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_calendar_statistics(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_calendar_statistics(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_calendar_statistics(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_calendar_statistics(uuid) TO service_role;
