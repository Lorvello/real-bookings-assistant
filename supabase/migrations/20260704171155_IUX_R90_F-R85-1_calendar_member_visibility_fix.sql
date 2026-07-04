-- R90 (F-R85-1, sev-2): fix the structurally-unreachable calendar_members RLS branch.
--
-- Root cause (pinned down precisely by R85-verify, reconfirmed by this round's own read of
-- pg_policies): calendars_select_own only ever allowed `auth.uid() = user_id` (no member
-- branch at all), and service_types_owner_or_member_view's calendar_members check was
-- nested INSIDE an EXISTS subquery against `calendars`. Reading `calendars` from that
-- subquery is itself subject to calendars' own RLS for the querying session, so for a
-- genuine non-owner team member the inner SELECT on `calendars` returns zero rows before
-- the OR-branch is ever evaluated. The calendar_members-based visibility was therefore
-- structurally unreachable regardless of membership, making the paid Team Members feature
-- functionally dead: an invited, accepted editor/viewer could never see the owner's
-- calendar, service_types, or bookings.
--
-- Fix pattern (follows this codebase's own existing convention, not a new one):
-- `caller_owns_calendar` (20260612210000) already solves an analogous problem -- a
-- SECURITY DEFINER STABLE helper that reads the protected table directly, sidestepping the
-- circular-RLS trap, and is called from policies elsewhere in this codebase. We add a
-- sibling helper, `caller_is_accepted_calendar_member`, that reads `calendar_members`
-- directly (never joins back through `calendars`) and is SECURITY DEFINER so its own read
-- is not itself gated by calendar_members_select's RLS. Only ACCEPTED memberships
-- (accepted_at IS NOT NULL) count, matching the product's own "Active" status concept in
-- Settings > Team; a pending invite grants nothing.
--
-- Scope of this fix, per product intent (README/AddTeamMemberDialog copy: "Editors can
-- manage bookings and settings", viewers implied read-only):
--   * calendars:      SELECT now includes accepted members (any role) -- a team member must
--                      be able to see the calendar they were invited to at all.
--   * service_types:  existing service_types_owner_or_member_view is simplified to use the
--                      new helper instead of nesting through calendars (removes the fragile
--                      double-nested EXISTS entirely, not just relying on the calendars fix
--                      to cascade through it). Write (service_types_owner_only_modify) is
--                      widened to allow EDITOR members to write too (viewers stay read-only),
--                      making the role picker (F-R85-3) meaningful for this table.
--   * bookings:        SELECT is newly granted to accepted members (any role), since the
--                      product intent + F-R85-3 role-picker naming implies team members
--                      should be able to see the business's bookings. Write (insert/update/
--                      delete beyond the existing public-create + owner-all policies) is
--                      granted to EDITOR members only, matching "Editors can manage
--                      bookings". Viewers get read-only on bookings, same as service_types.
--
-- Security invariant under test this round (must never regress): a calendar_members row
-- scoped to calendar A must grant visibility ONLY into calendar A's calendars/service_types/
-- bookings rows, never calendar B's, even for the same member user_id. The helper's WHERE
-- clause binds strictly on cm.calendar_id = <the specific row being checked>, so a member of
-- calendar A has no matching calendar_members row for calendar B and the EXISTS is false.
-- Proven empirically with two independent throwaway tenants (see evidence/IUX_r90.md).

-- 1. New helper: accepted-membership check, reads calendar_members directly (no re-entry
--    into calendars), SECURITY DEFINER so it is not itself blocked by calendar_members_select.
CREATE OR REPLACE FUNCTION public.caller_is_accepted_calendar_member(
  p_calendar_id uuid,
  p_min_role text DEFAULT NULL
) RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_members cm
    WHERE cm.calendar_id = p_calendar_id
      AND cm.user_id = auth.uid()
      AND cm.accepted_at IS NOT NULL
      AND (p_min_role IS NULL OR cm.role = p_min_role)
  );
$function$;

COMMENT ON FUNCTION public.caller_is_accepted_calendar_member(uuid, text) IS
  'R90/F-R85-1: SECURITY DEFINER helper so RLS policies on calendars/service_types/bookings '
  'can check calendar_members membership without re-entering calendars RLS (avoids the '
  'structurally-unreachable nested-EXISTS trap). Only accepted_at IS NOT NULL memberships '
  'count. Strictly scoped per p_calendar_id, no cross-tenant reach.';

-- 2. calendars: add the missing member-visibility OR-branch to the base SELECT policy.
DROP POLICY IF EXISTS "calendars_select_own" ON public.calendars;
CREATE POLICY "calendars_select_own" ON public.calendars
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.caller_is_accepted_calendar_member(id)
  );

-- 3. service_types: simplify the SELECT policy to use the new helper directly instead of
--    nesting a calendar_members check inside a calendars subquery (removes the fragile
--    pattern entirely rather than just relying on the calendars fix to cascade through it).
DROP POLICY IF EXISTS "service_types_owner_or_member_view" ON public.service_types;
CREATE POLICY "service_types_owner_or_member_view" ON public.service_types
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars c
      WHERE c.id = service_types.calendar_id
        AND c.user_id = auth.uid()
    )
    OR public.caller_is_accepted_calendar_member(calendar_id)
  );

-- 4. service_types: widen write access to EDITOR members (viewers stay read-only), making
--    the role picker meaningful. Owner keeps full ALL access via the existing policy.
CREATE POLICY "service_types_editor_member_write" ON public.service_types
  FOR ALL
  USING (public.caller_is_accepted_calendar_member(calendar_id, 'editor'))
  WITH CHECK (public.caller_is_accepted_calendar_member(calendar_id, 'editor'));

-- 5. bookings: grant SELECT to accepted members (any role), matching the product's own
--    "Editors can manage bookings" framing and the role-picker's implied read scope for
--    viewers. Owner visibility (bookings_owner_all) is untouched.
CREATE POLICY "bookings_member_view" ON public.bookings
  FOR SELECT
  USING (public.caller_is_accepted_calendar_member(calendar_id));

-- 6. bookings: grant write (editor role only) so "Editors can manage bookings" becomes true;
--    viewers get no write path here, same split as service_types.
CREATE POLICY "bookings_editor_member_write" ON public.bookings
  FOR ALL
  USING (public.caller_is_accepted_calendar_member(calendar_id, 'editor'))
  WITH CHECK (public.caller_is_accepted_calendar_member(calendar_id, 'editor'));

GRANT EXECUTE ON FUNCTION public.caller_is_accepted_calendar_member(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.caller_is_accepted_calendar_member(uuid, text) FROM anon, PUBLIC;
