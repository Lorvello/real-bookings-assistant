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
    '10000000-0000-0000-0000-000000000001',
    'r25-owner-a@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"R25 Owner A"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'r25-owner-b@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"R25 Owner B"}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'R25 owner A',
    'r25-owner-a',
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'R25 owner B',
    'r25-owner-b',
    true
  );

INSERT INTO public.business_stripe_accounts (
  stripe_account_id,
  user_id,
  account_owner_id,
  environment,
  platform_account_id,
  calendar_id
)
VALUES (
  'acct_r25_tenant_b',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'test',
  'acct_r25_platform',
  '20000000-0000-0000-0000-000000000002'
);

SET LOCAL request.jwt.claims =
  '{"role":"authenticated","sub":"10000000-0000-0000-0000-000000000001"}';
SET LOCAL ROLE authenticated;

DO $test$
BEGIN
  BEGIN
    UPDATE public.calendar_settings
    SET stripe_connect_account_id = 'acct_r25_tenant_b'
    WHERE calendar_id = '20000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'owner rewrote the server-owned Connect cache';
  EXCEPTION
    WHEN insufficient_privilege THEN
      IF SQLERRM <> 'STRIPE_CONNECT_CACHE_SERVER_OWNED' THEN
        RAISE;
      END IF;
  END;

  UPDATE public.calendar_settings
  SET minimum_notice_hours = 3
  WHERE calendar_id = '20000000-0000-0000-0000-000000000001';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ordinary owner calendar setting update was blocked';
  END IF;
END;
$test$;

RESET ROLE;

UPDATE public.calendar_settings
SET stripe_connect_account_id = 'acct_r25_tenant_b'
WHERE calendar_id = '20000000-0000-0000-0000-000000000002';

DO $test$
DECLARE
  v_trigger_count integer;
BEGIN
  SELECT count(*)
  INTO v_trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'public.calendar_settings'::regclass
    AND tgname = 'guard_calendar_settings_server_owned_fields'
    AND NOT tgisinternal;

  IF v_trigger_count <> 1 THEN
    RAISE EXCEPTION 'Connect cache guard trigger count is %', v_trigger_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.calendar_settings
    WHERE calendar_id = '20000000-0000-0000-0000-000000000001'
      AND stripe_connect_account_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'foreign cache value survived owner denial';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.calendar_settings
    WHERE calendar_id = '20000000-0000-0000-0000-000000000002'
      AND stripe_connect_account_id = 'acct_r25_tenant_b'
  ) THEN
    RAISE EXCEPTION 'server role could not maintain the non-authoritative cache';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'STRIPE_CONNECT_CACHE_ISOLATION_CONTRACT_PASS' AS result;
