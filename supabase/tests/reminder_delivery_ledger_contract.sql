\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '71000000-0000-0000-0000-000000000001',
    'reminder-owner@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Reminder Owner"}'::jsonb,
    now(), now()
  ),
  (
    '71000000-0000-0000-0000-000000000002',
    'reminder-intruder@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Reminder Intruder"}'::jsonb,
    now(), now()
  );

INSERT INTO public.calendars (id, user_id, name, slug, is_active, timezone)
VALUES (
  '71000000-0000-0000-0000-000000000010',
  '71000000-0000-0000-0000-000000000001',
  'Reminder Delivery Contract',
  'reminder-delivery-contract',
  true,
  'Europe/Amsterdam'
);

UPDATE public.calendar_settings
SET
  first_reminder_enabled = true,
  first_reminder_timing_hours = 48,
  second_reminder_enabled = true,
  second_reminder_timing_minutes = 30
WHERE calendar_id = '71000000-0000-0000-0000-000000000010';

INSERT INTO public.bookings (
  id, calendar_id, customer_name, customer_email, start_time, end_time,
  status, payment_status, confirmation_token
)
VALUES
  (
    '71000000-0000-0000-0000-000000000101',
    '71000000-0000-0000-0000-000000000010',
    'Record Only', 'record-only@example.invalid',
    now() + interval '1 hour', now() + interval '70 minutes',
    'confirmed', 'paid', '71000000-0000-4000-8000-000000000101'
  ),
  (
    '71000000-0000-0000-0000-000000000102',
    '71000000-0000-0000-0000-000000000010',
    'Provider Accepted', 'provider-accepted@example.invalid',
    now() + interval '2 hours', now() + interval '130 minutes',
    'confirmed', 'paid', '71000000-0000-4000-8000-000000000102'
  ),
  (
    '71000000-0000-0000-0000-000000000103',
    '71000000-0000-0000-0000-000000000010',
    'Cancelled Before Provider', 'cancel-before@example.invalid',
    now() + interval '3 hours', now() + interval '190 minutes',
    'confirmed', 'paid', '71000000-0000-4000-8000-000000000103'
  ),
  (
    '71000000-0000-0000-0000-000000000104',
    '71000000-0000-0000-0000-000000000010',
    'Late Booking', 'late-booking@example.invalid',
    now() + interval '10 minutes', now() + interval '20 minutes',
    'confirmed', 'paid', '71000000-0000-4000-8000-000000000104'
  ),
  (
    '71000000-0000-0000-0000-000000000105',
    '71000000-0000-0000-0000-000000000010',
    'Claim Fence And Reschedule', 'claim-fence@example.invalid',
    now() + interval '4 hours', now() + interval '250 minutes',
    'confirmed', 'paid', '71000000-0000-4000-8000-000000000105'
  ),
  (
    '71000000-0000-0000-0000-000000000106',
    '71000000-0000-0000-0000-000000000010',
    'Refunded Before Provider', 'refund-before@example.invalid',
    now() + interval '5 hours', now() + interval '310 minutes',
    'confirmed', 'paid', '71000000-0000-4000-8000-000000000106'
  );

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_claim record;
  v_second_claim record;
  v_old_token uuid;
  v_old_generation uuid;
  v_new_token uuid;
  v_new_generation uuid;
  v_key text;
  v_count integer;
  v_status text;
  v_attempt_count integer;
BEGIN
  -- A booking created inside both windows must receive only the nearer reminder.
  SELECT count(*), min(reminder_number)
  INTO v_count, v_attempt_count
  FROM public.get_due_booking_reminders_v2(
    '71000000-0000-0000-0000-000000000104', 50
  );
  IF v_count <> 1 OR v_attempt_count <> 2 THEN
    RAISE EXCEPTION 'late booking did not select only reminder 2: count %, number %',
      v_count, v_attempt_count;
  END IF;

  -- Record-only is auditable but cannot manufacture a provider receipt.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '71000000-0000-0000-0000-000000000101', 1::smallint
  );
  IF v_claim.claim_token IS NULL THEN
    RAISE EXCEPTION 'record-only reminder was not claimed';
  END IF;
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '71000000-0000-0000-0000-000000000101',
    v_claim.schedule_generation
  );
  IF NOT public.begin_booking_reminder_attempt_v2(
    '71000000-0000-0000-0000-000000000101', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    'email', 'record-only', v_key
  ) THEN
    RAISE EXCEPTION 'record-only attempt did not begin';
  END IF;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '71000000-0000-0000-0000-000000000101', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    false, 3, NULL, 'email', 'record-only', NULL, v_key
  );
  SELECT status, attempt_count INTO v_status, v_attempt_count
  FROM public.booking_reminders_sent
  WHERE booking_id = '71000000-0000-0000-0000-000000000101';
  IF v_status <> 'recorded' OR v_attempt_count <> 1 THEN
    RAISE EXCEPTION 'record-only truth mismatch: status %, attempts %',
      v_status, v_attempt_count;
  END IF;

  -- An active provider attempt fences all eligibility-changing booking writes.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '71000000-0000-0000-0000-000000000102', 1::smallint
  );
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '71000000-0000-0000-0000-000000000102',
    v_claim.schedule_generation
  );
  IF NOT public.begin_booking_reminder_attempt_v2(
    '71000000-0000-0000-0000-000000000102', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    'email', 'send', v_key
  ) THEN
    RAISE EXCEPTION 'provider attempt did not begin';
  END IF;
  BEGIN
    UPDATE public.bookings
    SET start_time = start_time + interval '1 hour'
    WHERE id = '71000000-0000-0000-0000-000000000102';
    RAISE EXCEPTION 'active provider attempt allowed a reschedule';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '71000000-0000-0000-0000-000000000102', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    true, 3, NULL, 'email', 'send', 'email-contract-102', v_key
  );
  UPDATE public.bookings
  SET status = 'cancelled'
  WHERE id = '71000000-0000-0000-0000-000000000102';
  SELECT status, post_acceptance_state INTO v_status, v_key
  FROM public.booking_reminders_sent
  WHERE booking_id = '71000000-0000-0000-0000-000000000102';
  IF v_status <> 'provider_accepted' OR v_key <> 'booking_cancelled' THEN
    RAISE EXCEPTION 'post-acceptance cancellation rewrote or hid evidence: %, %',
      v_status, v_key;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.booking_reminders_sent
    WHERE booking_id = '71000000-0000-0000-0000-000000000102'
      AND (sent_at IS NOT NULL OR provider_accepted_at IS NULL)
  ) THEN
    RAISE EXCEPTION 'provider acceptance was represented as delivery';
  END IF;

  -- Cancellation and refund after claim but before provider I/O are reconciled safely.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '71000000-0000-0000-0000-000000000103', 1::smallint
  );
  UPDATE public.bookings SET status = 'cancelled'
  WHERE id = '71000000-0000-0000-0000-000000000103';
  PERFORM public.reconcile_booking_reminders_v2();
  SELECT status INTO v_status FROM public.booking_reminders_sent
  WHERE booking_id = '71000000-0000-0000-0000-000000000103';
  IF v_status <> 'booking_cancelled' THEN
    RAISE EXCEPTION 'claimed cancellation was not reconciled: %', v_status;
  END IF;

  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '71000000-0000-0000-0000-000000000106', 1::smallint
  );
  UPDATE public.bookings SET payment_status = 'partially_refunded'
  WHERE id = '71000000-0000-0000-0000-000000000106';
  PERFORM public.reconcile_booking_reminders_v2();
  SELECT status INTO v_status FROM public.booking_reminders_sent
  WHERE booking_id = '71000000-0000-0000-0000-000000000106';
  IF v_status <> 'payment_refunded' THEN
    RAISE EXCEPTION 'claimed refund was not reconciled: %', v_status;
  END IF;

  -- An expired lease gets a new opaque token; the old worker cannot finalize it.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '71000000-0000-0000-0000-000000000105', 1::smallint
  );
  v_old_token := v_claim.claim_token;
  v_old_generation := v_claim.schedule_generation;
  UPDATE public.booking_reminders_sent
  SET claim_expires_at = now() - interval '1 second'
  WHERE booking_id = '71000000-0000-0000-0000-000000000105'
    AND schedule_generation = v_old_generation;
  SELECT * INTO v_second_claim
  FROM public.claim_booking_reminder_v2(
    '71000000-0000-0000-0000-000000000105', 1::smallint
  );
  v_new_token := v_second_claim.claim_token;
  v_new_generation := v_second_claim.schedule_generation;
  IF v_new_token IS NULL OR v_new_token = v_old_token THEN
    RAISE EXCEPTION 'expired claim did not receive a new fencing token';
  END IF;
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '71000000-0000-0000-0000-000000000105', v_old_generation
  );
  BEGIN
    PERFORM * FROM public.record_booking_reminder_result_v2(
      '71000000-0000-0000-0000-000000000105', 1::smallint,
      v_old_generation, v_old_token,
      false, 3, NULL, 'email', 'record-only', NULL, v_key
    );
    RAISE EXCEPTION 'stale worker finalized a replacement claim';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'REMINDER_RESULT_STALE_CLAIM' THEN
      RAISE;
    END IF;
  END;
  IF NOT public.begin_booking_reminder_attempt_v2(
    '71000000-0000-0000-0000-000000000105', 1::smallint,
    v_new_generation, v_new_token,
    'email', 'record-only', v_key
  ) THEN
    RAISE EXCEPTION 'replacement claim did not begin';
  END IF;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '71000000-0000-0000-0000-000000000105', 1::smallint,
    v_new_generation, v_new_token,
    false, 3, NULL, 'email', 'record-only', NULL, v_key
  );

  -- Reschedule creates a new generation/key while retaining old-generation evidence.
  UPDATE public.bookings
  SET
    start_time = start_time + interval '30 minutes',
    end_time = end_time + interval '30 minutes'
  WHERE id = '71000000-0000-0000-0000-000000000105';
  SELECT reminder_generation INTO v_new_generation
  FROM public.bookings
  WHERE id = '71000000-0000-0000-0000-000000000105';
  IF v_new_generation = v_old_generation THEN
    RAISE EXCEPTION 'reschedule did not rotate reminder generation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.booking_reminders_sent
    WHERE booking_id = '71000000-0000-0000-0000-000000000105'
      AND schedule_generation = v_old_generation
      AND status = 'recorded'
  ) THEN
    RAISE EXCEPTION 'reschedule deleted old-generation evidence';
  END IF;
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '71000000-0000-0000-0000-000000000105', 1::smallint
  );
  IF v_claim.claim_token IS NULL
     OR v_claim.schedule_generation <> v_new_generation THEN
    RAISE EXCEPTION 'reschedule did not create a current-generation claim';
  END IF;
END;
$test$;

-- New mutating/read RPCs are service-role-only, including explicit function ACLs.
DO $test$
DECLARE
  v_identity text;
BEGIN
  FOREACH v_identity IN ARRAY ARRAY[
    'public.reconcile_booking_reminders_v2()',
    'public.get_due_booking_reminders_v2(uuid,integer)',
    'public.claim_booking_reminder_v2(uuid,smallint)',
    'public.begin_booking_reminder_attempt_v2(uuid,smallint,uuid,uuid,text,text,text)',
    'public.record_booking_reminder_result_v2(uuid,smallint,uuid,uuid,boolean,integer,text,text,text,text,text)'
  ] LOOP
    IF has_function_privilege('anon', v_identity, 'EXECUTE')
       OR has_function_privilege('authenticated', v_identity, 'EXECUTE')
       OR NOT has_function_privilege('service_role', v_identity, 'EXECUTE') THEN
      RAISE EXCEPTION 'unsafe reminder RPC grants: %', v_identity;
    END IF;
  END LOOP;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-booking-reminders'
  ) THEN
    RAISE EXCEPTION 'v2 reminder cron was activated before Edge deployment/canary';
  END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

DO $test$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.booking_reminders_sent;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'cross-tenant reminder evidence leaked: % rows', v_count;
  END IF;
END;
$test$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.booking_reminders_sent;
  IF v_count < 5 THEN
    RAISE EXCEPTION 'owner could not read reminder evidence: % rows', v_count;
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'REMINDER_DELIVERY_LEDGER_CONTRACT_PASS';
