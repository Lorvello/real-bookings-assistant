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
VALUES (
  '40000000-0000-0000-0000-000000000001',
  'captured-cancel-owner@example.invalid',
  'authenticated',
  'authenticated',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Captured Cancel Owner"}'::jsonb,
  now(),
  now()
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES (
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  'Captured Cancellation Calendar',
  'captured-cancellation-calendar',
  true
);

UPDATE public.calendar_settings
SET allow_cancellations = true, cancellation_deadline_hours = 1
WHERE calendar_id = '40000000-0000-0000-0000-000000000002';

INSERT INTO public.service_types (
  id,
  calendar_id,
  name,
  duration,
  price,
  is_active
)
VALUES (
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000002',
  'Captured Cancellation Service',
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
  customer_phone,
  start_time,
  end_time,
  status,
  payment_required,
  payment_status,
  confirmation_token
)
VALUES
  (
    '40000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    'Owner Cancel Customer',
    'owner-cancel@example.invalid',
    '+31600000001',
    now() + interval '7 days',
    now() + interval '7 days 1 hour',
    'confirmed',
    true,
    'partial',
    '41111111-1111-4111-8111-111111111111'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    'Token Cancel Customer',
    'token-cancel@example.invalid',
    '+31600000002',
    now() + interval '7 days 2 hours',
    now() + interval '7 days 3 hours',
    'confirmed',
    true,
    'partial',
    '42222222-2222-4222-8222-222222222222'
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    'Agent Cancel Customer',
    'agent-cancel@example.invalid',
    '+31600000003',
    now() + interval '7 days 4 hours',
    now() + interval '7 days 5 hours',
    'confirmed',
    true,
    'partial',
    '43333333-3333-4333-8333-333333333333'
  ),
  (
    '40000000-0000-0000-0000-000000000007',
    '40000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    'Partial Refund Cancel Customer',
    'partial-refund-cancel@example.invalid',
    '+31600000004',
    now() + interval '8 days',
    now() + interval '8 days 1 hour',
    'confirmed',
    true,
    'partially_refunded',
    '44444444-4444-4444-8444-444444444444'
  );

INSERT INTO public.booking_payments (
  booking_id,
  stripe_payment_intent_id,
  stripe_account_id,
  amount_cents,
  currency,
  platform_fee_cents,
  status,
  refund_amount_cents
)
VALUES (
  '40000000-0000-0000-0000-000000000007',
  'pi_r21_partially_refunded',
  'acct_r21_contract',
  10000,
  'eur',
  190,
  'partially_refunded',
  2500
);

INSERT INTO public.whatsapp_payment_sessions (
  id,
  service_type_id,
  calendar_id,
  booking_id,
  amount_cents,
  currency,
  payment_type,
  stripe_payment_intent_id,
  payment_status
)
VALUES (
  '40000000-0000-0000-0000-000000000008',
  '40000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000007',
  10000,
  'eur',
  'installment',
  'pi_r21_partially_refunded',
  'partially_refunded'
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
  stripe_payment_intent_id
)
VALUES
  (
    '40000000-0000-0000-0000-000000000009',
    '40000000-0000-0000-0000-000000000007',
    '40000000-0000-0000-0000-000000000008',
    1,
    2,
    5000,
    'eur',
    now() - interval '1 day',
    'now',
    'online',
    'partially_refunded',
    'pi_r21_partially_refunded'
  ),
  (
    '40000000-0000-0000-0000-000000000010',
    '40000000-0000-0000-0000-000000000007',
    '40000000-0000-0000-0000-000000000008',
    2,
    2,
    5000,
    'eur',
    now() + interval '8 days',
    'appointment',
    'online',
    'pending',
    NULL
  );

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.owner_update_booking_status(
    '40000000-0000-0000-0000-000000000004',
    'cancelled',
    'Owner cancellation contract'
  );
  IF v_result->>'success' <> 'true'
     OR v_result->>'payment_flagged_refund_required' <> 'true' THEN
    RAISE EXCEPTION 'owner partial cancellation was not flagged: %', v_result;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.owner_update_booking_status(
    '40000000-0000-0000-0000-000000000007',
    'cancelled',
    'Partial refund cancellation contract'
  );
  IF v_result->>'success' <> 'true'
     OR v_result->>'payment_flagged_refund_required' <> 'true'
     OR (v_result->>'captured_balance_cents')::bigint <> 7500 THEN
    RAISE EXCEPTION 'remaining captured balance was not preserved: %', v_result;
  END IF;
END;
$test$;

RESET ROLE;
SET LOCAL ROLE anon;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.cancel_booking_by_token(
    '42222222-2222-4222-8222-222222222222',
    'Customer token cancellation contract'
  );
  IF v_result->>'success' <> 'true'
     OR v_result->>'payment_flagged_refund_required' <> 'true' THEN
    RAISE EXCEPTION 'token partial cancellation was not flagged: %', v_result;
  END IF;
END;
$test$;

RESET ROLE;
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.cancel_booking_for_agent(
    '40000000-0000-0000-0000-000000000006',
    '+31600000003',
    'Agent cancellation contract'
  );
  IF v_result->>'success' <> 'true'
     OR v_result->>'payment_flagged_refund_required' <> 'true' THEN
    RAISE EXCEPTION 'agent partial cancellation was not flagged: %', v_result;
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
DECLARE
  v_bad_count integer;
  v_note_count integer;
  v_action_count integer;
BEGIN
  SELECT count(*) INTO v_bad_count
  FROM public.bookings
  WHERE id IN (
    '40000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000007'
  )
    AND (
      status <> 'cancelled'
      OR payment_status <> 'refund_required'
    );
  IF v_bad_count <> 0 THEN
    RAISE EXCEPTION '% captured cancellations lost refund-required state', v_bad_count;
  END IF;

  SELECT count(*) INTO v_note_count
  FROM public.bookings
  WHERE id IN (
    '40000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000007'
  )
    AND internal_notes ILIKE '%manual refund decision required%';
  IF v_note_count <> 4 THEN
    RAISE EXCEPTION 'expected 4 manual-refund notes, got %', v_note_count;
  END IF;

  SELECT count(*) INTO v_action_count
  FROM public.agent_actions
  WHERE booking_id = '40000000-0000-0000-0000-000000000004'
    AND new_value->>'payment_status' = 'refund_required';
  IF v_action_count <> 1 THEN
    RAISE EXCEPTION 'owner activity log missed refund-required state';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.installment_payments
    WHERE booking_id = '40000000-0000-0000-0000-000000000007'
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'pending installment survived captured-payment cancellation';
  END IF;
END;
$test$;

SET LOCAL ROLE service_role;
DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.reconcile_booking_refund_v2(
    '40000000-0000-0000-0000-000000000007',
    'pi_r21_partially_refunded',
    5000,
    now(),
    'test'
  );
  IF v_result->>'applied' <> 'true'
     OR v_result->>'status' <> 'partially_refunded'
     OR v_result->>'bookingPaymentStatus' <> 'refund_required' THEN
    RAISE EXCEPTION 'increasing partial refund was not reconciled safely: %', v_result;
  END IF;

  v_result := public.reconcile_booking_refund_v2(
    '40000000-0000-0000-0000-000000000007',
    'pi_r21_partially_refunded',
    10000,
    now(),
    'test'
  );
  IF v_result->>'applied' <> 'true'
     OR v_result->>'status' <> 'refunded' THEN
    RAISE EXCEPTION 'full refund was not reconciled: %', v_result;
  END IF;

  v_result := public.reconcile_booking_refund_v2(
    '40000000-0000-0000-0000-000000000007',
    'pi_r21_partially_refunded',
    7500,
    now() + interval '1 minute',
    'test'
  );
  IF v_result->>'applied' <> 'false'
     OR v_result->>'staleOrDuplicate' <> 'true'
     OR (v_result->>'refundAmountCents')::integer <> 10000 THEN
    RAISE EXCEPTION 'stale partial refund was not ignored: %', v_result;
  END IF;
END;
$test$;
RESET ROLE;

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.booking_payments
    WHERE booking_id = '40000000-0000-0000-0000-000000000007'
      AND status = 'refunded'
      AND refund_amount_cents = 10000
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE id = '40000000-0000-0000-0000-000000000007'
      AND status = 'cancelled'
      AND payment_status = 'refunded'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.installment_payments
    WHERE id = '40000000-0000-0000-0000-000000000009'
      AND status = 'refunded'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_payment_sessions
    WHERE id = '40000000-0000-0000-0000-000000000008'
      AND payment_status = 'refunded'
  ) THEN
    RAISE EXCEPTION 'atomic refund reconciliation did not converge all ledgers';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.reconcile_booking_refund_v2(uuid,text,integer,timestamptz,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.reconcile_booking_refund_v2(uuid,text,integer,timestamptz,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.reconcile_booking_refund_v2(uuid,text,integer,timestamptz,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'refund reconciliation RPC grants are incorrect';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'CAPTURED_PAYMENT_CANCELLATION_CONTRACT_PASS';
