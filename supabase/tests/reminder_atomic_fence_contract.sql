\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
  '72000000-0000-0000-0000-000000000001',
  'reminder-fence-owner@example.invalid',
  'authenticated', 'authenticated', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reminder Fence Owner"}'::jsonb,
  now(), now()
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active, timezone)
VALUES (
  '72000000-0000-0000-0000-000000000010',
  '72000000-0000-0000-0000-000000000001',
  'Reminder Atomic Fence',
  'reminder-atomic-fence',
  true,
  'Europe/Amsterdam'
);

UPDATE public.calendar_settings
SET
  first_reminder_enabled = true,
  first_reminder_timing_hours = 48,
  second_reminder_enabled = true,
  second_reminder_timing_minutes = 30
WHERE calendar_id = '72000000-0000-0000-0000-000000000010';

INSERT INTO public.service_types (
  id, calendar_id, name, duration, price, is_active
)
VALUES
  (
    '72000000-0000-0000-0000-000000000030',
    '72000000-0000-0000-0000-000000000010',
    'Reminder Fence Service', 30, 50, true
  ),
  (
    '72000000-0000-0000-0000-000000000031',
    '72000000-0000-0000-0000-000000000010',
    'Reminder Fence Longer Service', 45, 65, true
  );

INSERT INTO public.bookings (
  id, calendar_id, service_type_id, customer_name, customer_email, start_time, end_time,
  status, payment_status, confirmation_token
)
SELECT
  id,
  '72000000-0000-0000-0000-000000000010'::uuid,
  '72000000-0000-0000-0000-000000000030'::uuid,
  label,
  email,
  now() + offset_interval,
  now() + offset_interval + interval '30 minutes',
  'confirmed',
  'paid',
  token
FROM (VALUES
  (
    '72000000-0000-0000-0000-000000000101'::uuid,
    'Contact Refresh', 'old-contact@example.invalid', interval '2 hours',
    '72000000-0000-4000-8000-000000000101'
  ),
  (
    '72000000-0000-0000-0000-000000000102'::uuid,
    'Settings Freshness', 'settings@example.invalid', interval '3 hours',
    '72000000-0000-4000-8000-000000000102'
  ),
  (
    '72000000-0000-0000-0000-000000000103'::uuid,
    'Delete Evidence', 'delete@example.invalid', interval '4 hours',
    '72000000-0000-4000-8000-000000000103'
  ),
  (
    '72000000-0000-0000-0000-000000000104'::uuid,
    'Expired Started', 'expired@example.invalid', interval '5 hours',
    '72000000-0000-4000-8000-000000000104'
  ),
  (
    '72000000-0000-0000-0000-000000000105'::uuid,
    'Active Contact Fence', 'active@example.invalid', interval '6 hours',
    '72000000-0000-4000-8000-000000000105'
  ),
  (
    '72000000-0000-0000-0000-000000000106'::uuid,
    'Late Accepted Reschedule', 'reschedule@example.invalid', interval '7 hours',
    '72000000-0000-4000-8000-000000000106'
  ),
  (
    '72000000-0000-0000-0000-000000000107'::uuid,
    'Accepted Atomic Reschedule', 'atomic-reschedule@example.invalid', interval '9 hours',
    '72000000-0000-4000-8000-000000000107'
  ),
  (
    '72000000-0000-0000-0000-000000000108'::uuid,
    'Same Start Service Reschedule', 'same-start@example.invalid', interval '10 hours',
    '72000000-0000-4000-8000-000000000108'
  )
) AS fixture(id, label, email, offset_interval, token);

-- A disposable child calendar proves the real owner-facing calendar hard-delete cascade.
INSERT INTO public.calendars (id, user_id, name, slug, is_active, timezone)
VALUES (
  '72000000-0000-0000-0000-000000000020',
  '72000000-0000-0000-0000-000000000001',
  'Reminder Cascade Delete',
  'reminder-cascade-delete',
  true,
  'Europe/Amsterdam'
);

UPDATE public.calendar_settings
SET first_reminder_enabled = true, first_reminder_timing_hours = 48
WHERE calendar_id = '72000000-0000-0000-0000-000000000020';

INSERT INTO public.bookings (
  id, calendar_id, customer_name, customer_email, start_time, end_time,
  status, payment_status, confirmation_token
)
VALUES (
  '72000000-0000-0000-0000-000000000120',
  '72000000-0000-0000-0000-000000000020',
  'Calendar Cascade Evidence', 'calendar-delete@example.invalid',
  now() + interval '8 hours', now() + interval '8 hours 30 minutes',
  'confirmed', 'paid', '72000000-0000-4000-8000-000000000120'
);

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_claim record;
  v_generation uuid;
  v_key text;
  v_started boolean;
  v_status text;
  v_error text;
  v_count integer;
  v_result jsonb;
  v_old_start timestamptz;
  v_old_end timestamptz;
BEGIN
  -- A recipient changed after claim is never sent stale. Before any provider attempt the
  -- claim is released once, then the next claim safely captures the new recipient.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000101', 1::smallint
  );
  v_generation := v_claim.schedule_generation;
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '72000000-0000-0000-0000-000000000101', v_generation
  );
  UPDATE public.bookings
  SET customer_email = 'new-contact@example.invalid'
  WHERE id = '72000000-0000-0000-0000-000000000101';
  v_started := public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000101', 1::smallint,
    v_generation, v_claim.claim_token, 'email', 'record-only', v_key
  );
  IF v_started THEN
    RAISE EXCEPTION 'stale recipient reached provider begin';
  END IF;
  SELECT status, last_error_code INTO v_status, v_error
  FROM public.booking_reminders_sent
  WHERE booking_id = '72000000-0000-0000-0000-000000000101';
  IF v_status <> 'pending' OR v_error <> 'REMINDER_SNAPSHOT_STALE_RETRY' THEN
    RAISE EXCEPTION 'stale pre-attempt claim did not release safely: %, %',
      v_status, v_error;
  END IF;
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000101', 1::smallint
  );
  IF v_claim.customer_email <> 'new-contact@example.invalid' THEN
    RAISE EXCEPTION 'replacement claim did not capture fresh recipient: %',
      v_claim.customer_email;
  END IF;
  IF NOT public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000101', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    'email', 'record-only', v_key
  ) THEN
    RAISE EXCEPTION 'fresh replacement claim did not begin';
  END IF;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '72000000-0000-0000-0000-000000000101', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    false, 3, NULL, 'email', 'record-only', NULL, v_key
  );

  -- Reminder settings are re-read at begin, not trusted from claim time.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000102', 1::smallint
  );
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '72000000-0000-0000-0000-000000000102', v_claim.schedule_generation
  );
  UPDATE public.calendar_settings
  SET first_reminder_enabled = false
  WHERE calendar_id = '72000000-0000-0000-0000-000000000010';
  IF public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000102', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    'email', 'record-only', v_key
  ) THEN
    RAISE EXCEPTION 'disabled reminder setting reached provider begin';
  END IF;
  SELECT status INTO v_status
  FROM public.booking_reminders_sent
  WHERE booking_id = '72000000-0000-0000-0000-000000000102';
  IF v_status <> 'superseded' THEN
    RAISE EXCEPTION 'disabled reminder was not parked: %', v_status;
  END IF;
  UPDATE public.calendar_settings
  SET first_reminder_enabled = true
  WHERE calendar_id = '72000000-0000-0000-0000-000000000010';

  -- An intentional booking hard delete owns its historical child lifecycle. A claimed but
  -- not-started reminder must not make the owner-facing delete action permanently impossible.
  PERFORM * FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000103', 1::smallint
  );
  DELETE FROM public.bookings
  WHERE id = '72000000-0000-0000-0000-000000000103';
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '72000000-0000-0000-0000-000000000103'
  ) OR EXISTS (
    SELECT 1 FROM public.booking_reminders_sent
    WHERE booking_id = '72000000-0000-0000-0000-000000000103'
  ) THEN
    RAISE EXCEPTION 'intentional booking delete did not cascade reminder evidence';
  END IF;

  -- Reproduce the real UI path: a completed historical reminder exists, then deleting the
  -- parent calendar must cascade without a reminder-trigger deadlock or permanent refusal.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000120', 1::smallint
  );
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '72000000-0000-0000-0000-000000000120', v_claim.schedule_generation
  );
  IF NOT public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000120', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    'email', 'record-only', v_key
  ) THEN
    RAISE EXCEPTION 'calendar-delete historical reminder did not begin';
  END IF;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '72000000-0000-0000-0000-000000000120', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    false, 3, NULL, 'email', 'record-only', NULL, v_key
  );
  DELETE FROM public.calendars
  WHERE id = '72000000-0000-0000-0000-000000000020';
  IF EXISTS (
    SELECT 1 FROM public.calendars
    WHERE id = '72000000-0000-0000-0000-000000000020'
  ) OR EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '72000000-0000-0000-0000-000000000120'
  ) OR EXISTS (
    SELECT 1 FROM public.booking_reminders_sent
    WHERE booking_id = '72000000-0000-0000-0000-000000000120'
  ) THEN
    RAISE EXCEPTION 'calendar hard delete did not cascade its booking/reminder children';
  END IF;

  -- A started email attempt becomes reconcilable after its lease expires.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000104', 1::smallint
  );
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '72000000-0000-0000-0000-000000000104', v_claim.schedule_generation
  );
  IF NOT public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000104', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    'email', 'send', v_key
  ) THEN
    RAISE EXCEPTION 'expired-started fixture did not begin';
  END IF;
  UPDATE public.booking_reminders_sent
  SET claim_expires_at = now() - interval '1 second'
  WHERE booking_id = '72000000-0000-0000-0000-000000000104';
  UPDATE public.bookings SET status = 'cancelled'
  WHERE id = '72000000-0000-0000-0000-000000000104';
  PERFORM public.reconcile_booking_reminders_v2();
  IF NOT EXISTS (
    SELECT 1
    FROM public.booking_reminders_sent
    WHERE booking_id = '72000000-0000-0000-0000-000000000104'
      AND status = 'delivery_unknown'
      AND claim_token = v_claim.claim_token
      AND provider_attempt_started_at IS NOT NULL
      AND last_error_code = 'REMINDER_PROVIDER_RESULT_PENDING_AFTER_RECONCILIATION'
  ) THEN
    SELECT status, last_error_code INTO v_status, v_error
    FROM public.booking_reminders_sent
    WHERE booking_id = '72000000-0000-0000-0000-000000000104';
    RAISE EXCEPTION
      'expired provider attempt lost its late-result fence: status=%, error=%',
      v_status, v_error;
  END IF;

  -- Contact changes are transactionally fenced while the provider marker is active.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000105', 1::smallint
  );
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '72000000-0000-0000-0000-000000000105', v_claim.schedule_generation
  );
  IF NOT public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000105', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    'email', 'record-only', v_key
  ) THEN
    RAISE EXCEPTION 'active-contact fixture did not begin';
  END IF;
  BEGIN
    UPDATE public.bookings
    SET customer_email = 'must-wait@example.invalid'
    WHERE id = '72000000-0000-0000-0000-000000000105';
    RAISE EXCEPTION 'active provider marker allowed recipient mutation';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '72000000-0000-0000-0000-000000000105', 1::smallint,
    v_claim.schedule_generation, v_claim.claim_token,
    false, 3, NULL, 'email', 'record-only', NULL, v_key
  );

  -- A provider acceptance returned after a reschedule keeps the old snapshot and is labelled
  -- schedule_superseded, never booking_cancelled against the new appointment.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000106', 1::smallint
  );
  v_generation := v_claim.schedule_generation;
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '72000000-0000-0000-0000-000000000106', v_generation
  );
  IF NOT public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000106', 1::smallint,
    v_generation, v_claim.claim_token, 'email', 'send', v_key
  ) THEN
    RAISE EXCEPTION 'late-acceptance fixture did not begin';
  END IF;
  UPDATE public.booking_reminders_sent
  SET claim_expires_at = now() - interval '1 second'
  WHERE booking_id = '72000000-0000-0000-0000-000000000106';
  SELECT start_time, end_time INTO v_old_start, v_old_end
  FROM public.bookings
  WHERE id = '72000000-0000-0000-0000-000000000106';
  v_result := public.reschedule_booking_atomic(
    '72000000-0000-0000-0000-000000000106',
    v_old_start + interval '15 minutes',
    v_old_end + interval '15 minutes',
    '72000000-0000-0000-0000-000000000030',
    NULL,
    NULL
  );
  IF COALESCE((v_result->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'production reschedule RPC failed for late result fixture: %', v_result;
  END IF;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '72000000-0000-0000-0000-000000000106', 1::smallint,
    v_generation, v_claim.claim_token,
    true, 3, NULL, 'email', 'send', 'late-provider-receipt', v_key
  );
  SELECT status, post_acceptance_state INTO v_status, v_error
  FROM public.booking_reminders_sent
  WHERE booking_id = '72000000-0000-0000-0000-000000000106'
    AND schedule_generation = v_generation;
  IF v_status <> 'provider_accepted' OR v_error <> 'schedule_superseded' THEN
    RAISE EXCEPTION 'late acceptance lost reschedule truth: %, %', v_status, v_error;
  END IF;

  -- Same-start reschedules can still change duration/service. They must rotate the schedule
  -- generation and replace the temporary booking_cancelled annotation with superseded.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000108', 1::smallint
  );
  v_generation := v_claim.schedule_generation;
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '72000000-0000-0000-0000-000000000108', v_generation
  );
  IF NOT public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000108', 1::smallint,
    v_generation, v_claim.claim_token, 'email', 'send', v_key
  ) THEN
    RAISE EXCEPTION 'same-start reschedule fixture did not begin';
  END IF;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '72000000-0000-0000-0000-000000000108', 1::smallint,
    v_generation, v_claim.claim_token,
    true, 3, NULL, 'email', 'send', 'accepted-before-same-start-change', v_key
  );
  SELECT start_time, end_time INTO v_old_start, v_old_end
  FROM public.bookings
  WHERE id = '72000000-0000-0000-0000-000000000108';
  v_result := public.reschedule_booking_atomic(
    '72000000-0000-0000-0000-000000000108',
    v_old_start,
    v_old_end + interval '15 minutes',
    '72000000-0000-0000-0000-000000000031',
    NULL,
    NULL
  );
  IF COALESCE((v_result->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'same-start duration/service reschedule failed: %', v_result;
  END IF;
  SELECT reminder.status, reminder.post_acceptance_state
  INTO v_status, v_error
  FROM public.booking_reminders_sent AS reminder
  WHERE reminder.booking_id = '72000000-0000-0000-0000-000000000108'
    AND reminder.schedule_generation = v_generation;
  IF v_status <> 'provider_accepted' OR v_error <> 'schedule_superseded' THEN
    RAISE EXCEPTION 'same-start change retained false cancellation: %, %',
      v_status, v_error;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '72000000-0000-0000-0000-000000000108'
      AND reminder_generation = v_generation
  ) THEN
    RAISE EXCEPTION 'same-start duration/service change did not rotate generation';
  END IF;

  -- Reproduce the reviewer's exact production defect: provider acceptance is already
  -- durable, then reschedule_booking_atomic performs its temporary cancellation + final
  -- move. The final annotation must be schedule_superseded, not booking_cancelled.
  SELECT * INTO v_claim
  FROM public.claim_booking_reminder_v2(
    '72000000-0000-0000-0000-000000000107', 1::smallint
  );
  v_generation := v_claim.schedule_generation;
  v_key := format(
    'booking-reminder/%s/1/email/%s',
    '72000000-0000-0000-0000-000000000107', v_generation
  );
  IF NOT public.begin_booking_reminder_attempt_v2(
    '72000000-0000-0000-0000-000000000107', 1::smallint,
    v_generation, v_claim.claim_token, 'email', 'send', v_key
  ) THEN
    RAISE EXCEPTION 'accepted atomic-reschedule fixture did not begin';
  END IF;
  PERFORM * FROM public.record_booking_reminder_result_v2(
    '72000000-0000-0000-0000-000000000107', 1::smallint,
    v_generation, v_claim.claim_token,
    true, 3, NULL, 'email', 'send', 'accepted-before-reschedule', v_key
  );
  SELECT start_time, end_time INTO v_old_start, v_old_end
  FROM public.bookings
  WHERE id = '72000000-0000-0000-0000-000000000107';
  v_result := public.reschedule_booking_atomic(
    '72000000-0000-0000-0000-000000000107',
    v_old_start + interval '20 minutes',
    v_old_end + interval '20 minutes',
    '72000000-0000-0000-0000-000000000030',
    NULL,
    NULL
  );
  IF COALESCE((v_result->>'ok')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'production reschedule RPC failed after acceptance: %', v_result;
  END IF;
  SELECT status, post_acceptance_state INTO v_status, v_error
  FROM public.booking_reminders_sent
  WHERE booking_id = '72000000-0000-0000-0000-000000000107'
    AND schedule_generation = v_generation;
  IF v_status <> 'provider_accepted' OR v_error <> 'schedule_superseded' THEN
    RAISE EXCEPTION 'atomic reschedule retained temporary cancellation label: %, %',
      v_status, v_error;
  END IF;

  -- All v1 identities fail before provider I/O, including service-role callers.
  FOREACH v_error IN ARRAY ARRAY[
    'public.get_due_booking_reminders()',
    'public.claim_booking_reminder(uuid,smallint)',
    'public.begin_booking_reminder_provider_attempt(uuid,smallint,text,text,text)',
    'public.record_booking_reminder_result(uuid,smallint,boolean,integer,text,text,text,text,text)'
  ] LOOP
    IF has_function_privilege('service_role', v_error, 'EXECUTE') THEN
      RAISE EXCEPTION 'v1 reminder identity still executable: %', v_error;
    END IF;
  END LOOP;

  -- The reconciliation write is empirically capped at 200 rows per call.
  INSERT INTO public.bookings (
    id, calendar_id, customer_name, customer_email, start_time, end_time,
    status, payment_status, confirmation_token
  )
  SELECT
    gen_random_uuid(),
    '72000000-0000-0000-0000-000000000010'::uuid,
    'Bounded Reconcile ' || series,
    'bounded-' || series || '@example.invalid',
    now() + interval '24 hours' + series * interval '1 hour',
    now() + interval '24 hours 30 minutes' + series * interval '1 hour',
    'confirmed',
    'paid',
    gen_random_uuid()::text
  FROM generate_series(1, 205) AS series;

  INSERT INTO public.booking_reminders_sent (
    booking_id, reminder_number, schedule_generation, status, attempt_count,
    booking_start_time_snapshot, delivery_mode
  )
  SELECT
    booking.id, 1::smallint, gen_random_uuid(), 'pending', 0,
    booking.start_time, 'send'
  FROM public.bookings AS booking
  WHERE booking.customer_email LIKE 'bounded-%@example.invalid';

  v_count := public.reconcile_booking_reminders_v2();
  IF v_count <> 200 THEN
    RAISE EXCEPTION 'first bounded reconciliation updated % rows, expected 200', v_count;
  END IF;
  v_count := public.reconcile_booking_reminders_v2();
  IF v_count <> 5 THEN
    RAISE EXCEPTION 'second bounded reconciliation updated % rows, expected 5', v_count;
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'booking_reminders_pending_reconcile_idx'
  ) THEN
    RAISE EXCEPTION 'bounded reconciliation index missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process-booking-reminders'
  ) THEN
    RAISE EXCEPTION 'reminder cron activated during preproduction';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'REMINDER_ATOMIC_FENCE_CONTRACT_PASS';
