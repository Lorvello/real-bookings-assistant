-- R86 (PREEMPT, security): fix an invitation-hijack in accept_team_invitation_for_user.
--
-- Vulnerability (found by R85-verify's own adversarial hunt, live-reproduced again this round):
-- accept_team_invitation_for_user(p_token, p_user_id) is SECURITY DEFINER and only ever validated
-- that the TOKEN was pending/unexpired. It never checked that p_user_id belongs to the invitation's
-- own target email. The function was ALSO still directly callable by anon/authenticated/PUBLIC via
-- PostgREST: R40's migration granted EXECUTE to service_role but never revoked the default PUBLIC
-- grant Postgres assigns on function creation, so PUBLIC (and therefore anon/authenticated) kept
-- EXECUTE the whole time despite the intent that only the accept-team-invitation edge function
-- (service_role) would call it. Live reproduction this round: an anonymous PostgREST call with a
-- real invitee's pending token but an ATTACKER's own p_user_id succeeded, silently redirecting the
-- calendar_members grant to the attacker and marking the real invitee's invitation 'accepted',
-- permanently locking them out.
--
-- Fix (defense in depth, both layers, per the round spec):
--   (a) add an identity check INSIDE the function: resolve p_user_id's own email from public.users
--       (this codebase's own convention, e.g. create_team_member_user / check_team_member_limit look
--       up public.users directly) and reject unless it case-insensitively matches the invitation's
--       target email (same ilike comparison the edge function itself already uses to find/create the
--       user, supabase/functions/accept-team-invitation/index.ts line 60). This makes the function
--       safe regardless of how or by whom it is called, not just safe because the edge function
--       happens to always pass the right id today.
--   (b) revoke direct EXECUTE from PUBLIC/anon/authenticated. Grep across all edge functions and
--       frontend code confirms the ONLY call site is supabase/functions/accept-team-invitation/
--       index.ts, which calls this RPC via the service-role admin client. No legitimate caller needs
--       direct anon/authenticated access, so closing the perimeter costs nothing.
--
-- A user with no public.users row yet (a genuinely new invitee, created by the edge fn's admin
-- .createUser call BEFORE this RPC runs, per the edge fn's own step 2) will have a matching row by
-- the time this RPC is called (the edge fn creates the auth user, whose handle_new_user trigger
-- inserts public.users, THEN calls this RPC), so a NULL email lookup here is always a genuine
-- identity-mismatch/inconsistent-state case, safe to reject.

CREATE OR REPLACE FUNCTION public.accept_team_invitation_for_user(p_token text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_invitation RECORD;
  v_new_calendar_id uuid;
  v_target_email text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing user');
  END IF;

  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Identity binding: p_user_id must belong to the invitation's own target email. Without this, any
  -- caller who knows/guesses a valid pending token can redirect the grant to an arbitrary user_id.
  SELECT email INTO v_target_email
  FROM public.users
  WHERE id = p_user_id;

  IF v_target_email IS NULL OR lower(v_target_email) <> lower(v_invitation.email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation does not belong to this account');
  END IF;

  -- Plan team-member limit (only counts as a new member if not already linked).
  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_members cm
    WHERE cm.calendar_id = v_invitation.calendar_id AND cm.user_id = p_user_id
  ) THEN
    IF NOT public.check_team_member_limit(
      (SELECT user_id FROM public.calendars WHERE id = v_invitation.calendar_id),
      v_invitation.calendar_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Team member limit reached for this plan. Ask the calendar owner to upgrade.',
        'error_code', 'TEAM_MEMBER_LIMIT_REACHED'
      );
    END IF;
  END IF;

  -- Give the member a personal calendar only if they have none yet (a freshly-created member has
  -- none; an existing user already has one, never duplicate).
  SELECT id INTO v_new_calendar_id
  FROM public.calendars WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;

  IF v_new_calendar_id IS NULL THEN
    INSERT INTO public.calendars (user_id, name, slug, description, is_default)
    VALUES (
      p_user_id,
      COALESCE(v_invitation.full_name, 'Mijn Kalender'),
      'cal-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
      'Persoonlijke kalender',
      true
    ) RETURNING id INTO v_new_calendar_id;
  END IF;

  -- The actual team link: member gets access to the inviter's calendar.
  INSERT INTO public.calendar_members (calendar_id, user_id, role, invited_by, accepted_at)
  VALUES (v_invitation.calendar_id, p_user_id, v_invitation.role, v_invitation.invited_by, now())
  ON CONFLICT (calendar_id, user_id) DO UPDATE SET role = v_invitation.role, accepted_at = now();

  UPDATE public.team_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invitation.id;

  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    v_invitation.calendar_id, 'team.invitation.accepted',
    jsonb_build_object('user_id', p_user_id, 'email', v_invitation.email, 'role', v_invitation.role, 'personal_calendar_id', v_new_calendar_id)
  );

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'personal_calendar_id', v_new_calendar_id);
END;
$function$;

-- Close the perimeter: revoke from PUBLIC (which anon/authenticated inherit) and each explicitly, so
-- only service_role (the edge function's own client) can call this RPC directly at all. Belt and
-- braces alongside the identity check above; either layer alone would have stopped the hijack.
REVOKE EXECUTE ON FUNCTION public.accept_team_invitation_for_user(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation_for_user(text, uuid) TO service_role;
