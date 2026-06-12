-- BILLING/TIER: re-check the team-member limit when an invitation is ACCEPTED.
-- The limit was only checked at invite time, but pending invites don't count as
-- members yet — so an owner could send N invites (each passing independently) and
-- have all N accept, exceeding max_team_members for their plan. Enforce it here for
-- a genuinely NEW member (re-accepting an existing member stays exempt).
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_invitation RECORD;
  v_user_id uuid;
  v_new_calendar_id uuid;
BEGIN
  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Enforce the plan's team-member limit at acceptance (new members only).
  IF NOT EXISTS (
    SELECT 1 FROM public.calendar_members cm
    JOIN public.users u ON u.id = cm.user_id
    WHERE cm.calendar_id = v_invitation.calendar_id
      AND lower(u.email) = lower(v_invitation.email)
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

  SELECT public.create_team_member_user(
    v_invitation.email, v_invitation.full_name, v_invitation.calendar_id
  ) INTO v_user_id;

  INSERT INTO public.calendars (user_id, name, slug, description, is_default)
  VALUES (
    v_user_id,
    COALESCE(v_invitation.full_name, 'Mijn Kalender'),
    'cal-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
    'Persoonlijke kalender',
    true
  ) RETURNING id INTO v_new_calendar_id;

  INSERT INTO public.calendar_members (calendar_id, user_id, role, invited_by, accepted_at)
  VALUES (v_invitation.calendar_id, v_user_id, v_invitation.role, v_invitation.invited_by, now())
  ON CONFLICT (calendar_id, user_id) DO UPDATE SET role = v_invitation.role, accepted_at = now();

  UPDATE public.team_invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invitation.id;

  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    v_invitation.calendar_id, 'team.invitation.accepted',
    jsonb_build_object('user_id', v_user_id, 'email', v_invitation.email, 'role', v_invitation.role, 'personal_calendar_id', v_new_calendar_id)
  );

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'personal_calendar_id', v_new_calendar_id);
END;
$function$;
