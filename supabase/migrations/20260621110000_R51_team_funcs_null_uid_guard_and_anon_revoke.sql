-- R51 — fix the NULL-uid ownership-guard bypass on create_team_member_user and
-- revoke the unneeded anon EXECUTE on the team functions (same systemic class as
-- R44-R50: `x != auth.uid()` is NULL-true-skipping for an anon caller).
--
-- create_team_member_user is SECURITY DEFINER and was granted to anon. Its guard
--   IF v_calendar_owner != auth.uid() THEN RAISE ...
-- does NOT fire for anon: auth.uid() is NULL, so `owner != NULL` is NULL (not TRUE),
-- the exception is skipped and execution falls through to the INSERT. Verified live
-- with the anon key: the call got PAST the ownership check and was only stopped by
-- the downstream users_id_fkey (public.users.id -> auth.users.id) — i.e. it
-- fail-closes today purely by accident of a FK, not by the intended authz. Fix the
-- guard to deny a NULL caller and a non-existent calendar explicitly. The legitimate
-- owner path (auth.uid() = v_calendar_owner, both non-null) is unchanged.
--
-- Also revoke the unneeded EXECUTE perimeter. NOTE: both functions are granted to
-- PUBLIC (the default for a new function) AND to anon explicitly, so revoking only anon
-- leaves anon able to call them via PUBLIC. We REVOKE FROM PUBLIC, anon on both. The
-- dashboard caller of create_team_member_user is authenticated (useCalendarMembers) and
-- has its OWN explicit grant, so it is unaffected; the invite-accept flow runs
-- server-side via the accept-team-invitation edge function calling
-- accept_team_invitation_for_user (service_role), so accept_team_invitation(text) is
-- legacy (only the generated types reference it). `authenticated` and `service_role`
-- keep their explicit grants, so every live flow is untouched.

CREATE OR REPLACE FUNCTION public.create_team_member_user(p_email text, p_full_name text, p_calendar_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_new_user_id uuid;
  v_calendar_owner uuid;
BEGIN
  SELECT user_id INTO v_calendar_owner
  FROM public.calendars
  WHERE id = p_calendar_id;

  -- Deny a NULL caller (anon) and a non-existent calendar explicitly; `!= auth.uid()`
  -- alone is NULL-skipping for anon and would fall through to the INSERT.
  IF auth.uid() IS NULL OR v_calendar_owner IS NULL OR v_calendar_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Only calendar owners can create team members';
  END IF;

  SELECT id INTO v_new_user_id
  FROM public.users
  WHERE email = p_email;

  IF v_new_user_id IS NOT NULL THEN
    RETURN v_new_user_id;
  END IF;

  v_new_user_id := gen_random_uuid();

  INSERT INTO public.users (
    id, email, full_name, created_at, updated_at
  ) VALUES (
    v_new_user_id, p_email, p_full_name, now(), now()
  );

  RETURN v_new_user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_team_member_user(text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_team_invitation(text) FROM PUBLIC, anon;
