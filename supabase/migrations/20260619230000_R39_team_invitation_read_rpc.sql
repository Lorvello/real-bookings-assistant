-- R39 — Fix the broken team-invite ACCEPT flow ("Invalid invitation — not found or expired").
--
-- Root cause: src/pages/TeamInvite.tsx read the invitation with a DIRECT anon table query, but the
-- team_invitations RLS policy ("Users can view invitations sent to their email") requires the viewer
-- to be authenticated with the matching email. An invitee clicking the email link is anonymous (they
-- have no account yet), so the query returned nothing and the page showed "Invalid invitation" for a
-- perfectly valid, pending, non-expired token.
--
-- Fix: a SECURITY DEFINER read RPC keyed on the unguessable token (the token IS the capability), so an
-- anonymous invitee can read exactly the one pending, non-expired invitation that matches their link —
-- without loosening RLS on the table. Mirrors accept_team_invitation(p_token), which is already
-- SECURITY DEFINER + granted to anon.

CREATE OR REPLACE FUNCTION public.get_team_invitation_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_inv jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', ti.id,
    'email', ti.email,
    'full_name', ti.full_name,
    'role', ti.role,
    'status', ti.status,
    'expires_at', ti.expires_at,
    'calendar_name', c.name,
    'business_name', COALESCE(u.business_name, u.full_name, 'The team')
  )
  INTO v_inv
  FROM public.team_invitations ti
  JOIN public.calendars c ON c.id = ti.calendar_id
  LEFT JOIN public.users u ON u.id = ti.invited_by
  WHERE ti.token = p_token
    AND ti.status = 'pending'
    AND ti.expires_at > now();

  IF v_inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or expired');
  END IF;

  RETURN jsonb_build_object('success', true, 'invitation', v_inv);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_team_invitation_by_token(text) TO anon, authenticated;
