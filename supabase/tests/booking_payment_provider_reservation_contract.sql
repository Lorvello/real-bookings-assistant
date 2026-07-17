\set ON_ERROR_STOP on
BEGIN;

DO $contract$
DECLARE
  v_owner constant uuid := '48000000-0000-4000-8000-000000000001';
  v_calendar constant uuid := '48000000-0000-4000-8000-000000000010';
  v_service constant uuid := '48000000-0000-4000-8000-000000000020';
  v_web_booking constant uuid := '48000000-0000-4000-8000-000000000101';
  v_cleanup_booking constant uuid := '48000000-0000-4000-8000-000000000102';
  v_web_fingerprint constant text := repeat('a', 64);
  v_whatsapp_fingerprint constant text := repeat('b', 64);
  v_cleanup_fingerprint constant text := repeat('c', 64);
  v_claim jsonb;
  v_retry jsonb;
  v_other jsonb;
  v_finalized jsonb;
  v_verified jsonb;
  v_authorized jsonb;
  v_settled jsonb;
  v_reservation_id uuid;
  v_claim_token uuid;
  v_generation integer;
  v_job record;
  v_second_job record;
  v_cleanup_result jsonb;
BEGIN
  IF to_regclass('public.booking_payment_provider_reservations') IS NULL
     OR to_regclass('public.booking_payment_provider_cleanup_jobs') IS NULL THEN
    RAISE EXCEPTION 'R48_PROVIDER_AUTHORITY_TABLES_MISSING';
  END IF;

  IF has_table_privilege('anon',
       'public.booking_payment_provider_reservations', 'SELECT')
     OR has_table_privilege('authenticated',
       'public.booking_payment_provider_reservations', 'SELECT')
     OR has_table_privilege('service_role',
       'public.booking_payment_provider_reservations', 'SELECT')
     OR has_table_privilege('anon',
       'public.booking_payment_provider_cleanup_jobs', 'SELECT')
     OR has_table_privilege('authenticated',
       'public.booking_payment_provider_cleanup_jobs', 'SELECT')
     OR has_table_privilege('service_role',
       'public.booking_payment_provider_cleanup_jobs', 'SELECT') THEN
    RAISE EXCEPTION 'R48_PRIVATE_LEDGER_TABLE_GRANT_WIDENED';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.claim_booking_payment_provider_reservation(uuid,text,text,integer,integer,text,text,text,text,text,text,integer)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.claim_booking_payment_provider_reservation(uuid,text,text,integer,integer,text,text,text,text,text,text,integer)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role',
       'public.claim_booking_payment_provider_reservation(uuid,text,text,integer,integer,text,text,text,text,text,text,integer)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'R48_CLAIM_RPC_GRANTS_INVALID';
  END IF;

  INSERT INTO auth.users (
    id, email, aud, role, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_owner, 'r48-provider-contract@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"R48 Provider Contract"}'::jsonb, now(), now()
  );

  INSERT INTO public.calendars (
    id, user_id, name, slug, is_active, timezone
  ) VALUES (
    v_calendar, v_owner, 'R48 Provider Contract',
    'r48-provider-contract', true, 'Europe/Amsterdam'
  );

  INSERT INTO public.business_stripe_accounts (
    calendar_id, user_id, account_owner_id, stripe_account_id,
    platform_account_id, environment, account_status,
    onboarding_completed, charges_enabled, payouts_enabled
  ) VALUES (
    v_calendar, v_owner, v_owner, 'acct_test_r48',
    'acct_platform_test_r48', 'test', 'active', true, true, true
  );

  INSERT INTO public.service_types (
    id, calendar_id, name, duration, price, is_active,
    business_country, tax_enabled, tax_code, tax_behavior,
    applicable_tax_rate, supply_type
  ) VALUES (
    v_service, v_calendar, 'R48 Taxed Service', 60, 100.00, true,
    'NL', true, 'txcd_20030000', 'exclusive', 21, 'in_person'
  );

  INSERT INTO public.bookings (
    id, calendar_id, service_type_id, customer_name, customer_email,
    customer_phone, start_time, end_time, status, total_price,
    total_amount_cents, payment_currency, payment_status, payment_required,
    payment_timing, service_name, booking_duration,
    public_booking_policy_snapshot
  ) VALUES
  (
    v_web_booking, v_calendar, v_service, 'Web Customer',
    'web-r48@example.invalid', '+31610000101',
    now() + interval '20 days', now() + interval '20 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Taxed Service', 60,
    '{
      "version":1,
      "captured_at":"2026-07-17T00:00:00Z",
      "secure_payments_enabled":true,
      "payment_required_for_booking":true,
      "payment_optional":false,
      "payment_required":true,
      "enabled_payment_methods":["card"],
      "allowed_payment_timing":["pay_now"],
      "payout_option":"standard",
      "auto_cancel_unpaid_bookings":true,
      "payment_deadline_hours":24,
      "tax":{
        "tax_enabled":true,
        "tax_code":"txcd_20030000",
        "tax_behavior":"exclusive",
        "applicable_tax_rate":21,
        "business_country":"NL",
        "supply_type":"in_person",
        "customer_country":null,
        "customer_vat_id":null
      }
    }'::jsonb
  ),
  (
    v_cleanup_booking, v_calendar, v_service, 'WhatsApp Customer',
    'wa-r48@example.invalid', '+31610000102',
    now() + interval '21 days', now() + interval '21 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Taxed Service', 60,
    '{
      "version":1,
      "captured_at":"2026-07-17T00:00:00Z",
      "secure_payments_enabled":true,
      "payment_required_for_booking":true,
      "payment_optional":false,
      "payment_required":true,
      "enabled_payment_methods":["card"],
      "allowed_payment_timing":["pay_now"],
      "payout_option":"standard",
      "auto_cancel_unpaid_bookings":true,
      "payment_deadline_hours":24,
      "tax":{
        "tax_enabled":true,
        "tax_code":"txcd_20030000",
        "tax_behavior":"exclusive",
        "applicable_tax_rate":21,
        "business_country":"NL",
        "supply_type":"in_person",
        "customer_country":null,
        "customer_vat_id":null
      }
    }'::jsonb
  );

  -- The web claimant owns the booking globally. 12100 is valid even though the
  -- booking snapshot is 10000 because the immutable gross ceiling includes 21% tax.
  v_claim := public.claim_booking_payment_provider_reservation(
    v_web_booking, 'web', 'payment_intent', 12100, 12100, 'eur', 'test',
    'acct_test_r48', 'acct_platform_test_r48', NULL,
    v_web_fingerprint, 120
  );
  IF v_claim->>'outcome' <> 'claimed' THEN
    RAISE EXCEPTION 'R48_WEB_CLAIM_FAILED:%', v_claim;
  END IF;
  v_reservation_id := (v_claim->>'reservation_id')::uuid;
  v_claim_token := (v_claim->>'claim_token')::uuid;
  v_generation := (v_claim->>'generation')::integer;

  -- A concurrent channel cannot mint its own provider object.
  v_other := public.claim_booking_payment_provider_reservation(
    v_web_booking, 'whatsapp', 'checkout_session', 12100, 12100, 'eur',
    'test', 'acct_test_r48', 'acct_platform_test_r48', NULL,
    v_whatsapp_fingerprint, 120
  );
  IF v_other->>'outcome' <> 'conflict'
     OR v_other->>'code' <>
       'BOOKING_PROVIDER_RESERVATION_OWNED_BY_OTHER_PATH'
     OR v_other->>'booking_disposition' <> 'preserve' THEN
    RAISE EXCEPTION 'R48_CROSS_CHANNEL_CONFLICT_NOT_CLOSED:%', v_other;
  END IF;

  v_retry := public.claim_booking_payment_provider_reservation(
    v_web_booking, 'web', 'payment_intent', 12100, 12100, 'eur', 'test',
    'acct_test_r48', 'acct_platform_test_r48', NULL,
    v_web_fingerprint, 120
  );
  IF v_retry->>'outcome' <> 'in_progress'
     OR (v_retry->>'generation')::integer <> v_generation THEN
    RAISE EXCEPTION 'R48_ACTIVE_LEASE_NOT_REUSED:%', v_retry;
  END IF;

  -- A lease takeover keeps the same generation/idempotency key. An uncertain
  -- first provider response therefore resolves to one Stripe object.
  UPDATE public.booking_payment_provider_reservations
  SET claim_expires_at = clock_timestamp() - interval '1 second'
  WHERE id = v_reservation_id;
  v_retry := public.claim_booking_payment_provider_reservation(
    v_web_booking, 'web', 'payment_intent', 12100, 12100, 'eur', 'test',
    'acct_test_r48', 'acct_platform_test_r48', NULL,
    v_web_fingerprint, 120
  );
  IF v_retry->>'outcome' <> 'claimed'
     OR (v_retry->>'generation')::integer <> v_generation
     OR v_retry->>'idempotency_key' <> v_claim->>'idempotency_key' THEN
    RAISE EXCEPTION 'R48_TAKEOVER_CHANGED_PROVIDER_IDENTITY:%', v_retry;
  END IF;
  v_claim_token := (v_retry->>'claim_token')::uuid;

  v_finalized := public.finalize_booking_payment_provider_reservation(
    v_web_booking, v_reservation_id, v_claim_token, v_generation,
    v_web_fingerprint, 'test', 'pi_test_r48_web', NULL, NULL
  );
  IF v_finalized->>'outcome' <> 'created' THEN
    RAISE EXCEPTION 'R48_PROVIDER_FINALIZE_FAILED:%', v_finalized;
  END IF;

  v_retry := public.claim_booking_payment_provider_reservation(
    v_web_booking, 'web', 'payment_intent', 12100, 12100, 'eur', 'test',
    'acct_test_r48', 'acct_platform_test_r48', NULL,
    v_web_fingerprint, 120
  );
  IF v_retry->>'outcome' <> 'reconcile'
     OR v_retry->>'provider_object_id' <> 'pi_test_r48_web' THEN
    RAISE EXCEPTION 'R48_PROVIDER_REPLAY_NOT_DURABLE:%', v_retry;
  END IF;

  v_verified := public.verify_booking_payment_provider_reservation(
    v_web_booking, 'web', 'payment_intent', 12100, 12100, 'eur', 'test',
    'acct_test_r48', 'acct_platform_test_r48', NULL,
    v_web_fingerprint, 'pi_test_r48_web'
  );
  IF v_verified->>'outcome' <> 'verified' THEN
    RAISE EXCEPTION 'R48_PROVIDER_VERIFY_FAILED:%', v_verified;
  END IF;

  v_authorized := public.authorize_booking_payment_provider_settlement(
    v_web_booking, 'payment_intent', 'pi_test_r48_web', v_generation,
    v_web_fingerprint, 'pi_test_r48_web', 12100, 'eur', 'test',
    'acct_wrong_destination'
  );
  IF v_authorized->>'outcome' <> 'conflict' THEN
    RAISE EXCEPTION 'R48_WRONG_DESTINATION_SETTLEMENT_ACCEPTED:%', v_authorized;
  END IF;

  v_authorized := public.authorize_booking_payment_provider_settlement(
    v_web_booking, 'payment_intent', 'pi_test_r48_web', v_generation,
    v_web_fingerprint, 'pi_test_r48_web', 12100, 'eur', 'test',
    'acct_test_r48'
  );
  IF v_authorized->>'outcome' <> 'authorized'
     OR (v_authorized->>'capture_ceiling_cents')::integer <> 12100 THEN
    RAISE EXCEPTION 'R48_SETTLEMENT_AUTHORIZATION_FAILED:%', v_authorized;
  END IF;

  INSERT INTO public.booking_payments (
    booking_id, stripe_payment_intent_id, stripe_account_id,
    amount_cents, currency, platform_fee_cents, status, stripe_mode
  ) VALUES (
    v_web_booking, 'pi_test_r48_web', 'acct_test_r48',
    12100, 'eur', 230, 'pending', 'test'
  );
  v_settled := public.finalize_booking_payment_success_v2(
    v_web_booking, 'pi_test_r48_web', 'full', clock_timestamp(), 'test'
  );
  IF v_settled->>'success' <> 'true'
     OR (v_settled->>'captureCeilingCents')::integer <> 12100 THEN
    RAISE EXCEPTION 'R48_EXCLUSIVE_TAX_SETTLEMENT_FAILED:%', v_settled;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.booking_payment_provider_reservations AS reservation
    WHERE reservation.id = v_reservation_id
      AND reservation.state = 'completed'
      AND reservation.settlement_payment_intent_id = 'pi_test_r48_web'
  ) THEN
    RAISE EXCEPTION 'R48_SETTLEMENT_DID_NOT_COMPLETE_RESERVATION';
  END IF;

  -- A separate Checkout provider is queued durably when its booking closes.
  v_claim := public.claim_booking_payment_provider_reservation(
    v_cleanup_booking, 'whatsapp', 'checkout_session',
    5000, 12100, 'eur', 'test', 'acct_test_r48',
    'acct_platform_test_r48', NULL, v_cleanup_fingerprint, 120
  );
  v_reservation_id := (v_claim->>'reservation_id')::uuid;
  v_generation := (v_claim->>'generation')::integer;
  v_finalized := public.finalize_booking_payment_provider_reservation(
    v_cleanup_booking, v_reservation_id, (v_claim->>'claim_token')::uuid,
    v_generation, v_cleanup_fingerprint, 'test', 'cs_test_r48_cleanup',
    'https://checkout.stripe.test/r48-cleanup', now() + interval '30 minutes'
  );
  IF v_finalized->>'outcome' <> 'created' THEN
    RAISE EXCEPTION 'R48_CHECKOUT_FINALIZE_FAILED:%', v_finalized;
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = v_cleanup_booking;

  IF NOT EXISTS (
    SELECT 1
    FROM public.booking_payment_provider_cleanup_jobs AS job
    WHERE job.reservation_id = v_reservation_id
      AND job.state = 'pending'
      AND job.provider_object_id = 'cs_test_r48_cleanup'
  ) THEN
    RAISE EXCEPTION 'R48_BOOKING_CLOSE_DID_NOT_QUEUE_CLEANUP';
  END IF;

  SELECT *
  INTO v_job
  FROM public.claim_booking_payment_provider_cleanup(1, 120);
  IF v_job.job_id IS NULL OR v_job.attempt_count <> 1 THEN
    RAISE EXCEPTION 'R48_CLEANUP_CLAIM_FAILED';
  END IF;

  v_authorized := public.authorize_booking_payment_provider_settlement(
    v_cleanup_booking, 'checkout_session', 'cs_test_r48_cleanup',
    v_generation, v_cleanup_fingerprint, 'pi_test_r48_late',
    5000, 'eur', 'test', 'acct_test_r48'
  );
  IF v_authorized->>'outcome' <> 'in_progress'
     OR v_authorized->>'code' <>
       'BOOKING_PROVIDER_CLEANUP_SIDE_EFFECT_IN_PROGRESS' THEN
    RAISE EXCEPTION 'R48_SETTLEMENT_RACED_CLAIMED_CLEANUP:%', v_authorized;
  END IF;

  v_cleanup_result := public.verify_booking_payment_provider_cleanup_claim(
    v_job.job_id, gen_random_uuid()
  );
  IF v_cleanup_result->>'outcome' <> 'conflict' THEN
    RAISE EXCEPTION 'R48_STALE_CLEANUP_SIDE_EFFECT_FENCE_ACCEPTED:%',
      v_cleanup_result;
  END IF;
  v_cleanup_result := public.verify_booking_payment_provider_cleanup_claim(
    v_job.job_id, v_job.claim_token
  );
  IF v_cleanup_result->>'outcome' <> 'authorized' THEN
    RAISE EXCEPTION 'R48_CURRENT_CLEANUP_SIDE_EFFECT_FENCE_REJECTED:%',
      v_cleanup_result;
  END IF;

  v_cleanup_result := public.finalize_booking_payment_provider_cleanup(
    v_job.job_id, gen_random_uuid(), true, 'expired', NULL, 300
  );
  IF v_cleanup_result->>'outcome' <> 'conflict' THEN
    RAISE EXCEPTION 'R48_STALE_CLEANUP_TOKEN_ACCEPTED:%', v_cleanup_result;
  END IF;

  v_cleanup_result := public.finalize_booking_payment_provider_cleanup(
    v_job.job_id, v_job.claim_token, false, NULL,
    'PROVIDER_EXPIRE_FAILED', 300
  );
  IF v_cleanup_result->>'outcome' <> 'retry_scheduled' THEN
    RAISE EXCEPTION 'R48_CLEANUP_RETRY_NOT_DURABLE:%', v_cleanup_result;
  END IF;
  UPDATE public.booking_payment_provider_cleanup_jobs
  SET next_attempt_at = clock_timestamp() - interval '1 second'
  WHERE id = v_job.job_id;

  SELECT *
  INTO v_second_job
  FROM public.claim_booking_payment_provider_cleanup(1, 120);
  IF v_second_job.job_id <> v_job.job_id
     OR v_second_job.claim_token = v_job.claim_token
     OR v_second_job.attempt_count <> 2 THEN
    RAISE EXCEPTION 'R48_CLEANUP_RETRY_FENCE_FAILED';
  END IF;
  v_cleanup_result := public.finalize_booking_payment_provider_cleanup(
    v_second_job.job_id, v_second_job.claim_token, true, 'expired', NULL, 300
  );
  IF v_cleanup_result->>'outcome' <> 'completed' THEN
    RAISE EXCEPTION 'R48_CLEANUP_COMPLETION_FAILED:%', v_cleanup_result;
  END IF;

  IF EXISTS (
    SELECT booking_id
    FROM public.booking_payment_provider_reservations
    WHERE state IN ('claimed', 'provider_created', 'cleanup_pending')
    GROUP BY booking_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'R48_MORE_THAN_ONE_ACTIVE_PROVIDER_AUTHORITY';
  END IF;
END;
$contract$;

ROLLBACK;
SELECT 'BOOKING_PAYMENT_PROVIDER_RESERVATION_CONTRACT_PASS';
