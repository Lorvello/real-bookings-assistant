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
    '30000000-0000-0000-0000-000000000001',
    'installment-lifecycle-owner@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Installment Lifecycle Owner"}'::jsonb,
    now(),
    now()
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'installment-lifecycle-member@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Installment Lifecycle Member"}'::jsonb,
    now(),
    now()
  );

UPDATE public.users
SET account_owner_id = '30000000-0000-0000-0000-000000000001'
WHERE id = '30000000-0000-0000-0000-000000000002';

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES (
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000001',
  'Installment Lifecycle Calendar',
  'installment-lifecycle-calendar',
  true
);

UPDATE public.payment_settings
SET
  auto_cancel_unpaid_bookings = true,
  payment_deadline_hours = 1
WHERE calendar_id = '30000000-0000-0000-0000-000000000003';

INSERT INTO public.service_types (
  id,
  calendar_id,
  name,
  duration,
  price,
  is_active
)
VALUES (
  '30000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000003',
  'Installment Lifecycle Service',
  60,
  100,
  true
);

INSERT INTO public.bookings (
  id,
  calendar_id,
  service_type_id,
  customer_name,
  customer_email,
  start_time,
  end_time,
  status,
  payment_required,
  payment_status,
  created_at
)
VALUES
  (
    '30000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    'Captured Deposit Customer',
    'captured-deposit@example.invalid',
    now() + interval '7 days',
    now() + interval '7 days 1 hour',
    'confirmed',
    true,
    'partial',
    now() - interval '2 hours'
  ),
  (
    '30000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    'Unpaid Customer',
    'unpaid@example.invalid',
    now() + interval '8 days',
    now() + interval '8 days 1 hour',
    'pending',
    true,
    'unpaid',
    now() - interval '2 hours'
  );

INSERT INTO public.whatsapp_payment_sessions (
  id,
  service_type_id,
  calendar_id,
  booking_id,
  amount_cents,
  currency,
  payment_type,
  payment_status
)
VALUES (
  '30000000-0000-0000-0000-000000000007',
  '30000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000005',
  5000,
  'eur',
  'installment',
  'paid'
);

INSERT INTO public.installment_payments (
  id,
  booking_id,
  whatsapp_session_id,
  installment_number,
  total_installments,
  amount_cents,
  currency,
  due_date,
  payment_timing,
  payment_method,
  status,
  paid_at
)
VALUES
  (
    '30000000-0000-0000-0000-000000000008',
    '30000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000007',
    1,
    2,
    5000,
    'eur',
    now() - interval '2 hours',
    'now',
    'online',
    'paid',
    now() - interval '2 hours'
  ),
  (
    '30000000-0000-0000-0000-000000000009',
    '30000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000007',
    2,
    2,
    5000,
    'eur',
    now() + interval '7 days',
    'appointment',
    'cash',
    'pending',
    NULL
  );

INSERT INTO public.business_stripe_accounts (
  stripe_account_id,
  user_id,
  account_owner_id,
  environment,
  platform_account_id,
  charges_enabled,
  onboarding_completed
)
VALUES (
  'acct_installment_lifecycle',
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'test',
  'acct_platform_installment_lifecycle',
  true,
  true
);

DO $test$
DECLARE
  v_cancelled integer;
BEGIN
  v_cancelled := public.cancel_overdue_unpaid_bookings();
  IF v_cancelled <> 1 THEN
    RAISE EXCEPTION 'expected one truly unpaid booking cancellation, got %', v_cancelled;
  END IF;

  IF (SELECT status FROM public.bookings
      WHERE id = '30000000-0000-0000-0000-000000000005') <> 'confirmed' THEN
    RAISE EXCEPTION 'captured installment booking was auto-cancelled';
  END IF;

  IF (SELECT status FROM public.bookings
      WHERE id = '30000000-0000-0000-0000-000000000006') <> 'cancelled' THEN
    RAISE EXCEPTION 'truly unpaid booking was not cancelled';
  END IF;

  IF has_table_privilege(
    'authenticated',
    'public.business_stripe_accounts',
    'UPDATE'
  ) THEN
    RAISE EXCEPTION 'authenticated still has Connect UPDATE privilege';
  END IF;

  IF NOT has_table_privilege(
    'authenticated',
    'public.business_stripe_accounts',
    'SELECT'
  ) THEN
    RAISE EXCEPTION 'owner Connect read privilege is missing';
  END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_count integer;
  v_denied boolean := false;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.business_stripe_accounts;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'team member could read owner Connect state';
  END IF;

  BEGIN
    PERFORM public.record_installment_balance_collected(
      '30000000-0000-0000-0000-000000000005'
    );
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION 'team member could record offline money collection';
  END IF;
END;
$test$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_count integer;
  v_result jsonb;
  v_replay jsonb;
  v_browser_write_denied boolean := false;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.business_stripe_accounts;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'owner could not read exact own Connect row: %', v_count;
  END IF;

  BEGIN
    UPDATE public.bookings
    SET payment_status = 'paid'
    WHERE id = '30000000-0000-0000-0000-000000000005';
  EXCEPTION WHEN insufficient_privilege THEN
    v_browser_write_denied := true;
  END;
  IF NOT v_browser_write_denied THEN
    RAISE EXCEPTION 'browser caller could forge booking payment status';
  END IF;

  v_result := public.record_installment_balance_collected(
    '30000000-0000-0000-0000-000000000005'
  );
  IF v_result->>'success' <> 'true'
     OR v_result->>'payment_status' <> 'paid'
     OR v_result->>'idempotent_replay' <> 'false' THEN
    RAISE EXCEPTION 'owner settlement failed: %', v_result;
  END IF;

  v_replay := public.record_installment_balance_collected(
    '30000000-0000-0000-0000-000000000005'
  );
  IF v_replay->>'success' <> 'true'
     OR v_replay->>'idempotent_replay' <> 'true' THEN
    RAISE EXCEPTION 'owner settlement replay was not idempotent: %', v_replay;
  END IF;

  IF (SELECT payment_status FROM public.bookings
      WHERE id = '30000000-0000-0000-0000-000000000005') <> 'paid' THEN
    RAISE EXCEPTION 'settlement did not mark booking paid';
  END IF;

END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF (SELECT status FROM public.installment_payments
      WHERE id = '30000000-0000-0000-0000-000000000009') <> 'paid' THEN
    RAISE EXCEPTION 'settlement did not mark appointment installment paid';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'INSTALLMENT_PAYMENT_LIFECYCLE_CONTRACT_PASS';
