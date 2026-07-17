\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
  '34000000-0000-0000-0000-000000000001',
  'payment-state-owner@example.invalid',
  'authenticated',
  'authenticated',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Payment State Owner"}'::jsonb,
  now(),
  now()
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES (
  '34000000-0000-0000-0000-000000000002',
  '34000000-0000-0000-0000-000000000001',
  'Payment State Calendar',
  'payment-state-calendar',
  true
);

UPDATE public.payment_settings
SET auto_cancel_unpaid_bookings = true, payment_deadline_hours = 1
WHERE calendar_id = '34000000-0000-0000-0000-000000000002';

INSERT INTO public.service_types (
  id, calendar_id, name, duration, price, is_active
)
VALUES
  (
    '34000000-0000-0000-0000-000000000003',
    '34000000-0000-0000-0000-000000000002',
    'Selected installment service',
    60,
    100,
    true
  ),
  (
    '34000000-0000-0000-0000-000000000004',
    '34000000-0000-0000-0000-000000000002',
    'Disabled config service',
    60,
    100,
    true
  );

INSERT INTO public.service_installment_configs (
  service_type_id, enabled, plan_type, preset_plan, custom_deposits,
  fixed_deposit_amount, allow_customer_choice
)
VALUES (
  '34000000-0000-0000-0000-000000000003',
  true,
  'custom',
  NULL,
  '[
    {"amount":40,"timing":"now"},
    {"amount":60,"timing":"appointment"}
  ]'::jsonb,
  NULL,
  false
);

DO $test$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    UPDATE public.service_types
    SET price = 120
    WHERE id = '34000000-0000-0000-0000-000000000003';
  EXCEPTION WHEN check_violation THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'service price invalidated an enabled selected installment plan';
  END IF;

  IF (SELECT price FROM public.service_types
      WHERE id = '34000000-0000-0000-0000-000000000003') <> 100 THEN
    RAISE EXCEPTION 'rejected service-price write was not rolled back';
  END IF;

  v_denied := false;
  BEGIN
    INSERT INTO public.service_installment_configs (
      service_type_id, enabled, plan_type, preset_plan, custom_deposits,
      fixed_deposit_amount, allow_customer_choice
    )
    VALUES (
      '34000000-0000-0000-0000-000000000004',
      false,
      'custom',
      NULL,
      '[{"amount":100,"timing":"now"}]'::jsonb,
      NULL,
      false
    );
  EXCEPTION WHEN check_violation THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'malformed disabled installment config was persisted';
  END IF;
END;
$test$;

INSERT INTO public.bookings (
  id, calendar_id, service_type_id, customer_name, customer_email,
  customer_phone, start_time, end_time, status, payment_required,
  payment_status, total_amount_cents, payment_currency, created_at
)
VALUES
  (
    '34000000-0000-0000-0000-000000000010',
    '34000000-0000-0000-0000-000000000002',
    '34000000-0000-0000-0000-000000000003',
    'Multi PI Customer',
    'multi-pi@example.invalid',
    '+31634000010',
    now() + interval '7 days',
    now() + interval '7 days 1 hour',
    'confirmed',
    true,
    'paid',
    10000,
    'eur',
    now()
  ),
  (
    '34000000-0000-0000-0000-000000000011',
    '34000000-0000-0000-0000-000000000002',
    '34000000-0000-0000-0000-000000000003',
    'Late Installment Customer',
    'late-installment@example.invalid',
    '+31634000011',
    now() + interval '8 days',
    now() + interval '8 days 1 hour',
    'pending',
    true,
    'pending',
    10000,
    'eur',
    now() - interval '2 hours'
  ),
  (
    '34000000-0000-0000-0000-000000000012',
    '34000000-0000-0000-0000-000000000002',
    '34000000-0000-0000-0000-000000000003',
    'Normal Success Customer',
    'normal-success@example.invalid',
    '+31634000012',
    now() + interval '9 days',
    now() + interval '9 days 1 hour',
    'pending',
    true,
    'pending',
    10000,
    'eur',
    now()
  ),
  (
    '34000000-0000-0000-0000-000000000013',
    '34000000-0000-0000-0000-000000000002',
    '34000000-0000-0000-0000-000000000003',
    'Deleted Before Success Customer',
    'deleted-before-success@example.invalid',
    '+31634000013',
    now() + interval '10 days',
    now() + interval '10 days 1 hour',
    'pending',
    true,
    'pending',
    10000,
    'eur',
    now()
  );

INSERT INTO public.booking_payments (
  booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents,
  currency, platform_fee_cents, status, refund_amount_cents, stripe_mode
)
VALUES
  (
    '34000000-0000-0000-0000-000000000010',
    'pi_r34_multi_a',
    'acct_r34_contract',
    5000,
    'eur',
    95,
    'succeeded',
    0,
    'test'
  ),
  (
    '34000000-0000-0000-0000-000000000010',
    'pi_r34_multi_b',
    'acct_r34_contract',
    5000,
    'eur',
    95,
    'succeeded',
    0,
    'test'
  ),
  (
    '34000000-0000-0000-0000-000000000011',
    'pi_r34_late',
    'acct_r34_contract',
    4000,
    'eur',
    76,
    'pending',
    0,
    'test'
  ),
  (
    '34000000-0000-0000-0000-000000000012',
    'pi_r34_normal',
    'acct_r34_contract',
    10000,
    'eur',
    190,
    'pending',
    0,
    'test'
  ),
  (
    '34000000-0000-0000-0000-000000000013',
    'pi_r43_deleted_first',
    'acct_r34_contract',
    10000,
    'eur',
    190,
    'pending',
    0,
    'test'
  );

-- R48 requires every new pending provider payment to carry the durable,
-- booking-global ownership proof established before a Stripe success is accepted.
-- This older state-machine contract does not retest provider creation itself (the
-- dedicated R48 contracts do that); these rows model the already-authorized
-- provider state so the assertions below remain focused on monotone money state.
INSERT INTO public.booking_payment_provider_reservations (
  booking_id, generation, channel, provider_kind, amount_cents,
  total_due_cents, currency, stripe_mode, destination_account_id,
  platform_account_id, request_fingerprint, state, claim_token, claim_expires_at,
  provider_object_id, settlement_payment_intent_id
)
VALUES
  (
    '34000000-0000-0000-0000-000000000011', 1, 'web',
    'payment_intent', 4000, 10000, 'eur', 'test',
    'acct_r34_contract', 'acct_platform_r34_contract', repeat('1', 64),
    'provider_created',
    '34000000-0000-4000-8000-000000000011', now() + interval '2 minutes',
    'pi_r34_late', 'pi_r34_late'
  ),
  (
    '34000000-0000-0000-0000-000000000012', 1, 'web',
    'payment_intent', 10000, 10000, 'eur', 'test',
    'acct_r34_contract', 'acct_platform_r34_contract', repeat('2', 64),
    'provider_created',
    '34000000-0000-4000-8000-000000000012', now() + interval '2 minutes',
    'pi_r34_normal', 'pi_r34_normal'
  ),
  (
    '34000000-0000-0000-0000-000000000013', 1, 'web',
    'payment_intent', 10000, 10000, 'eur', 'test',
    'acct_r34_contract', 'acct_platform_r34_contract', repeat('3', 64),
    'provider_created',
    '34000000-0000-4000-8000-000000000013', now() + interval '2 minutes',
    'pi_r43_deleted_first', 'pi_r43_deleted_first'
  );

INSERT INTO public.whatsapp_payment_sessions (
  id, service_type_id, calendar_id, booking_id, amount_cents, currency,
  payment_type, stripe_payment_intent_id, payment_status
)
VALUES (
  '34000000-0000-0000-0000-000000000020',
  '34000000-0000-0000-0000-000000000003',
  '34000000-0000-0000-0000-000000000002',
  '34000000-0000-0000-0000-000000000011',
  4000,
  'eur',
  'installment',
  'pi_r34_late',
  'pending'
);

INSERT INTO public.installment_payments (
  id, booking_id, whatsapp_session_id, installment_number,
  total_installments, amount_cents, currency, due_date, payment_timing,
  payment_method, status, stripe_payment_intent_id
)
VALUES
  (
    '34000000-0000-0000-0000-000000000021',
    '34000000-0000-0000-0000-000000000011',
    '34000000-0000-0000-0000-000000000020',
    1,
    2,
    4000,
    'eur',
    now() - interval '2 hours',
    'now',
    'online',
    'pending',
    'pi_r34_late'
  ),
  (
    '34000000-0000-0000-0000-000000000022',
    '34000000-0000-0000-0000-000000000011',
    '34000000-0000-0000-0000-000000000020',
    2,
    2,
    6000,
    'eur',
    now() + interval '8 days',
    'appointment',
    'cash',
    'pending',
    NULL
  );

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_refund jsonb;
  v_delayed_success jsonb;
BEGIN
  v_refund := public.reconcile_booking_refund_v2(
    '34000000-0000-0000-0000-000000000010',
    'pi_r34_multi_a',
    5000,
    now(),
    'test'
  );
  IF v_refund->>'bookingPaymentStatus' <> 'partially_refunded'
     OR (v_refund->>'capturedTotalCents')::bigint <> 10000
     OR (v_refund->>'refundedTotalCents')::bigint <> 5000
     OR (v_refund->>'retainedTotalCents')::bigint <> 5000 THEN
    RAISE EXCEPTION 'multi-PI refund aggregate was wrong: %', v_refund;
  END IF;

  v_delayed_success := public.finalize_booking_payment_success_v2(
    '34000000-0000-0000-0000-000000000010',
    'pi_r34_multi_a',
    'full',
    now() + interval '1 minute',
    'test'
  );
  IF v_delayed_success->>'action' <> 'refund_ignored'
     OR v_delayed_success->>'shouldDeliverConfirmation' <> 'false' THEN
    RAISE EXCEPTION 'delayed success was not stopped by refund truth: %', v_delayed_success;
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '34000000-0000-0000-0000-000000000010'
      AND status = 'confirmed'
      AND payment_status = 'partially_refunded'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.booking_payments
    WHERE stripe_payment_intent_id = 'pi_r34_multi_a'
      AND status = 'refunded'
      AND refund_amount_cents = 5000
  ) OR NOT EXISTS (
    SELECT 1 FROM public.booking_payments
    WHERE stripe_payment_intent_id = 'pi_r34_multi_b'
      AND status = 'succeeded'
      AND refund_amount_cents = 0
  ) THEN
    RAISE EXCEPTION 'refund/delayed-success state did not remain monotone';
  END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"34000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    UPDATE public.bookings
    SET status = 'cancelled'
    WHERE id = '34000000-0000-0000-0000-000000000010';
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'browser owner cancelled a partially-refunded booking directly';
  END IF;
END;
$test$;

RESET ROLE;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_cancelled integer;
  v_late_success jsonb;
  v_normal_success jsonb;
  v_deleted_first_success jsonb;
BEGIN
  v_cancelled := public.cancel_overdue_unpaid_bookings();
  IF v_cancelled <> 1 THEN
    RAISE EXCEPTION 'expected one overdue cancellation, got %', v_cancelled;
  END IF;

  IF (SELECT status FROM public.bookings
      WHERE id = '34000000-0000-0000-0000-000000000011') <> 'cancelled'
     OR (SELECT payment_status FROM public.whatsapp_payment_sessions
         WHERE id = '34000000-0000-0000-0000-000000000020') <> 'cancelled'
     OR EXISTS (
       SELECT 1 FROM public.installment_payments
       WHERE booking_id = '34000000-0000-0000-0000-000000000011'
         AND status <> 'cancelled'
     ) THEN
    RAISE EXCEPTION 'deadline cancellation left a pending local payment schedule';
  END IF;

  v_late_success := public.finalize_booking_payment_success_v2(
    '34000000-0000-0000-0000-000000000011',
    'pi_r34_late',
    'installment',
    now(),
    'test'
  );
  IF v_late_success->>'action' <> 'refund_required'
     OR (v_late_success->>'retainedTotalCents')::bigint <> 4000 THEN
    RAISE EXCEPTION 'late captured installment was not flagged safely: %', v_late_success;
  END IF;

  v_normal_success := public.finalize_booking_payment_success_v2(
    '34000000-0000-0000-0000-000000000012',
    'pi_r34_normal',
    'full',
    now(),
    'test'
  );
  IF v_normal_success->>'action' <> 'confirmed'
     OR v_normal_success->>'bookingPaymentStatus' <> 'paid'
     OR v_normal_success->>'shouldDeliverConfirmation' <> 'true' THEN
    RAISE EXCEPTION 'normal payment success did not confirm: %', v_normal_success;
  END IF;

  -- R43 order 1: soft deletion commits before the delayed Stripe success. The
  -- payment ledger must capture provider truth without resurrecting the booking.
  UPDATE public.bookings
  SET is_deleted = true
  WHERE id = '34000000-0000-0000-0000-000000000013';

  v_deleted_first_success := public.finalize_booking_payment_success_v2(
    '34000000-0000-0000-0000-000000000013',
    'pi_r43_deleted_first',
    'full',
    now(),
    'test'
  );
  IF v_deleted_first_success->>'action' <> 'refund_required'
     OR v_deleted_first_success->>'bookingPaymentStatus' <> 'refund_required'
     OR v_deleted_first_success->>'shouldDeliverConfirmation' <> 'false'
     OR (v_deleted_first_success->>'retainedTotalCents')::bigint <> 10000 THEN
    RAISE EXCEPTION 'soft-deleted booking was resurrected by payment success: %',
      v_deleted_first_success;
  END IF;
END;
$test$;

RESET ROLE;

-- R43 order 2: success commits first. A later browser soft delete must still be
-- rejected while captured funds remain, preserving the existing secure-action path.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"34000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    UPDATE public.bookings
    SET is_deleted = true
    WHERE id = '34000000-0000-0000-0000-000000000012';
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'browser soft-deleted a booking after captured success';
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '34000000-0000-0000-0000-000000000011'
      AND status = 'cancelled'
      AND payment_status = 'refund_required'
      AND internal_notes ILIKE '%manual refund is required%'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.installment_payments
    WHERE id = '34000000-0000-0000-0000-000000000021'
      AND status = 'paid'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.installment_payments
    WHERE id = '34000000-0000-0000-0000-000000000022'
      AND status = 'cancelled'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.whatsapp_payment_sessions
    WHERE id = '34000000-0000-0000-0000-000000000020'
      AND payment_status = 'paid'
  ) THEN
    RAISE EXCEPTION 'late-success dependent ledgers lost captured-money truth';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '34000000-0000-0000-0000-000000000012'
      AND status = 'confirmed'
      AND payment_status = 'paid'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.booking_payments
    WHERE stripe_payment_intent_id = 'pi_r34_normal'
      AND status = 'succeeded'
  ) THEN
    RAISE EXCEPTION 'normal success ledgers did not converge';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '34000000-0000-0000-0000-000000000013'
      AND is_deleted = true
      AND status = 'pending'
      AND payment_status = 'refund_required'
      AND internal_notes ILIKE '%manual refund is required%'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.booking_payments
    WHERE stripe_payment_intent_id = 'pi_r43_deleted_first'
      AND status = 'succeeded'
      AND stripe_mode = 'test'
  ) THEN
    RAISE EXCEPTION 'delete-before-success did not preserve terminal money truth';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.finalize_booking_payment_success_v2(uuid,text,text,timestamptz,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.finalize_booking_payment_success_v2(uuid,text,text,timestamptz,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.finalize_booking_payment_success_v2(uuid,text,text,timestamptz,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'payment success RPC grants are incorrect';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'BOOKING_PAYMENT_STATE_MACHINE_CONTRACT_PASS';
