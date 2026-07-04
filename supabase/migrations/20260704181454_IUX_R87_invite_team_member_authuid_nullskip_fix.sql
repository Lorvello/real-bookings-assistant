-- R87 (PREEMPT, T3 security): fix invite_team_member's auth.uid() NULL-skip.
--
-- Found live by R86-verify Lens 1 (function-body read, independently confirmed live by
-- R87 via a real anonymous PostgREST call that proceeded past the ownership check all the
-- way to the INSERT statement): the ownership check
--   IF v_calendar_owner != auth.uid() THEN ... (reject)
-- silently NULL-skips for an ANONYMOUS caller, because SQL's `x != NULL` evaluates to NULL,
-- not TRUE, so the IF branch never fires and the reject never happens. Any anonymous caller
-- could invite an arbitrary email to any known/guessed calendar_id with zero ownership proof.
-- check_team_member_limit only checks capacity (count vs tier cap), never identity, so it
-- does not fail closed either.
--
-- Fix: make the check fail closed by explicitly rejecting when auth.uid() IS NULL, before
-- (or as part of) the ownership comparison, mirroring the SAME defense-in-depth discipline
-- used in R86 (20260704160000_IUX_R86_accept_invitation_identity_hijack_fix.sql) for the
-- sibling accept_team_invitation_for_user hijack:
--   (a) fix the logic itself (this migration), AND
--   (b) close anon's EXECUTE access, since grep across supabase/functions/ + src/ confirms
--       the only real call site is supabase/functions/send-team-invitation/index.ts, which
--       calls this RPC using the CALLER'S OWN JWT (an anon-key client with the user's
--       Authorization header, NOT service-role) so it resolves auth.uid() correctly for a
--       genuine logged-in owner. `authenticated` therefore DOES have a legitimate reason to
--       call this RPC directly (unlike accept_team_invitation_for_user, whose only caller
--       is a service-role edge function). Only `anon` (a caller with no session at all) has
--       zero legitimate reason. The live ACL showed no explicit anon grant of its own (anon
--       inherited EXECUTE only through the Postgres-default PUBLIC grant), so the actual fix
--       revokes from PUBLIC (see below) rather than a no-op REVOKE ... FROM anon.

CREATE OR REPLACE FUNCTION public.invite_team_member(p_calendar_id uuid, p_email text, p_full_name text, p_role text DEFAULT 'viewer'::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_token text; v_invitation_id uuid; v_calendar_owner uuid; v_business_name text; v_limit_check boolean;
BEGIN
  -- Fail closed for an unauthenticated (anon) caller BEFORE touching any data. Without this,
  -- `v_calendar_owner != auth.uid()` evaluates to NULL (not TRUE) when auth.uid() is NULL,
  -- so the reject below would silently never fire for an anonymous caller.
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required to invite team members');
  END IF;

  SELECT c.user_id, u.business_name INTO v_calendar_owner, v_business_name
  FROM public.calendars c JOIN public.users u ON c.user_id = u.id WHERE c.id = p_calendar_id;
  IF v_calendar_owner IS NULL OR v_calendar_owner != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only calendar owners can invite team members');
  END IF;
  SELECT public.check_team_member_limit(v_calendar_owner, p_calendar_id) INTO v_limit_check;
  IF NOT v_limit_check THEN
    RETURN jsonb_build_object('success', false, 'error', 'Team member limit reached for this subscription tier', 'error_code', 'TEAM_MEMBER_LIMIT_REACHED');
  END IF;
  v_token := translate(encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '+/=', '-_');
  INSERT INTO public.team_invitations (calendar_id, email, full_name, role, token, invited_by, status, expires_at)
  VALUES (p_calendar_id, p_email, p_full_name, p_role, v_token, auth.uid(), 'pending', now() + interval '48 hours')
  ON CONFLICT (calendar_id, email) DO UPDATE SET full_name = p_full_name, role = p_role, token = v_token, status = 'pending', expires_at = now() + interval '48 hours', created_at = now()
  RETURNING id INTO v_invitation_id;
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (p_calendar_id, 'team.invitation.created', jsonb_build_object('invitation_id', v_invitation_id, 'email', p_email, 'full_name', p_full_name, 'role', p_role, 'token', v_token, 'business_name', v_business_name, 'invited_by', auth.uid()));
  RETURN jsonb_build_object('success', true, 'invitation_id', v_invitation_id, 'token', v_token);
END;
$function$;

-- Grant hygiene: revoke EXECUTE from PUBLIC. anon had no explicit grant of its own (the
-- live ACL showed only `postgres=X`, `authenticated=X`, `service_role=X`, plus the implicit
-- `=X` PUBLIC entry) so anon's EXECUTE came entirely through the PUBLIC default; revoking
-- from anon directly is a no-op while PUBLIC still grants it. Revoking from PUBLIC closes
-- that path while the explicit `authenticated` grant (already present) is untouched and
-- keeps working, matching the only real call site: send-team-invitation edge fn, which
-- always forwards a real user's own JWT (never service-role, never anon). service_role is
-- unaffected (was never restricted).
REVOKE EXECUTE ON FUNCTION public.invite_team_member(uuid, text, text, text) FROM PUBLIC;

-- SECONDARY/OPTIONAL bonus fix (R86-verify's flagged item, quick-confirmed dead this round):
-- the legacy accept_team_invitation(text) function (pre-R40, superseded by
-- accept_team_invitation_for_user) still had a stray `authenticated` EXECUTE grant despite
-- R51's migration intending to close PUBLIC/anon on it. Grep across supabase/functions/ +
-- src/ confirms ZERO real call sites (only an auto-generated TS type stub in
-- src/integrations/supabase/types.ts, never actually invoked); the function itself calls
-- create_team_member_user, which R40's own migration comment documents as broken by an
-- FK-violation bug for this exact path (the reason accept_team_invitation_for_user was
-- created to replace it). Genuinely dead code; revoking the stray grant closes the same
-- grant-hygiene gap this round's root cause was shaped like, with zero behavior change for
-- any real caller.
REVOKE EXECUTE ON FUNCTION public.accept_team_invitation(text) FROM authenticated;
