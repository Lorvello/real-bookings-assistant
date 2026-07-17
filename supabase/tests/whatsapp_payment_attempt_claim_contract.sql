\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
  '39000000-0000-4000-8000-000000000001',
  'whatsapp-payment-claim-owner@example.invalid',
  'authenticated',
  'authenticated',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"WhatsApp payment claim owner"}'::jsonb,
  now(),
  now()
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES (
  '39000000-0000-4000-8000-000000000002',
  '39000000-0000-4000-8000-000000000001',
  'WhatsApp payment claim calendar',
  'whatsapp-payment-claim-calendar',
  true
);

INSERT INTO public.whatsapp_contacts (id, phone_number, display_name)
VALUES (
  '39000000-0000-4000-8000-000000000003',
  '+31639000003',
  'Payment Claim Customer'
);

INSERT INTO public.whatsapp_conversations (id, calendar_id, contact_id)
VALUES (
  '39000000-0000-4000-8000-000000000004',
  '39000000-0000-4000-8000-000000000002',
  '39000000-0000-4000-8000-000000000003'
);

INSERT INTO public.service_types (
  id, calendar_id, name, duration, price, is_active
)
VALUES (
  '39000000-0000-4000-8000-000000000005',
  '39000000-0000-4000-8000-000000000002',
  'R39 full-price service',
  60,
  100,
  true
);

INSERT INTO public.bookings (
  id, calendar_id, service_type_id, customer_name, customer_email,
  customer_phone, start_time, end_time, status, payment_required,
  payment_status, total_price
)
VALUES
  (
    '39000000-0000-4000-8000-000000000010',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Normal claim',
    'normal-claim@example.invalid',
    '+31639000010',
    now() + interval '10 days',
    now() + interval '10 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000011',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Partial refund',
    'partial-refund@example.invalid',
    '+31639000011',
    now() + interval '11 days',
    now() + interval '11 days 1 hour',
    'confirmed',
    true,
    'partially_refunded',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000012',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Refund required',
    'refund-required@example.invalid',
    '+31639000012',
    now() + interval '12 days',
    now() + interval '12 days 1 hour',
    'confirmed',
    true,
    'refund_required',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000013',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Stale status retained balance',
    'retained-balance@example.invalid',
    '+31639000013',
    now() + interval '13 days',
    now() + interval '13 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000014',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Finalize conflict',
    'finalize-conflict@example.invalid',
    '+31639000014',
    now() + interval '14 days',
    now() + interval '14 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000015',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'State changes after claim',
    'state-change@example.invalid',
    '+31639000015',
    now() + interval '15 days',
    now() + interval '15 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000016',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Generation takeover',
    'generation-takeover@example.invalid',
    '+31639000016',
    now() + interval '16 days',
    now() + interval '16 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000017',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Expired renewal',
    'expired-renewal@example.invalid',
    '+31639000017',
    now() + interval '17 days',
    now() + interval '17 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000018',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Completed provider',
    'completed-provider@example.invalid',
    '+31639000018',
    now() + interval '18 days',
    now() + interval '18 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000019',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Deleted before claim',
    'deleted-before-claim@example.invalid',
    '+31639000019',
    now() + interval '19 days',
    now() + interval '19 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000020',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Deleted before finalize',
    'deleted-before-finalize@example.invalid',
    '+31639000020',
    now() + interval '20 days',
    now() + interval '20 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000021',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Deleted before reconcile',
    'deleted-before-reconcile@example.invalid',
    '+31639000021',
    now() + interval '21 days',
    now() + interval '21 days 1 hour',
    'pending',
    true,
    'pending',
    100
  ),
  (
    '39000000-0000-4000-8000-000000000022',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000005',
    'Async failure retry',
    'async-failure-retry@example.invalid',
    '+31639000022',
    now() + interval '22 days',
    now() + interval '22 days 1 hour',
    'pending',
    true,
    'pending',
    100
  );

UPDATE public.bookings
SET is_deleted = true
WHERE id = '39000000-0000-4000-8000-000000000019';

INSERT INTO public.booking_payments (
  booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents,
  currency, platform_fee_cents, status, refund_amount_cents
)
VALUES (
  '39000000-0000-4000-8000-000000000013',
  'pi_r39_retained',
  'acct_r39_contract',
  10000,
  'eur',
  190,
  'partially_refunded',
  2500
);

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_partial jsonb;
  v_refund_required jsonb;
  v_retained jsonb;
  v_claim jsonb;
  v_in_progress jsonb;
  v_fingerprint_conflict jsonb;
  v_finalized jsonb;
  v_replay jsonb;
  v_claim_token uuid;
BEGIN
  v_partial := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000011',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000,
    'eur',
    'test',
    'full',
    NULL,
    repeat('b', 64),
    now() + interval '24 hours'
  );
  IF v_partial->>'outcome' <> 'blocked'
     OR v_partial->>'code' <> 'BOOKING_PAYMENT_BALANCE_ALREADY_RETAINED' THEN
    RAISE EXCEPTION 'partially_refunded booking claimed a full-price attempt: %',
      v_partial;
  END IF;

  v_refund_required := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000012',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000,
    'eur',
    'test',
    'full',
    NULL,
    repeat('c', 64),
    now() + interval '24 hours'
  );
  IF v_refund_required->>'outcome' <> 'blocked'
     OR v_refund_required->>'code' <> 'BOOKING_PAYMENT_BALANCE_ALREADY_RETAINED' THEN
    RAISE EXCEPTION 'refund_required booking claimed a full-price attempt: %',
      v_refund_required;
  END IF;

  v_retained := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000013',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000,
    'eur',
    'test',
    'full',
    NULL,
    repeat('d', 64),
    now() + interval '24 hours'
  );
  IF v_retained->>'outcome' <> 'blocked'
     OR (v_retained->>'retained_balance_cents')::bigint <> 7500 THEN
    RAISE EXCEPTION 'retained balance claimed a full-price attempt: %', v_retained;
  END IF;

  v_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000010',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000,
    'eur',
    'test',
    'full',
    NULL,
    repeat('a', 64),
    now() + interval '24 hours'
  );
  IF v_claim->>'outcome' <> 'claimed' THEN
    RAISE EXCEPTION 'normal booking was not claimed: %', v_claim;
  END IF;
  IF (v_claim->>'attempt_generation')::integer <> 1 THEN
    RAISE EXCEPTION 'initial claim did not own generation 1: %', v_claim;
  END IF;
  v_claim_token := (v_claim->>'claim_token')::uuid;

  IF EXISTS (
    SELECT 1 FROM public.whatsapp_payment_sessions
    WHERE booking_id = '39000000-0000-4000-8000-000000000010'
  ) THEN
    RAISE EXCEPTION 'claim falsely created the provider-session ledger row';
  END IF;

  v_in_progress := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000010',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000,
    'eur',
    'test',
    'full',
    NULL,
    repeat('a', 64),
    now() + interval '24 hours'
  );
  IF v_in_progress->>'outcome' <> 'in_progress' THEN
    RAISE EXCEPTION 'concurrent exact claim was not fenced: %', v_in_progress;
  END IF;

  v_fingerprint_conflict := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000010',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    9999,
    'eur',
    'test',
    'full',
    NULL,
    repeat('e', 64),
    now() + interval '24 hours'
  );
  IF v_fingerprint_conflict->>'outcome' <> 'conflict' THEN
    RAISE EXCEPTION 'different money identity reused a claim: %',
      v_fingerprint_conflict;
  END IF;

  v_finalized := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000010',
    v_claim_token,
    (v_claim->>'attempt_generation')::integer,
    repeat('a', 64),
    'test',
    'cs_test_r39_stored',
    'https://checkout.stripe.test/r39-stored'
  );
  IF v_finalized->>'outcome' <> 'created'
     OR v_finalized->>'stripe_session_id' <> 'cs_test_r39_stored'
     OR v_finalized->>'payment_url' <> 'https://checkout.stripe.test/r39-stored' THEN
    RAISE EXCEPTION 'claimed provider session was not finalized exactly: %', v_finalized;
  END IF;

  v_replay := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000010',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000,
    'eur',
    'test',
    'full',
    NULL,
    repeat('a', 64),
    now() + interval '24 hours'
  );
  IF v_replay->>'outcome' <> 'reconcile'
     OR v_replay->>'stripe_session_id' <> 'cs_test_r39_stored'
     OR v_replay->>'payment_url' <> 'https://checkout.stripe.test/r39-stored' THEN
    RAISE EXCEPTION 'claim did not require provider reconciliation: %', v_replay;
  END IF;

  v_replay := public.reconcile_or_renew_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000010',
    (v_claim->>'attempt_generation')::integer,
    repeat('a', 64),
    'test',
    'cs_test_r39_stored',
    'open',
    'unpaid',
    now() + interval '1 hour',
    'https://checkout.stripe.test/r39-stored',
    now() + interval '24 hours',
    120
  );
  IF v_replay->>'outcome' <> 'replay'
     OR v_replay->>'stripe_session_id' <> 'cs_test_r39_stored'
     OR v_replay->>'payment_url' <> 'https://checkout.stripe.test/r39-stored' THEN
    RAISE EXCEPTION 'provider reconciliation did not return the exact stored replay: %',
      v_replay;
  END IF;

  INSERT INTO public.booking_payments (
    booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents,
    currency, platform_fee_cents, status, refund_amount_cents, stripe_mode
  ) VALUES (
    '39000000-0000-4000-8000-000000000010',
    'pi_r39_retained_after_completion', 'acct_r39_contract',
    10000, 'eur', 190, 'succeeded', 0, 'test'
  );

  v_replay := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000010',
    v_claim_token,
    (v_claim->>'attempt_generation')::integer,
    repeat('a', 64),
    'test',
    'cs_test_r39_stored',
    'https://checkout.stripe.test/r39-stored'
  );
  IF v_replay->>'outcome' <> 'replay'
     OR v_replay->>'stripe_session_id' <> 'cs_test_r39_stored'
     OR v_replay->>'payment_url' <> 'https://checkout.stripe.test/r39-stored' THEN
    RAISE EXCEPTION 'completed finalization did not return only the exact stored replay: %',
      v_replay;
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
DECLARE
  v_claim jsonb;
  v_finalize_conflict jsonb;
  v_claim_token uuid;
BEGIN
  v_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000014',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000,
    'eur',
    'test',
    'full',
    NULL,
    repeat('f', 64),
    now() + interval '24 hours'
  );
  v_claim_token := (v_claim->>'claim_token')::uuid;

  INSERT INTO public.whatsapp_payment_sessions (
    conversation_id, service_type_id, calendar_id, booking_id,
    stripe_session_id, payment_url, amount_cents, currency, payment_type,
    payment_status, expires_at, stripe_mode
  )
  VALUES (
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    '39000000-0000-4000-8000-000000000014',
    'cs_test_r39_legacy',
    'https://checkout.stripe.test/r39-legacy',
    10000,
    'eur',
    'full',
    'pending',
    now() + interval '24 hours',
    'test'
  );

  v_finalize_conflict := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000014',
    v_claim_token,
    (v_claim->>'attempt_generation')::integer,
    repeat('f', 64),
    'test',
    'cs_test_r39_new_unledgered',
    'https://checkout.stripe.test/r39-new-unledgered'
  );

  IF v_finalize_conflict->>'outcome' <> 'conflict'
     OR v_finalize_conflict ? 'payment_url'
     OR v_finalize_conflict ? 'stripe_session_id'
     OR v_finalize_conflict::text LIKE '%r39-new-unledgered%' THEN
    RAISE EXCEPTION 'ledger conflict exposed the new unledgered session: %',
      v_finalize_conflict;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.whatsapp_payment_sessions
    WHERE booking_id = '39000000-0000-4000-8000-000000000014'
      AND stripe_session_id = 'cs_test_r39_legacy'
      AND payment_url = 'https://checkout.stripe.test/r39-legacy'
  ) OR EXISTS (
    SELECT 1
    FROM public.whatsapp_payment_sessions
    WHERE stripe_session_id = 'cs_test_r39_new_unledgered'
       OR payment_url = 'https://checkout.stripe.test/r39-new-unledgered'
  ) THEN
    RAISE EXCEPTION 'ledger conflict replaced or persisted the wrong provider session';
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_claim jsonb;
  v_created jsonb;
  v_failed jsonb;
  v_retry jsonb;
  v_replacement jsonb;
BEGIN
  v_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000022',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('7', 64),
    now() + interval '24 hours'
  );
  v_created := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000022',
    (v_claim->>'claim_token')::uuid,
    (v_claim->>'attempt_generation')::integer,
    repeat('7', 64), 'test',
    'cs_test_r49_async_failure_1',
    'https://checkout.stripe.test/r49-async-failure-1'
  );
  IF v_created->>'outcome' <> 'created' THEN
    RAISE EXCEPTION 'async-failure fixture did not finalize: %', v_created;
  END IF;

  v_failed := public.record_booking_checkout_failure(
    '39000000-0000-4000-8000-000000000022',
    'cs_test_r49_async_failure_1',
    'test',
    now()
  );
  IF v_failed->>'outcome' IS NOT NULL
     OR v_failed->>'action' <> 'unsettled_session_failed' THEN
    RAISE EXCEPTION 'async Checkout failure was not recorded: %', v_failed;
  END IF;

  v_retry := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000022',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('7', 64),
    now() + interval '24 hours'
  );
  IF v_retry->>'outcome' <> 'claimed'
     OR (v_retry->>'attempt_generation')::integer <> 2 THEN
    RAISE EXCEPTION 'async Checkout failure did not release a real retry: %',
      v_retry;
  END IF;

  v_replacement := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000022',
    (v_retry->>'claim_token')::uuid,
    (v_retry->>'attempt_generation')::integer,
    repeat('7', 64), 'test',
    'cs_test_r49_async_failure_2',
    'https://checkout.stripe.test/r49-async-failure-2'
  );
  IF v_replacement->>'outcome' <> 'created'
     OR NOT EXISTS (
       SELECT 1
       FROM public.whatsapp_payment_attempts AS attempt
       JOIN public.whatsapp_payment_sessions AS session
         ON session.id = attempt.payment_session_id
       WHERE attempt.booking_id = '39000000-0000-4000-8000-000000000022'
         AND attempt.state = 'completed'
         AND attempt.attempt_generation = 2
         AND attempt.previous_stripe_session_id =
           'cs_test_r49_async_failure_1'
         AND attempt.stripe_session_id = 'cs_test_r49_async_failure_2'
         AND session.stripe_session_id = 'cs_test_r49_async_failure_2'
         AND session.payment_status = 'pending'
         AND session.attempt_generation = 2
     ) THEN
    RAISE EXCEPTION 'async Checkout failure retry was not finalized exactly: %',
      v_replacement;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_claim jsonb;
  v_result jsonb;
BEGIN
  v_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000015',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('9', 64),
    now() + interval '24 hours'
  );

  INSERT INTO public.booking_payments (
    booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents,
    currency, platform_fee_cents, status, refund_amount_cents, stripe_mode
  ) VALUES (
    '39000000-0000-4000-8000-000000000015',
    'pi_r39_won_during_provider_call', 'acct_r39_contract',
    10000, 'eur', 190, 'succeeded', 0, 'test'
  );
  v_result := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000015',
    (v_claim->>'claim_token')::uuid,
    (v_claim->>'attempt_generation')::integer,
    repeat('9', 64), 'test',
    'cs_test_r39_lost_race',
    'https://checkout.stripe.test/r39-lost-race'
  );
  IF v_result->>'code' <> 'WHATSAPP_PAYMENT_STATE_CHANGED_AFTER_CLAIM'
     OR v_result ? 'payment_url'
     OR EXISTS (
       SELECT 1 FROM public.whatsapp_payment_sessions
       WHERE booking_id = '39000000-0000-4000-8000-000000000015'
     ) THEN
    RAISE EXCEPTION 'retained balance appeared after claim but provider session persisted: %',
      v_result;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_first jsonb;
  v_second jsonb;
  v_stale jsonb;
  v_winner jsonb;
BEGIN
  v_first := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000016',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('1', 64),
    now() + interval '24 hours', 30
  );

  UPDATE public.whatsapp_payment_attempts
  SET claim_expires_at = now() - interval '1 second'
  WHERE booking_id = '39000000-0000-4000-8000-000000000016';

  v_second := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000016',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('1', 64),
    now() + interval '24 hours', 30
  );

  IF v_second->>'outcome' <> 'claimed'
     OR (v_first->>'attempt_generation')::integer <> 1
     OR (v_second->>'attempt_generation')::integer <> 2
     OR v_second->>'claim_token' = v_first->>'claim_token' THEN
    RAISE EXCEPTION 'stale claimant reused the replacement generation: first=% second=%',
      v_first, v_second;
  END IF;

  v_stale := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000016',
    (v_first->>'claim_token')::uuid,
    (v_first->>'attempt_generation')::integer,
    repeat('1', 64), 'test',
    'cs_test_r46_stale_generation',
    'https://checkout.stripe.test/r46-stale-generation'
  );
  IF v_stale->>'code' <> 'WHATSAPP_PAYMENT_ATTEMPT_GENERATION_SUPERSEDED'
     OR v_stale->>'provider_cleanup' <> 'expire' THEN
    RAISE EXCEPTION 'stale generation did not receive bounded cleanup ownership: %',
      v_stale;
  END IF;

  v_winner := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000016',
    (v_second->>'claim_token')::uuid,
    (v_second->>'attempt_generation')::integer,
    repeat('1', 64), 'test',
    'cs_test_r46_generation_2',
    'https://checkout.stripe.test/r46-generation-2'
  );

  v_stale := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000016',
    (v_first->>'claim_token')::uuid,
    (v_first->>'attempt_generation')::integer,
    repeat('1', 64), 'test',
    'cs_test_r46_stale_generation',
    'https://checkout.stripe.test/r46-stale-generation'
  );

  IF v_winner->>'outcome' <> 'created'
     OR v_stale->>'provider_cleanup' <> 'expire'
     OR NOT EXISTS (
       SELECT 1
       FROM public.whatsapp_payment_attempts AS attempt
       JOIN public.whatsapp_payment_sessions AS session
         ON session.id = attempt.payment_session_id
       WHERE attempt.booking_id = '39000000-0000-4000-8000-000000000016'
         AND attempt.attempt_generation = 2
         AND attempt.stripe_session_id = 'cs_test_r46_generation_2'
         AND session.stripe_session_id = 'cs_test_r46_generation_2'
         AND session.attempt_generation = 2
     ) THEN
    RAISE EXCEPTION 'stale generation could expire the replacement provider session: stale=% winner=%',
      v_stale, v_winner;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_claim jsonb;
  v_created jsonb;
  v_renewed jsonb;
  v_reused jsonb;
  v_reclaimed jsonb;
  v_replacement jsonb;
BEGIN
  v_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000017',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('2', 64),
    now() + interval '24 hours'
  );
  v_created := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000017',
    (v_claim->>'claim_token')::uuid,
    (v_claim->>'attempt_generation')::integer,
    repeat('2', 64), 'test',
    'cs_test_r46_expired_1',
    'https://checkout.stripe.test/r46-expired-1'
  );

  v_renewed := public.reconcile_or_renew_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000017',
    (v_created->>'attempt_generation')::integer,
    repeat('2', 64), 'test',
    'cs_test_r46_expired_1', 'expired', 'unpaid',
    now() - interval '1 minute',
    'https://checkout.stripe.test/r46-expired-1',
    now() + interval '24 hours', 120
  );

  IF v_renewed->>'outcome' <> 'claimed'
     OR (v_renewed->>'attempt_generation')::integer <> 2 THEN
    RAISE EXCEPTION 'expired provider session was not explicitly renewed: %',
      v_renewed;
  END IF;

  v_reused := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000017',
    (v_renewed->>'claim_token')::uuid,
    (v_renewed->>'attempt_generation')::integer,
    repeat('2', 64), 'test',
    'cs_test_r46_expired_1',
    'https://checkout.stripe.test/r46-expired-1'
  );
  IF v_reused->>'code' <> 'WHATSAPP_PAYMENT_RENEWAL_PROVIDER_SESSION_REUSED'
     OR v_reused->>'provider_cleanup' <> 'preserve' THEN
    RAISE EXCEPTION 'renewal accepted the expired provider session again: %',
      v_reused;
  END IF;

  UPDATE public.whatsapp_payment_attempts
  SET claim_expires_at = now() - interval '1 second'
  WHERE booking_id = '39000000-0000-4000-8000-000000000017';

  v_reclaimed := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000017',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('2', 64),
    now() + interval '24 hours'
  );
  IF v_reclaimed->>'outcome' <> 'claimed'
     OR (v_reclaimed->>'attempt_generation')::integer <> 3
     OR (SELECT previous_stripe_session_id
         FROM public.whatsapp_payment_attempts
         WHERE booking_id = '39000000-0000-4000-8000-000000000017')
        <> 'cs_test_r46_expired_1' THEN
    RAISE EXCEPTION 'renewal takeover lost the expired provider owner: %',
      v_reclaimed;
  END IF;

  v_replacement := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000017',
    (v_reclaimed->>'claim_token')::uuid,
    (v_reclaimed->>'attempt_generation')::integer,
    repeat('2', 64), 'test',
    'cs_test_r46_expired_3',
    'https://checkout.stripe.test/r46-expired-3'
  );

  IF v_replacement->>'outcome' <> 'created'
     OR NOT EXISTS (
       SELECT 1 FROM public.whatsapp_payment_sessions
       WHERE booking_id = '39000000-0000-4000-8000-000000000017'
         AND stripe_session_id = 'cs_test_r46_expired_3'
         AND attempt_generation = 3
     )
     OR EXISTS (
       SELECT 1 FROM public.whatsapp_payment_sessions
       WHERE stripe_session_id = 'cs_test_r46_expired_1'
     ) THEN
    RAISE EXCEPTION 'renewal did not replace only the expired local provider identity: %',
      v_replacement;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_claim jsonb;
  v_created jsonb;
  v_completed jsonb;
BEGIN
  v_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000018',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('3', 64),
    now() + interval '24 hours'
  );
  v_created := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000018',
    (v_claim->>'claim_token')::uuid,
    (v_claim->>'attempt_generation')::integer,
    repeat('3', 64), 'test',
    'cs_test_r46_provider_complete',
    'https://checkout.stripe.test/r46-provider-complete'
  );

  v_completed := public.reconcile_or_renew_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000018',
    (v_created->>'attempt_generation')::integer,
    repeat('3', 64), 'test',
    'cs_test_r46_provider_complete', 'complete', 'paid',
    now() + interval '1 hour',
    'https://checkout.stripe.test/r46-provider-complete',
    now() + interval '24 hours', 120
  );

  IF v_completed->>'outcome' <> 'blocked'
     OR v_completed->>'code' <> 'WHATSAPP_PAYMENT_PROVIDER_COMPLETION_PENDING'
     OR (SELECT attempt_generation FROM public.whatsapp_payment_attempts
         WHERE booking_id = '39000000-0000-4000-8000-000000000018') <> 1 THEN
    RAISE EXCEPTION 'completed provider session was incorrectly renewed: %',
      v_completed;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_deleted_claim jsonb;
  v_claim jsonb;
  v_finalize jsonb;
  v_created jsonb;
  v_reconcile jsonb;
BEGIN
  v_deleted_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000019',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('4', 64),
    now() + interval '24 hours'
  );
  IF v_deleted_claim->>'outcome' <> 'blocked'
     OR v_deleted_claim->>'code' <> 'BOOKING_DELETED'
     OR EXISTS (
       SELECT 1 FROM public.whatsapp_payment_attempts
       WHERE booking_id = '39000000-0000-4000-8000-000000000019'
     ) THEN
    RAISE EXCEPTION 'soft-deleted booking was claimed for payment: %',
      v_deleted_claim;
  END IF;

  v_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000020',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('5', 64),
    now() + interval '24 hours'
  );
  UPDATE public.bookings SET is_deleted = true
  WHERE id = '39000000-0000-4000-8000-000000000020';
  v_finalize := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000020',
    (v_claim->>'claim_token')::uuid,
    (v_claim->>'attempt_generation')::integer,
    repeat('5', 64), 'test',
    'cs_test_r46_deleted_finalize',
    'https://checkout.stripe.test/r46-deleted-finalize'
  );
  IF v_finalize->>'outcome' <> 'conflict'
     OR v_finalize->>'code' <> 'BOOKING_DELETED'
     OR v_finalize->>'provider_cleanup' <> 'expire'
     OR EXISTS (
       SELECT 1 FROM public.whatsapp_payment_sessions
       WHERE booking_id = '39000000-0000-4000-8000-000000000020'
     ) THEN
    RAISE EXCEPTION 'soft-deleted booking was finalized for payment: %',
      v_finalize;
  END IF;

  v_claim := public.claim_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000021',
    '39000000-0000-4000-8000-000000000004',
    '39000000-0000-4000-8000-000000000005',
    '39000000-0000-4000-8000-000000000002',
    10000, 'eur', 'test', 'full', NULL, repeat('6', 64),
    now() + interval '24 hours'
  );
  v_created := public.finalize_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000021',
    (v_claim->>'claim_token')::uuid,
    (v_claim->>'attempt_generation')::integer,
    repeat('6', 64), 'test',
    'cs_test_r46_deleted_reconcile',
    'https://checkout.stripe.test/r46-deleted-reconcile'
  );
  UPDATE public.bookings SET is_deleted = true
  WHERE id = '39000000-0000-4000-8000-000000000021';
  v_reconcile := public.reconcile_or_renew_whatsapp_payment_attempt(
    '39000000-0000-4000-8000-000000000021',
    (v_created->>'attempt_generation')::integer,
    repeat('6', 64), 'test',
    'cs_test_r46_deleted_reconcile', 'open', 'unpaid',
    now() + interval '1 hour',
    'https://checkout.stripe.test/r46-deleted-reconcile',
    now() + interval '24 hours', 120
  );
  IF v_reconcile->>'outcome' <> 'blocked'
     OR v_reconcile->>'code' <> 'BOOKING_DELETED' THEN
    RAISE EXCEPTION 'soft-deleted booking was reconciled or renewed for payment: %',
      v_reconcile;
  END IF;
END;
$test$;

DO $test$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.claim_whatsapp_payment_attempt(uuid,uuid,uuid,uuid,integer,text,text,text,jsonb,text,timestamptz,integer)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.claim_whatsapp_payment_attempt(uuid,uuid,uuid,uuid,integer,text,text,text,jsonb,text,timestamptz,integer)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.claim_whatsapp_payment_attempt(uuid,uuid,uuid,uuid,integer,text,text,text,jsonb,text,timestamptz,integer)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.finalize_whatsapp_payment_attempt(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.finalize_whatsapp_payment_attempt(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.finalize_whatsapp_payment_attempt(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.finalize_whatsapp_payment_attempt(uuid,uuid,integer,text,text,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.finalize_whatsapp_payment_attempt(uuid,uuid,integer,text,text,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.finalize_whatsapp_payment_attempt(uuid,uuid,integer,text,text,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'public.reconcile_or_renew_whatsapp_payment_attempt(uuid,integer,text,text,text,text,text,timestamptz,text,timestamptz,integer)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.reconcile_or_renew_whatsapp_payment_attempt(uuid,integer,text,text,text,text,text,timestamptz,text,timestamptz,integer)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.reconcile_or_renew_whatsapp_payment_attempt(uuid,integer,text,text,text,text,text,timestamptz,text,timestamptz,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'WhatsApp payment attempt RPC grants are incorrect';
  END IF;

  IF has_table_privilege('anon', 'public.whatsapp_payment_attempts', 'SELECT')
     OR has_table_privilege(
       'authenticated', 'public.whatsapp_payment_attempts', 'SELECT'
     )
     OR has_table_privilege(
       'service_role', 'public.whatsapp_payment_attempts', 'SELECT'
     ) THEN
    RAISE EXCEPTION 'private WhatsApp payment attempt table is directly exposed';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'WHATSAPP_PAYMENT_ATTEMPT_CLAIM_CONTRACT_PASS';
