\set ON_ERROR_STOP on
BEGIN;

DO $contract$
DECLARE
  v_owner constant uuid := '48200000-0000-4000-8000-000000000001';
  v_team_member constant uuid := '48200000-0000-4000-8000-000000000002';
  v_calendar constant uuid := '48200000-0000-4000-8000-000000000010';
  v_service constant uuid := '48200000-0000-4000-8000-000000000020';
  v_remote_service constant uuid := '48200000-0000-4000-8000-000000000021';
  v_claimed_booking constant uuid := '48200000-0000-4000-8000-000000000101';
  v_remote_booking constant uuid := '48200000-0000-4000-8000-000000000102';
  v_failure_booking constant uuid := '48200000-0000-4000-8000-000000000103';
  v_settlement_booking constant uuid := '48200000-0000-4000-8000-000000000104';
  v_retry_booking constant uuid := '48200000-0000-4000-8000-000000000105';
  v_success_cleanup_booking constant uuid := '48200000-0000-4000-8000-000000000106';
  v_expired_claim_booking constant uuid := '48200000-0000-4000-8000-000000000107';
  v_expired_claim_reservation constant uuid := '48200000-0000-4000-8000-000000000207';
  v_expired_claim_token constant uuid := '48200000-0000-4000-8000-000000000307';
  v_claimed_fingerprint constant text := repeat('1', 64);
  v_remote_fingerprint constant text := repeat('2', 64);
  v_failure_fingerprint constant text := repeat('3', 64);
  v_settlement_fingerprint constant text := repeat('4', 64);
  v_retry_fingerprint constant text := repeat('5', 64);
  v_success_fingerprint constant text := repeat('6', 64);
  v_result jsonb;
  v_replay jsonb;
  v_claim jsonb;
  v_reservation_id uuid;
  v_generation integer;
  v_job record;
  v_attempt integer;
BEGIN
  IF to_regclass(
       'public.booking_payment_provider_cleanup_claim_expiry_idx'
     ) IS NULL THEN
    RAISE EXCEPTION 'R48_CLEANUP_CLAIM_EXPIRY_INDEX_MISSING';
  END IF;

  IF to_regclass(
       'public.monitoring_alerts_cleanup_job_dedupe_idx'
     ) IS NULL
     OR to_regclass(
       'public.monitoring_alerts_expired_provider_claim_dedupe_idx'
     ) IS NULL THEN
    RAISE EXCEPTION 'R48_MONITORING_ALERT_DEDUPE_INDEX_MISSING';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.finalize_booking_payment_success_v2(uuid,text,text,timestamptz,text)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.finalize_booking_payment_success_v2(uuid,text,text,timestamptz,text)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role',
       'public.finalize_booking_payment_success_v2(uuid,text,text,timestamptz,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'R48_ACTIVE_SETTLEMENT_GRANTS_INVALID';
  END IF;

  IF has_function_privilege(
       'anon',
       'public.release_booking_payment_provider_after_failure(uuid,text,text,integer,text,text,text)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.release_booking_payment_provider_after_failure(uuid,text,text,integer,text,text,text)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role',
       'public.release_booking_payment_provider_after_failure(uuid,text,text,integer,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'R48_FAILURE_RELEASE_GRANTS_INVALID';
  END IF;

  INSERT INTO auth.users (
    id, email, aud, role, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES
  (
    v_owner, 'r48-reviewer-contract@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"R48 Reviewer Contract"}'::jsonb, now(), now()
  ),
  (
    v_team_member, 'r48-reviewer-team-member@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"R48 Reviewer Team Member"}'::jsonb, now(), now()
  );

  UPDATE public.users
  SET account_owner_id = v_owner
  WHERE id = v_team_member;

  INSERT INTO public.calendars (
    id, user_id, name, slug, is_active, timezone
  ) VALUES (
    v_calendar, v_team_member, 'R48 Reviewer Contract',
    'r48-reviewer-contract', true, 'Europe/Amsterdam'
  );

  INSERT INTO public.business_stripe_accounts (
    calendar_id, user_id, account_owner_id, stripe_account_id,
    platform_account_id, environment, account_status,
    onboarding_completed, charges_enabled, payouts_enabled
  ) VALUES (
    v_calendar, v_owner, v_owner, 'acct_test_r48_reviewer',
    'acct_platform_test_r48_reviewer', 'test', 'active', true, true, true
  );

  INSERT INTO public.service_types (
    id, calendar_id, name, duration, price, is_active,
    business_country, tax_enabled, tax_behavior,
    applicable_tax_rate, supply_type
  ) VALUES
  (
    v_service, v_calendar, 'R48 Reviewer Service', 60, 100.00, true,
    'NL', false, 'exclusive', 0, 'in_person'
  ),
  (
    v_remote_service, v_calendar, 'R48 Remote Reviewer Service',
    60, 100.00, true, 'NL', true, 'exclusive', NULL, 'remote_service'
  );

  INSERT INTO public.bookings (
    id, calendar_id, service_type_id, customer_name, customer_email,
    customer_phone, start_time, end_time, status, total_price,
    total_amount_cents, payment_currency, payment_status, payment_required,
    payment_timing, service_name, booking_duration
  ) VALUES
  (
    v_claimed_booking, v_calendar, v_service, 'Claimed Customer',
    'claimed-r48@example.invalid', '+31610000301',
    now() + interval '30 days', now() + interval '30 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Reviewer Service', 60
  ),
  (
    v_failure_booking, v_calendar, v_service, 'Failure Customer',
    'failure-r48@example.invalid', '+31610000303',
    now() + interval '32 days', now() + interval '32 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Reviewer Service', 60
  ),
  (
    v_settlement_booking, v_calendar, v_service, 'Settlement Customer',
    'settlement-r48@example.invalid', '+31610000304',
    now() + interval '33 days', now() + interval '33 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Reviewer Service', 60
  ),
  (
    v_retry_booking, v_calendar, v_service, 'Retry Customer',
    'retry-r48@example.invalid', '+31610000305',
    now() + interval '34 days', now() + interval '34 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Reviewer Service', 60
  ),
  (
    v_success_cleanup_booking, v_calendar, v_service, 'Cleanup Customer',
    'cleanup-r48@example.invalid', '+31610000306',
    now() + interval '35 days', now() + interval '35 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Reviewer Service', 60
  ),
  (
    v_expired_claim_booking, v_calendar, v_service, 'Expired Claim Customer',
    'expired-claim-r48@example.invalid', '+31610000307',
    now() + interval '36 days', now() + interval '36 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Reviewer Service', 60
  );

  INSERT INTO public.bookings (
    id, calendar_id, service_type_id, customer_name, customer_email,
    customer_phone, customer_country, start_time, end_time, status,
    total_price, total_amount_cents, payment_currency, payment_status,
    payment_required, payment_timing, service_name, booking_duration,
    public_booking_policy_snapshot
  ) VALUES (
    v_remote_booking, v_calendar, v_remote_service, 'Remote Customer',
    'remote-r48@example.invalid', '+31610000302', 'GB',
    now() + interval '31 days', now() + interval '31 days 1 hour',
    'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
    'R48 Remote Reviewer Service', 60,
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
        "applicable_tax_rate":null,
        "business_country":"NL",
        "supply_type":"remote_service",
        "customer_country":"GB",
        "customer_vat_id":null
      }
    }'::jsonb
  );

  -- An expired create lease cannot hold booking cancellation forever. Keep the
  -- reservation for a late finalizer, surface reconciliation, and let close win.
  INSERT INTO public.booking_payment_provider_reservations (
    id, booking_id, generation, channel, provider_kind, amount_cents,
    total_due_cents, currency, stripe_mode, destination_account_id,
    platform_account_id, request_fingerprint, state, claim_token,
    claim_expires_at
  ) VALUES (
    v_expired_claim_reservation, v_expired_claim_booking, 1, 'web',
    'payment_intent', 10000, 10000, 'eur', 'test',
    'acct_test_r48_reviewer', 'acct_platform_test_r48_reviewer',
    repeat('7', 64), 'claimed', v_expired_claim_token,
    clock_timestamp() - interval '1 second'
  );

  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = v_expired_claim_booking;

  IF (SELECT status FROM public.bookings
      WHERE id = v_expired_claim_booking) <> 'cancelled'
     OR (SELECT count(*) FROM public.monitoring_alerts
         WHERE failure_class = 'booking_provider_claim_expired_on_close'
           AND details ->> 'reservation_id' =
             v_expired_claim_reservation::text) <> 1 THEN
    RAISE EXCEPTION 'R48_EXPIRED_CLAIM_DID_NOT_RELEASE_BOOKING_CLOSE';
  END IF;

  v_result := public.finalize_booking_payment_provider_reservation(
    v_expired_claim_booking, v_expired_claim_reservation,
    v_expired_claim_token, 1, repeat('7', 64), 'test',
    'pi_test_r48_late_after_close', NULL, NULL
  );
  IF v_result->>'outcome' <> 'conflict'
     OR v_result->>'code' <> 'BOOKING_CLOSED_DURING_PROVIDER_CREATE'
     OR NOT EXISTS (
       SELECT 1
       FROM public.booking_payment_provider_cleanup_jobs
       WHERE reservation_id = v_expired_claim_reservation
         AND provider_object_id = 'pi_test_r48_late_after_close'
         AND state = 'pending'
     ) THEN
    RAISE EXCEPTION 'R48_LATE_FINALIZER_AFTER_CLOSE_NOT_FENCED:%', v_result;
  END IF;

  SELECT * INTO v_job
  FROM public.claim_booking_payment_provider_cleanup(1, 120);
  IF v_job.reservation_id IS DISTINCT FROM v_expired_claim_reservation THEN
    RAISE EXCEPTION 'R48_LATE_FINALIZER_CLEANUP_NOT_CLAIMABLE';
  END IF;
  v_result := public.finalize_booking_payment_provider_cleanup(
    v_job.job_id, v_job.claim_token, true, 'provider_canceled', NULL, 300
  );
  IF v_result->>'outcome' <> 'completed'
     OR (SELECT state
         FROM public.booking_payment_provider_reservations
         WHERE id = v_expired_claim_reservation) <> 'cleaned' THEN
    RAISE EXCEPTION 'R48_LATE_FINALIZER_CLEANUP_NOT_COMPLETED:%', v_result;
  END IF;

  -- A team-member calendar resolves the account owner's canonical Connect
  -- destination. The first claimant still cannot choose another destination.
  v_result := public.claim_booking_payment_provider_reservation(
    v_claimed_booking, 'web', 'payment_intent', 10000, 10000,
    'eur', 'test', 'acct_wrong_destination',
    'acct_platform_test_r48_reviewer', NULL, v_claimed_fingerprint, 120
  );
  IF v_result->>'outcome' <> 'conflict'
     OR v_result->>'code' <> 'BOOKING_PROVIDER_DESTINATION_NOT_CANONICAL'
     OR EXISTS (
       SELECT 1 FROM public.booking_payment_provider_reservations
       WHERE booking_id = v_claimed_booking
     ) THEN
    RAISE EXCEPTION 'R48_NON_CANONICAL_FIRST_CLAIM_ACCEPTED:%', v_result;
  END IF;

  v_claim := public.claim_booking_payment_provider_reservation(
    v_claimed_booking, 'web', 'payment_intent', 10000, 10000,
    'eur', 'test', 'acct_test_r48_reviewer',
    'acct_platform_test_r48_reviewer', NULL, v_claimed_fingerprint, 120
  );
  IF v_claim->>'outcome' <> 'claimed' THEN
    RAISE EXCEPTION 'R48_CANONICAL_FIRST_CLAIM_FAILED:%', v_claim;
  END IF;

  -- A booking close cannot race a provider create whose result is still uncertain.
  BEGIN
    UPDATE public.bookings SET status = 'cancelled'
    WHERE id = v_claimed_booking;
    RAISE EXCEPTION 'R48_BOOKING_CLOSE_DURING_CREATE_ACCEPTED';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> 'BOOKING_PROVIDER_CREATE_IN_PROGRESS' THEN
      RAISE;
    END IF;
  END;
  IF (SELECT status FROM public.bookings WHERE id = v_claimed_booking)
       <> 'pending' THEN
    RAISE EXCEPTION 'R48_FAILED_CLOSE_MUTATED_BOOKING';
  END IF;

  -- A caller-supplied Tax Calculation ID is identity only; it cannot raise the cap.
  v_result := public.claim_booking_payment_provider_reservation(
    v_remote_booking, 'web', 'payment_intent', 12100, 12100,
    'eur', 'test', 'acct_test_r48_reviewer',
    'acct_platform_test_r48_reviewer', 'taxcalc_R48reviewer',
    v_remote_fingerprint, 120
  );
  IF v_result->>'outcome' <> 'blocked'
     OR v_result->>'code' <>
       'BOOKING_PROVIDER_REMOTE_GROSS_REQUIRES_VERIFIED_PROVIDER_ATTESTATION' THEN
    RAISE EXCEPTION 'R48_CALLER_RAISED_REMOTE_CEILING:%', v_result;
  END IF;

  -- A signed asynchronous Checkout failure releases only its exact generation.
  v_claim := public.claim_booking_payment_provider_reservation(
    v_failure_booking, 'whatsapp', 'checkout_session', 10000, 10000,
    'eur', 'test', 'acct_test_r48_reviewer',
    'acct_platform_test_r48_reviewer', NULL, v_failure_fingerprint, 120
  );
  v_result := public.finalize_booking_payment_provider_reservation(
    v_failure_booking, (v_claim->>'reservation_id')::uuid,
    (v_claim->>'claim_token')::uuid, (v_claim->>'generation')::integer,
    v_failure_fingerprint, 'test', 'cs_test_r48_failure',
    'https://checkout.stripe.test/r48-failure', now() + interval '30 minutes'
  );
  IF v_result->>'outcome' <> 'created' THEN
    RAISE EXCEPTION 'R48_FAILURE_PROVIDER_FINALIZE_FAILED:%', v_result;
  END IF;
  v_result := public.release_booking_payment_provider_after_failure(
    v_failure_booking, 'checkout_session', 'cs_test_r48_failure',
    (v_claim->>'generation')::integer, v_failure_fingerprint, 'test',
    'checkout.session.async_payment_failed'
  );
  IF v_result->>'outcome' <> 'released' THEN
    RAISE EXCEPTION 'R48_ASYNC_FAILURE_NOT_RELEASED:%', v_result;
  END IF;
  v_replay := public.release_booking_payment_provider_after_failure(
    v_failure_booking, 'checkout_session', 'cs_test_r48_failure',
    (v_claim->>'generation')::integer, v_failure_fingerprint, 'test',
    'checkout.session.async_payment_failed'
  );
  IF v_replay->>'outcome' <> 'replay' THEN
    RAISE EXCEPTION 'R48_ASYNC_FAILURE_RELEASE_NOT_IDEMPOTENT:%', v_replay;
  END IF;
  v_claim := public.claim_booking_payment_provider_reservation(
    v_failure_booking, 'whatsapp', 'checkout_session', 10000, 10000,
    'eur', 'test', 'acct_test_r48_reviewer',
    'acct_platform_test_r48_reviewer', NULL, v_failure_fingerprint, 120
  );
  IF v_claim->>'outcome' <> 'claimed'
     OR (v_claim->>'generation')::integer <> 2 THEN
    RAISE EXCEPTION 'R48_ASYNC_FAILURE_RETRY_BLOCKED:%', v_claim;
  END IF;
  v_result := public.finalize_booking_payment_provider_reservation(
    v_failure_booking, (v_claim->>'reservation_id')::uuid,
    (v_claim->>'claim_token')::uuid, 2, v_failure_fingerprint, 'test',
    'cs_test_r48_failure_2',
    'https://checkout.stripe.test/r48-failure-2',
    now() + interval '30 minutes'
  );
  v_result := public.renew_booking_payment_provider_after_expiry(
    v_failure_booking, (v_claim->>'reservation_id')::uuid, 2,
    v_failure_fingerprint, 'test', 'cs_test_r48_failure_2',
    'expired', 'unpaid', 120
  );
  IF v_result->>'outcome' <> 'claimed'
     OR (v_result->>'generation')::integer <> 3
     OR NOT EXISTS (
       SELECT 1
       FROM public.booking_payment_provider_reservations AS reservation
       WHERE reservation.id = (v_result->>'reservation_id')::uuid
         AND reservation.platform_account_id =
           'acct_platform_test_r48_reviewer'
     ) THEN
    RAISE EXCEPTION 'R48_RENEWAL_LOST_PLATFORM_IDENTITY:%', v_result;
  END IF;

  -- Settlement atomically supersedes pending cleanup and remains replayable.
  v_claim := public.claim_booking_payment_provider_reservation(
    v_settlement_booking, 'whatsapp', 'checkout_session', 10000, 10000,
    'eur', 'test', 'acct_test_r48_reviewer',
    'acct_platform_test_r48_reviewer', NULL, v_settlement_fingerprint, 120
  );
  v_reservation_id := (v_claim->>'reservation_id')::uuid;
  v_generation := (v_claim->>'generation')::integer;
  v_result := public.finalize_booking_payment_provider_reservation(
    v_settlement_booking, v_reservation_id,
    (v_claim->>'claim_token')::uuid, v_generation,
    v_settlement_fingerprint, 'test', 'cs_test_r48_settlement',
    'https://checkout.stripe.test/r48-settlement',
    now() + interval '30 minutes'
  );
  v_result := public.require_booking_payment_provider_cleanup(
    v_settlement_booking, v_reservation_id, v_generation,
    v_settlement_fingerprint, 'cs_test_r48_settlement',
    'R48_REVIEWER_SETTLEMENT_RACE'
  );
  IF v_result->>'outcome' <> 'queued' THEN
    RAISE EXCEPTION 'R48_SETTLEMENT_CLEANUP_NOT_QUEUED:%', v_result;
  END IF;
  v_result := public.authorize_booking_payment_provider_settlement(
    v_settlement_booking, 'checkout_session', 'cs_test_r48_settlement',
    v_generation, v_settlement_fingerprint, 'pi_test_r48_settlement',
    10000, 'eur', 'test', 'acct_test_r48_reviewer'
  );
  IF v_result->>'outcome' <> 'authorized' THEN
    RAISE EXCEPTION 'R48_PENDING_CLEANUP_NOT_SUPERSEDED:%', v_result;
  END IF;
  v_replay := public.authorize_booking_payment_provider_settlement(
    v_settlement_booking, 'checkout_session', 'cs_test_r48_settlement',
    v_generation, v_settlement_fingerprint, 'pi_test_r48_settlement',
    10000, 'eur', 'test', 'acct_test_r48_reviewer'
  );
  IF v_replay->>'outcome' <> 'replay'
     OR NOT EXISTS (
       SELECT 1 FROM public.booking_payment_provider_cleanup_jobs
       WHERE reservation_id = v_reservation_id
         AND state = 'completed'
         AND provider_result = 'superseded_by_capture'
     ) THEN
    RAISE EXCEPTION 'R48_SETTLEMENT_SUPERSEDE_NOT_CRASH_IDEMPOTENT:%',
      v_replay;
  END IF;

  -- Five provider failures dead-letter exactly once and enter the monitoring outbox.
  v_claim := public.claim_booking_payment_provider_reservation(
    v_retry_booking, 'whatsapp', 'checkout_session', 10000, 10000,
    'eur', 'test', 'acct_test_r48_reviewer',
    'acct_platform_test_r48_reviewer', NULL, v_retry_fingerprint, 120
  );
  v_reservation_id := (v_claim->>'reservation_id')::uuid;
  v_generation := (v_claim->>'generation')::integer;
  v_result := public.finalize_booking_payment_provider_reservation(
    v_retry_booking, v_reservation_id, (v_claim->>'claim_token')::uuid,
    v_generation, v_retry_fingerprint, 'test', 'cs_test_r48_retry',
    'https://checkout.stripe.test/r48-retry', now() + interval '30 minutes'
  );
  v_result := public.require_booking_payment_provider_cleanup(
    v_retry_booking, v_reservation_id, v_generation, v_retry_fingerprint,
    'cs_test_r48_retry', 'R48_REVIEWER_RETRY_CAP'
  );
  FOR v_attempt IN 1..5 LOOP
    SELECT * INTO v_job
    FROM public.claim_booking_payment_provider_cleanup(1, 120);
    IF v_job.job_id IS NULL OR v_job.attempt_count <> v_attempt THEN
      RAISE EXCEPTION 'R48_RETRY_CLAIM_%_FAILED', v_attempt;
    END IF;
    v_result := public.finalize_booking_payment_provider_cleanup(
      v_job.job_id, v_job.claim_token, false, NULL,
      'PROVIDER_EXPIRE_FAILED', 60
    );
    IF v_attempt < 5 AND v_result->>'outcome' <> 'retry_scheduled' THEN
      RAISE EXCEPTION 'R48_RETRY_%_NOT_SCHEDULED:%', v_attempt, v_result;
    ELSIF v_attempt = 5 AND (
      v_result->>'outcome' <> 'dead_letter'
      OR v_result->>'human_action_required' <> 'true'
    ) THEN
      RAISE EXCEPTION 'R48_RETRY_CAP_NOT_ESCALATED:%', v_result;
    END IF;
    IF v_attempt < 5 THEN
      UPDATE public.booking_payment_provider_cleanup_jobs
      SET next_attempt_at = clock_timestamp() - interval '1 second'
      WHERE id = v_job.job_id;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.monitoring_alerts
      WHERE failure_class = 'booking_provider_cleanup_dead_letter'
        AND details ->> 'job_id' = v_job.job_id::text) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.monitoring_alerts
       WHERE failure_class = 'booking_provider_cleanup_dead_letter'
         AND details ->> 'job_id' = v_job.job_id::text
         AND detected_by = 'cleanup_worker'
     ) THEN
    RAISE EXCEPTION 'R48_DEAD_LETTER_ALERT_NOT_DURABLE';
  END IF;

  -- A successful fenced cleanup owns the matching local payment-state transition.
  v_claim := public.claim_booking_payment_provider_reservation(
    v_success_cleanup_booking, 'web', 'payment_intent', 10000, 10000,
    'eur', 'test', 'acct_test_r48_reviewer',
    'acct_platform_test_r48_reviewer', NULL, v_success_fingerprint, 120
  );
  v_reservation_id := (v_claim->>'reservation_id')::uuid;
  v_generation := (v_claim->>'generation')::integer;
  v_result := public.finalize_booking_payment_provider_reservation(
    v_success_cleanup_booking, v_reservation_id,
    (v_claim->>'claim_token')::uuid, v_generation,
    v_success_fingerprint, 'test', 'pi_test_r48_cleanup_success', NULL, NULL
  );
  INSERT INTO public.booking_payments (
    booking_id, stripe_payment_intent_id, stripe_account_id,
    amount_cents, currency, platform_fee_cents, status, stripe_mode
  ) VALUES (
    v_success_cleanup_booking, 'pi_test_r48_cleanup_success',
    'acct_test_r48_reviewer', 10000, 'eur', 190, 'pending', 'test'
  );
  v_result := public.require_booking_payment_provider_cleanup(
    v_success_cleanup_booking, v_reservation_id, v_generation,
    v_success_fingerprint, 'pi_test_r48_cleanup_success',
    'R48_REVIEWER_SUCCESSFUL_CLEANUP'
  );
  SELECT * INTO v_job
  FROM public.claim_booking_payment_provider_cleanup(1, 120);
  v_result := public.finalize_booking_payment_provider_cleanup(
    v_job.job_id, v_job.claim_token, true, 'provider_cleaned', NULL, 300
  );
  IF v_result->>'outcome' <> 'completed'
     OR (SELECT status FROM public.booking_payments
         WHERE stripe_payment_intent_id = 'pi_test_r48_cleanup_success')
       <> 'canceled'
     OR (SELECT state FROM public.booking_payment_provider_reservations
         WHERE id = v_reservation_id) <> 'cleaned' THEN
    RAISE EXCEPTION 'R48_SUCCESSFUL_CLEANUP_LOCAL_TRUTH_MISMATCH:%', v_result;
  END IF;
END;
$contract$;

ROLLBACK;
SELECT 'BOOKING_PAYMENT_PROVIDER_REVIEWER_CONTRACT_PASS';
