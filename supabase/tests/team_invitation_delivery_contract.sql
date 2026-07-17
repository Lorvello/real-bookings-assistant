\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id,
  email,
  aud,
  role,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-00000000d201',
    'invite-owner-a@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Invite Owner A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-00000000d202',
    'invite-owner-b@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Invite Owner B"}'::jsonb,
    now(),
    now()
  );

UPDATE public.users
SET
  business_name = CASE
    WHEN id = '00000000-0000-0000-0000-00000000d201'
      THEN 'Studio <A>'
    ELSE 'Studio B'
  END,
  language = 'en',
  subscription_tier = 'enterprise'
WHERE id IN (
  '00000000-0000-0000-0000-00000000d201',
  '00000000-0000-0000-0000-00000000d202'
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES
  (
    '00000000-0000-0000-0000-00000000e201',
    '00000000-0000-0000-0000-00000000d201',
    'Calendar <A>',
    'invite-contract-a',
    true
  ),
  (
    '00000000-0000-0000-0000-00000000e202',
    '00000000-0000-0000-0000-00000000d202',
    'Calendar B',
    'invite-contract-b',
    true
  );

CREATE TEMP TABLE first_prepare ON COMMIT DROP AS
SELECT public.prepare_team_invitation_delivery(
  '00000000-0000-0000-0000-00000000d201',
  '00000000-0000-4000-8000-00000000c201',
  '00000000-0000-0000-0000-00000000e201',
  'Case@Test.Invalid',
  '<img src=x onerror=alert(1)>',
  'viewer',
  'https://bookingsassistant.example'
) AS result;

DO $test$
DECLARE
  v_result jsonb;
  v_count integer;
  v_email text;
  v_token text;
BEGIN
  SELECT result INTO v_result FROM first_prepare;
  IF v_result->>'claimed' <> 'true'
     OR v_result->>'status' <> 'sending'
     OR v_result->>'recipient_email' <> 'case@test.invalid' THEN
    RAISE EXCEPTION 'first invitation prepare failed: %', v_result;
  END IF;

  SELECT count(*), min(email), min(token)
  INTO v_count, v_email, v_token
  FROM public.team_invitations
  WHERE calendar_id = '00000000-0000-0000-0000-00000000e201';

  IF v_count <> 1 OR v_email <> 'case@test.invalid'
     OR length(v_token) < 40 THEN
    RAISE EXCEPTION
      'invitation was not normalized or token was weak: count %, email %, token length %',
      v_count,
      v_email,
      length(v_token);
  END IF;

  SELECT count(*) INTO v_count
  FROM public.webhook_events
  WHERE calendar_id = '00000000-0000-0000-0000-00000000e201'
    AND event_type = 'team.invitation.created'
    AND payload ? 'token';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'acceptance token leaked into webhook payload';
  END IF;
END;
$test$;

CREATE TEMP TABLE exact_concurrent ON COMMIT DROP AS
SELECT public.prepare_team_invitation_delivery(
  '00000000-0000-0000-0000-00000000d201',
  '00000000-0000-4000-8000-00000000c201',
  '00000000-0000-0000-0000-00000000e201',
  'case@test.invalid',
  '<img src=x onerror=alert(1)>',
  'viewer',
  'https://bookingsassistant.example'
) AS result;

CREATE TEMP TABLE other_tab_concurrent ON COMMIT DROP AS
SELECT public.prepare_team_invitation_delivery(
  '00000000-0000-0000-0000-00000000d201',
  '00000000-0000-4000-8000-00000000c202',
  '00000000-0000-0000-0000-00000000e201',
  'case@test.invalid',
  '<img src=x onerror=alert(1)>',
  'viewer',
  'https://bookingsassistant.example'
) AS result;

DO $test$
DECLARE
  v_exact jsonb;
  v_other jsonb;
  v_event_count integer;
BEGIN
  SELECT result INTO v_exact FROM exact_concurrent;
  SELECT result INTO v_other FROM other_tab_concurrent;

  IF v_exact->>'claimed' <> 'false'
     OR v_exact->>'status' <> 'sending'
     OR v_other->>'claimed' <> 'false'
     OR v_other->>'request_id' <> '00000000-0000-4000-8000-00000000c201' THEN
    RAISE EXCEPTION
      'concurrent invitation claims were not excluded: exact %, other %',
      v_exact,
      v_other;
  END IF;

  SELECT count(*) INTO v_event_count
  FROM public.webhook_events
  WHERE calendar_id = '00000000-0000-0000-0000-00000000e201'
    AND event_type = 'team.invitation.created';
  IF v_event_count <> 1 THEN
    RAISE EXCEPTION 'concurrent retries duplicated webhook events: %', v_event_count;
  END IF;
END;
$test$;

SELECT public.complete_team_invitation_delivery(
  (result->>'request_id')::uuid,
  (result->>'claim_token')::uuid,
  'recorded',
  NULL,
  NULL
)
FROM first_prepare;

CREATE TEMP TABLE recorded_replay ON COMMIT DROP AS
SELECT public.prepare_team_invitation_delivery(
  '00000000-0000-0000-0000-00000000d201',
  '00000000-0000-4000-8000-00000000c201',
  '00000000-0000-0000-0000-00000000e201',
  'case@test.invalid',
  '<img src=x onerror=alert(1)>',
  'viewer',
  'https://bookingsassistant.example'
) AS result;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  SELECT result INTO v_result FROM recorded_replay;
  IF v_result->>'claimed' <> 'false'
     OR v_result->>'status' <> 'recorded' THEN
    RAISE EXCEPTION 'recorded request was not idempotent: %', v_result;
  END IF;
END;
$test$;

CREATE TEMP TABLE explicit_resend ON COMMIT DROP AS
SELECT public.prepare_team_invitation_delivery(
  '00000000-0000-0000-0000-00000000d201',
  '00000000-0000-4000-8000-00000000c202',
  '00000000-0000-0000-0000-00000000e201',
  'case@test.invalid',
  '<img src=x onerror=alert(1)>',
  'viewer',
  'https://bookingsassistant.example'
) AS result;

DO $test$
DECLARE
  v_result jsonb;
  v_invitation_count integer;
  v_event_count integer;
BEGIN
  SELECT result INTO v_result FROM explicit_resend;
  IF v_result->>'claimed' <> 'true'
     OR v_result->>'request_id' <> '00000000-0000-4000-8000-00000000c202' THEN
    RAISE EXCEPTION 'explicit resend was not claimable: %', v_result;
  END IF;

  SELECT count(*) INTO v_invitation_count
  FROM public.team_invitations
  WHERE calendar_id = '00000000-0000-0000-0000-00000000e201'
    AND lower(btrim(email)) = 'case@test.invalid';
  SELECT count(*) INTO v_event_count
  FROM public.webhook_events
  WHERE calendar_id = '00000000-0000-0000-0000-00000000e201'
    AND event_type = 'team.invitation.created';

  IF v_invitation_count <> 1 OR v_event_count <> 2 THEN
    RAISE EXCEPTION
      'explicit resend duplicated invitation or missed one event: invites %, events %',
      v_invitation_count,
      v_event_count;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_conflict_closed boolean := false;
  v_foreign_closed boolean := false;
BEGIN
  BEGIN
    PERFORM public.prepare_team_invitation_delivery(
      '00000000-0000-0000-0000-00000000d201',
      '00000000-0000-4000-8000-00000000c202',
      '00000000-0000-0000-0000-00000000e201',
      'case@test.invalid',
      '<img src=x onerror=alert(1)>',
      'editor',
      'https://bookingsassistant.example'
    );
  EXCEPTION WHEN SQLSTATE '22023' THEN
    v_conflict_closed := true;
  END;

  BEGIN
    PERFORM public.prepare_team_invitation_delivery(
      '00000000-0000-0000-0000-00000000d202',
      '00000000-0000-4000-8000-00000000c203',
      '00000000-0000-0000-0000-00000000e201',
      'foreign@test.invalid',
      '',
      'viewer',
      'https://bookingsassistant.example'
    );
  EXCEPTION WHEN SQLSTATE '42501' THEN
    v_foreign_closed := true;
  END;

  IF NOT v_conflict_closed OR NOT v_foreign_closed THEN
    RAISE EXCEPTION
      'request conflict or foreign owner was accepted: conflict %, foreign %',
      v_conflict_closed,
      v_foreign_closed;
  END IF;
END;
$test$;

DO $test$
BEGIN
  IF has_function_privilege(
    'authenticated',
    'public.invite_team_member(uuid,text,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.prepare_team_invitation_delivery(uuid,uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.prepare_team_invitation_delivery(uuid,uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.complete_team_invitation_delivery(uuid,uuid,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'team invitation function grants are not fail closed';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.team_invitations', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.team_invitations', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.team_invitations', 'INSERT')
     OR has_table_privilege('authenticated', 'public.team_invitations', 'DELETE')
     OR has_table_privilege(
       'authenticated',
       'public.team_invitation_deliveries',
       'SELECT'
     ) THEN
    RAISE EXCEPTION 'team invitation table grants are not exact';
  END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-00000000d201',
  true
);

DO $test$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.team_invitations;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'owner RLS did not expose exactly one invitation: %', v_count;
  END IF;

  UPDATE public.team_invitations
  SET status = status
  WHERE calendar_id = '00000000-0000-0000-0000-00000000e201';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'owner could not update own invitation';
  END IF;
END;
$test$;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-00000000d202',
  true
);

DO $test$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.team_invitations;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'foreign owner observed invitations: %', v_count;
  END IF;
END;
$test$;

RESET ROLE;
ROLLBACK;

SELECT 'TEAM_INVITATION_DELIVERY_CONTRACT_PASS' AS result;
