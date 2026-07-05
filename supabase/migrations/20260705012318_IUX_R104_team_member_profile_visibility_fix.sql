-- R104 (T2 frontend micro-polish, design-criticus fresh pass): fix the Settings > Team
-- surface showing "Unknown user" for every genuinely accepted team member, for every tenant.
--
-- Root cause (reproduced live this round, fresh throwaway tenant, real browser + real
-- Supabase project grdgjhkygzciwwrxgvgy): `useCalendarMembers` (src/hooks/useCalendarMembers.tsx)
-- fetches `calendar_members` with a nested PostgREST embed,
--   select=*,users!calendar_members_user_id_fkey(full_name,email),calendars!...(id,name)
-- The `calendar_members` row itself comes through fine (calendar_members_select already
-- allows the owner, or the member themselves, to read it). But the EMBEDDED `users` row is
-- itself subject to `public.users`' OWN RLS for the querying session, and `users_select_own`
-- was `id = auth.uid()` only -- no policy let the OWNER (or a fellow member) read a team
-- member's `full_name`/`email` at all. So the embed silently resolves to `null` for every
-- member row that is not the caller's own, and `TeamMembersSection.tsx` falls back to its
-- "Unknown user" copy. This is the exact same *shape* of bug R90/F-R85-1 fixed (a
-- structurally-unreachable RLS branch behind a nested embed/subquery, silently hiding real,
-- accepted-membership data), but on the reverse relationship: there, a MEMBER couldn't see
-- the OWNER's calendar; here, the OWNER (and any fellow member) can't see a MEMBER's name.
-- It reproduces for every real tenant with an accepted team member, not just this round's
-- fixture (confirmed via a live network capture: the `calendar_members` REST response
-- returns "users":null for the accepted editor row, on every single request).
--
-- Fix pattern (follows this codebase's own established convention, same one R90 used):
-- a SECURITY DEFINER STABLE helper that reads the protected table directly, sidestepping the
-- circular-RLS trap, called from a new narrowly-scoped SELECT policy. Mirrors
-- `caller_is_accepted_calendar_member` (20260704171155): scoped to calendar_members rows
-- ONLY, so it can never be used to read an unrelated user's profile outside a shared
-- calendar relationship.

-- 1. New helper: TRUE if `p_target_user_id` shares a calendar relationship with the
--    caller that the Team surface's own query needs to display, covering BOTH directions:
--      Case 1: target is an ACCEPTED calendar_members row; caller is that calendar's owner,
--              or is themselves an accepted member of the same calendar ("owner viewing a
--              member's name", "member viewing a fellow member's name").
--      Case 2: target OWNS the calendar (calendars.user_id -- owners have no calendar_members
--              row of their own, so Case 1 alone can never match an owner as the target);
--              caller is an accepted member of that calendar ("member viewing the owner's own
--              name", live-reproduced as a real gap during this round's own verification: an
--              earlier single-direction version of this helper correctly fixed the owner-view
--              case but left an accepted member unable to see the OWNER's name, since the
--              owner never has a calendar_members row to match against).
--    Reachable by any accepted member, not just owners, matching how the Team surface's own
--    query has no calendar_id filter and useAccessControl's canAccessTeamMembers is a
--    plan-tier gate, not an owner-only gate. SECURITY DEFINER so its own reads of
--    calendar_members/calendars are never blocked by those tables' RLS from inside this check.
CREATE OR REPLACE FUNCTION public.caller_shares_calendar_with_user(
  p_target_user_id uuid
) RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_members target_cm
    JOIN public.calendars c ON c.id = target_cm.calendar_id
    WHERE target_cm.user_id = p_target_user_id
      AND target_cm.accepted_at IS NOT NULL
      AND (
        c.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.calendar_members caller_cm
          WHERE caller_cm.calendar_id = target_cm.calendar_id
            AND caller_cm.user_id = auth.uid()
            AND caller_cm.accepted_at IS NOT NULL
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.calendars c
    JOIN public.calendar_members caller_cm ON caller_cm.calendar_id = c.id
    WHERE c.user_id = p_target_user_id
      AND caller_cm.user_id = auth.uid()
      AND caller_cm.accepted_at IS NOT NULL
  );
$function$;

COMMENT ON FUNCTION public.caller_shares_calendar_with_user(uuid) IS
  'R104: SECURITY DEFINER helper so users_select_team_member can let a calendar owner (or a '
  'fellow accepted member) read a team member''s public.users row (full_name/email) for '
  'display in Settings > Team, without re-entering calendar_members/calendars RLS. Only '
  'ACCEPTED memberships count (matches R90''s own accepted_at convention); a pending '
  'invitation grants nothing here (pending invites already carry their own full_name/email '
  'on team_invitations directly, no join needed). Strictly scoped to an actual shared-calendar '
  'relationship, never a general profile-read grant.';

-- 2. public.users: add the missing SELECT branch. Existing users_select_own (id = auth.uid())
--    and admins_select_all_users (is_admin()) are untouched; this is purely additive.
CREATE POLICY "users_select_team_member" ON public.users
  FOR SELECT
  USING (public.caller_shares_calendar_with_user(id));

GRANT EXECUTE ON FUNCTION public.caller_shares_calendar_with_user(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.caller_shares_calendar_with_user(uuid) FROM anon, PUBLIC;
