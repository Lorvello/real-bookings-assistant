-- R40 — Team-invite ACCEPT, part 2: the user-id-driven linking RPC.
--
-- The old accept_team_invitation(p_token) fabricated a random public.users id via
-- create_team_member_user, but public.users.id REFERENCES auth.users(id) (FK users_id_fkey), so a
-- member with no auth account could never be created → accept failed with a 23503 FK violation.
--
-- New design (C-lite): the edge fn accept-team-invitation creates the auth user via the admin API
-- (auth.admin.createUser → handle_new_user trigger creates public.users), then calls THIS RPC with the
-- now-real user id. This function does ONLY the linking (no user creation), so it is FK-safe. The edge
-- fn is service-role and has already validated the token, so there is no auth.uid() owner check here.

CREATE OR REPLACE FUNCTION public.accept_team_invitation_for_user(p_token text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_invitation RECORD;
  v_new_calendar_id uuid;
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
  -- none; an existing user already has one — never duplicate).
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

GRANT EXECUTE ON FUNCTION public.accept_team_invitation_for_user(text, uuid) TO service_role;
