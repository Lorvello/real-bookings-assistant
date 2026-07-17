#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase_db_grdgjhkygzciwwrxgvgy}"
PSQL=(docker exec -i "$DB_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres)

OWNER_ID="73000000-0000-0000-0000-000000000001"
CALENDAR_A="73000000-0000-0000-0000-000000000010"
CALENDAR_B="73000000-0000-0000-0000-000000000020"
SERVICE_A="73000000-0000-0000-0000-000000000030"
SERVICE_B="73000000-0000-0000-0000-000000000031"
BOOKING_ID="73000000-0000-0000-0000-000000000101"
CONFIRMATION_TOKEN="73000000-0000-4000-8000-000000000101"
BOOKING_RECONCILE_ID="73000000-0000-0000-0000-000000000102"
RECONCILE_CONFIRMATION_TOKEN="73000000-0000-4000-8000-000000000102"
BOOKING_RECLAIM_ID="73000000-0000-0000-0000-000000000103"
RECLAIM_CONFIRMATION_TOKEN="73000000-0000-4000-8000-000000000103"
BOOKING_TERMINAL_ID="73000000-0000-0000-0000-000000000104"
TERMINAL_CONFIRMATION_TOKEN="73000000-0000-4000-8000-000000000104"

session_a_output="$(mktemp)"
cleanup() {
  rm -f "$session_a_output"
  "${PSQL[@]}" >/dev/null <<SQL
DELETE FROM public.booking_reminders_sent
WHERE booking_id IN (
  '$BOOKING_ID'::uuid,
  '$BOOKING_RECONCILE_ID'::uuid,
  '$BOOKING_RECLAIM_ID'::uuid,
  '$BOOKING_TERMINAL_ID'::uuid
);
DELETE FROM public.bookings
WHERE id IN (
  '$BOOKING_ID'::uuid,
  '$BOOKING_RECONCILE_ID'::uuid,
  '$BOOKING_RECLAIM_ID'::uuid,
  '$BOOKING_TERMINAL_ID'::uuid
);
DELETE FROM public.service_types WHERE id IN ('$SERVICE_A'::uuid, '$SERVICE_B'::uuid);
DELETE FROM public.calendars WHERE id IN ('$CALENDAR_A'::uuid, '$CALENDAR_B'::uuid);
DELETE FROM auth.users WHERE id = '$OWNER_ID'::uuid;
SQL
}
trap cleanup EXIT

# Keep reruns deterministic even if an earlier process was interrupted before cleanup.
cleanup

"${PSQL[@]}" <<SQL
INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '$OWNER_ID'::uuid, 'reminder-race-owner@example.invalid',
  'authenticated', 'authenticated', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Reminder Race Owner"}'::jsonb, now(), now()
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active, timezone)
VALUES
  ('$CALENDAR_A'::uuid, '$OWNER_ID'::uuid, 'Reminder Race A', 'reminder-race-a', true, 'Europe/Amsterdam'),
  ('$CALENDAR_B'::uuid, '$OWNER_ID'::uuid, 'Reminder Race B', 'reminder-race-b', true, 'Europe/Amsterdam');

UPDATE public.calendar_settings
SET first_reminder_enabled = true, first_reminder_timing_hours = 48
WHERE calendar_id IN ('$CALENDAR_A'::uuid, '$CALENDAR_B'::uuid);

INSERT INTO public.service_types (id, calendar_id, name, duration, price, is_active)
VALUES
  ('$SERVICE_A'::uuid, '$CALENDAR_A'::uuid, 'Reminder Race Service A', 30, 50, true),
  ('$SERVICE_B'::uuid, '$CALENDAR_B'::uuid, 'Reminder Race Service B', 45, 65, true);

INSERT INTO public.bookings (
  id, calendar_id, service_type_id, customer_name, customer_email,
  start_time, end_time, status, payment_status, confirmation_token
) VALUES
  (
    '$BOOKING_ID'::uuid, '$CALENDAR_A'::uuid, '$SERVICE_A'::uuid,
    'Reminder Race Customer', 'reminder-race@example.invalid',
    now() + interval '6 hours', now() + interval '6 hours 30 minutes',
    'confirmed', 'paid', '$CONFIRMATION_TOKEN'::uuid
  ),
  (
    '$BOOKING_RECONCILE_ID'::uuid, '$CALENDAR_A'::uuid, '$SERVICE_A'::uuid,
    'Reminder Reconcile Customer', 'reminder-reconcile@example.invalid',
    now() + interval '8 hours', now() + interval '8 hours 30 minutes',
    'confirmed', 'paid', '$RECONCILE_CONFIRMATION_TOKEN'::uuid
  ),
  (
    '$BOOKING_RECLAIM_ID'::uuid, '$CALENDAR_A'::uuid, '$SERVICE_A'::uuid,
    'Reminder Reclaim Customer', 'reminder-reclaim@example.invalid',
    now() + interval '10 hours', now() + interval '10 hours 30 minutes',
    'confirmed', 'paid', '$RECLAIM_CONFIRMATION_TOKEN'::uuid
  ),
  (
    '$BOOKING_TERMINAL_ID'::uuid, '$CALENDAR_A'::uuid, '$SERVICE_A'::uuid,
    'Reminder Terminal Customer', 'reminder-terminal@example.invalid',
    now() + interval '11 hours', now() + interval '11 hours 30 minutes',
    'confirmed', 'paid', '$TERMINAL_CONFIRMATION_TOKEN'::uuid
  );
SQL

claim="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT claim_token::text || '|' || schedule_generation::text
FROM public.claim_booking_reminder_v2('$BOOKING_ID'::uuid, 1::smallint);
SQL
)"

IFS='|' read -r claim_token schedule_generation <<<"$claim"
if [[ -z "${claim_token:-}" || -z "${schedule_generation:-}" ]]; then
  echo "REMINDER_CROSS_CALENDAR_RACE_CLAIM_FAILED" >&2
  exit 1
fi

delivery_key="booking-reminder/$BOOKING_ID/1/email/$schedule_generation"
began="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT public.begin_booking_reminder_attempt_v2(
  '$BOOKING_ID'::uuid, 1::smallint, '$schedule_generation'::uuid,
  '$claim_token'::uuid, 'email', 'send', '$delivery_key'
);
SQL
)"
if [[ "$began" != "t" ]]; then
  echo "REMINDER_CROSS_CALENDAR_RACE_BEGIN_FAILED:$began" >&2
  exit 1
fi

# Reproduce the late-receipt window: the provider attempt exists but its DB lease expired.
"${PSQL[@]}" <<SQL
UPDATE public.booking_reminders_sent
SET claim_expires_at = now() - interval '1 second'
WHERE booking_id = '$BOOKING_ID'::uuid
  AND reminder_number = 1
  AND schedule_generation = '$schedule_generation'::uuid;
SQL

# Session A moves the booking to another calendar and deliberately holds the reminder-row
# lock through a two-second transaction. Session B starts during that lock and records the
# late provider receipt. R37 must make B wait, then read the committed calendar/generation.
"${PSQL[@]}" >"$session_a_output" 2>&1 <<SQL &
BEGIN;
SET LOCAL ROLE service_role;
SET LOCAL statement_timeout = '10s';
SELECT public.reschedule_booking_atomic(
  '$BOOKING_ID'::uuid,
  now() + interval '7 hours',
  now() + interval '7 hours 45 minutes',
  '$SERVICE_B'::uuid,
  '$CALENDAR_B'::uuid,
  NULL
);
SELECT pg_sleep(2);
COMMIT;
SQL
session_a_pid=$!

sleep 0.25
session_b_output="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SET statement_timeout = '10s';
BEGIN;
CREATE TEMP TABLE race_timer (started_at timestamptz NOT NULL) ON COMMIT DROP;
INSERT INTO race_timer VALUES (clock_timestamp());
SELECT attempt_count || '|' || status
FROM public.record_booking_reminder_result_v2(
  '$BOOKING_ID'::uuid, 1::smallint, '$schedule_generation'::uuid,
  '$claim_token'::uuid, true, 3, NULL, 'email', 'send',
  'cross-calendar-late-provider-receipt', '$delivery_key'
);
SELECT extract(epoch FROM clock_timestamp() - started_at)
FROM race_timer;
COMMIT;
SQL
)"
wait "$session_a_pid"

if ! grep -q '"ok": true' "$session_a_output"; then
  echo "REMINDER_CROSS_CALENDAR_RACE_RESCHEDULE_FAILED" >&2
  sed -n '1,80p' "$session_a_output" >&2
  exit 1
fi

result_line="$(printf '%s\n' "$session_b_output" | sed -n '1p')"
wait_seconds="$(printf '%s\n' "$session_b_output" | sed -n '2p')"
if [[ "$result_line" != "1|provider_accepted" ]]; then
  echo "REMINDER_CROSS_CALENDAR_RACE_RESULT_FAILED:$result_line" >&2
  exit 1
fi
if ! awk -v seconds="$wait_seconds" 'BEGIN { exit !(seconds >= 1.0) }'; then
  echo "REMINDER_CROSS_CALENDAR_RACE_DID_NOT_SERIALIZE:$wait_seconds" >&2
  exit 1
fi

final_state="$("${PSQL[@]}" <<SQL
SELECT
  booking.calendar_id::text || '|' ||
  reminder.status || '|' ||
  COALESCE(reminder.post_acceptance_state, '') || '|' ||
  COALESCE(reminder.provider_message_id, '') || '|' ||
  (reminder.provider_attempt_started_at IS NULL)::text
FROM public.bookings AS booking
JOIN public.booking_reminders_sent AS reminder ON reminder.booking_id = booking.id
WHERE booking.id = '$BOOKING_ID'::uuid
  AND reminder.schedule_generation = '$schedule_generation'::uuid;
SQL
)"

expected="$CALENDAR_B|provider_accepted|schedule_superseded|cross-calendar-late-provider-receipt|true"
if [[ "$final_state" != "$expected" ]]; then
  echo "REMINDER_CROSS_CALENDAR_RACE_FINAL_STATE_FAILED:$final_state" >&2
  exit 1
fi

# Reproduce the independent reconciliation race from the reviewer finding:
# provider accepted, the lease expired, a reschedule committed, reconciliation
# classified the old generation, and only then did the provider receipt arrive.
reconcile_claim="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT claim_token::text || '|' || schedule_generation::text
FROM public.claim_booking_reminder_v2('$BOOKING_RECONCILE_ID'::uuid, 1::smallint);
SQL
)"
IFS='|' read -r reconcile_claim_token reconcile_generation <<<"$reconcile_claim"
if [[ -z "${reconcile_claim_token:-}" || -z "${reconcile_generation:-}" ]]; then
  echo "REMINDER_RECONCILIATION_RACE_CLAIM_FAILED" >&2
  exit 1
fi

reconcile_delivery_key="booking-reminder/$BOOKING_RECONCILE_ID/1/email/$reconcile_generation"
reconcile_began="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT public.begin_booking_reminder_attempt_v2(
  '$BOOKING_RECONCILE_ID'::uuid, 1::smallint, '$reconcile_generation'::uuid,
  '$reconcile_claim_token'::uuid, 'email', 'send', '$reconcile_delivery_key'
);
SQL
)"
if [[ "$reconcile_began" != "t" ]]; then
  echo "REMINDER_RECONCILIATION_RACE_BEGIN_FAILED:$reconcile_began" >&2
  exit 1
fi

"${PSQL[@]}" <<SQL
UPDATE public.booking_reminders_sent
SET claim_expires_at = now() - interval '1 second'
WHERE booking_id = '$BOOKING_RECONCILE_ID'::uuid
  AND reminder_number = 1
  AND schedule_generation = '$reconcile_generation'::uuid;

SET ROLE service_role;
SELECT public.reschedule_booking_atomic(
  '$BOOKING_RECONCILE_ID'::uuid,
  now() + interval '9 hours',
  now() + interval '9 hours 45 minutes',
  '$SERVICE_B'::uuid,
  '$CALENDAR_B'::uuid,
  NULL
);
SQL

reconciled="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT public.reconcile_booking_reminders_v2();
SQL
)"
if [[ "$reconciled" != "1" ]]; then
  echo "REMINDER_RECONCILIATION_RACE_COUNT_FAILED:$reconciled" >&2
  exit 1
fi

interim_state="$("${PSQL[@]}" <<SQL
SELECT
  reminder.status || '|' ||
  (reminder.claim_token = '$reconcile_claim_token'::uuid)::text || '|' ||
  (reminder.provider_attempt_started_at IS NOT NULL)::text || '|' ||
  COALESCE(reminder.delivery_key, '') || '|' ||
  COALESCE(reminder.last_error_code, '')
FROM public.booking_reminders_sent AS reminder
WHERE reminder.booking_id = '$BOOKING_RECONCILE_ID'::uuid
  AND reminder.schedule_generation = '$reconcile_generation'::uuid;
SQL
)"
expected_interim="delivery_unknown|true|true|$reconcile_delivery_key|REMINDER_PROVIDER_RESULT_PENDING_AFTER_RECONCILIATION"
if [[ "$interim_state" != "$expected_interim" ]]; then
  echo "REMINDER_RECONCILIATION_RACE_FENCE_LOST:$interim_state" >&2
  exit 1
fi

# Reproduce the reviewer finding in its least favourable order. A negative
# result writer obtains the reminder-row lock first and holds it. The later
# authoritative provider receipt must wait, then upgrade the same row.
"${PSQL[@]}" >"$session_a_output" 2>&1 <<SQL &
BEGIN;
SET LOCAL ROLE service_role;
SET LOCAL statement_timeout = '10s';
SELECT attempt_count || '|' || status
FROM public.record_booking_reminder_result_v2(
  '$BOOKING_RECONCILE_ID'::uuid, 1::smallint, '$reconcile_generation'::uuid,
  '$reconcile_claim_token'::uuid, false, 3, 'email_send_failed', 'email', 'send',
  NULL, '$reconcile_delivery_key'
);
SELECT pg_sleep(2);
COMMIT;
SQL
negative_writer_pid=$!

sleep 0.25
late_result_output="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SET statement_timeout = '10s';
BEGIN;
CREATE TEMP TABLE late_result_timer (started_at timestamptz NOT NULL) ON COMMIT DROP;
INSERT INTO late_result_timer VALUES (clock_timestamp());
SELECT attempt_count || '|' || status
FROM public.record_booking_reminder_result_v2(
  '$BOOKING_RECONCILE_ID'::uuid, 1::smallint, '$reconcile_generation'::uuid,
  '$reconcile_claim_token'::uuid, true, 3, NULL, 'email', 'send',
  'post-reconciliation-late-provider-receipt', '$reconcile_delivery_key'
);
SELECT extract(epoch FROM clock_timestamp() - started_at)
FROM late_result_timer;
COMMIT;
SQL
)"
wait "$negative_writer_pid"

negative_result="$(sed -n '1p' "$session_a_output")"
late_result="$(printf '%s\n' "$late_result_output" | sed -n '1p')"
late_wait_seconds="$(printf '%s\n' "$late_result_output" | sed -n '2p')"
if [[ "$negative_result" != "1|superseded" ]]; then
  echo "REMINDER_RECONCILIATION_RACE_NEGATIVE_RESULT_FAILED:$negative_result" >&2
  exit 1
fi
if [[ "$late_result" != "1|provider_accepted" ]]; then
  echo "REMINDER_RECONCILIATION_RACE_LATE_RESULT_FAILED:$late_result" >&2
  exit 1
fi
if ! awk -v seconds="$late_wait_seconds" 'BEGIN { exit !(seconds >= 1.0) }'; then
  echo "REMINDER_RECONCILIATION_RACE_DID_NOT_SERIALIZE:$late_wait_seconds" >&2
  exit 1
fi

reconciled_final_state="$("${PSQL[@]}" <<SQL
SELECT
  booking.calendar_id::text || '|' ||
  reminder.status || '|' ||
  COALESCE(reminder.post_acceptance_state, '') || '|' ||
  COALESCE(reminder.provider_message_id, '') || '|' ||
  (reminder.claim_token IS NULL)::text || '|' ||
  (reminder.provider_attempt_started_at IS NULL)::text
FROM public.bookings AS booking
JOIN public.booking_reminders_sent AS reminder ON reminder.booking_id = booking.id
WHERE booking.id = '$BOOKING_RECONCILE_ID'::uuid
  AND reminder.schedule_generation = '$reconcile_generation'::uuid;
SQL
)"
expected_reconciled_final="$CALENDAR_B|provider_accepted|schedule_superseded|post-reconciliation-late-provider-receipt|true|true"
if [[ "$reconciled_final_state" != "$expected_reconciled_final" ]]; then
  echo "REMINDER_RECONCILIATION_RACE_FINAL_STATE_FAILED:$reconciled_final_state" >&2
  exit 1
fi

# An expired claim with a provider attempt can never be reclaimed for a second
# send. A negative result keeps the original provider-result fence until the
# bounded grace period is reconciled.
reclaim_claim="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT claim_token::text || '|' || schedule_generation::text
FROM public.claim_booking_reminder_v2('$BOOKING_RECLAIM_ID'::uuid, 1::smallint);
SQL
)"
IFS='|' read -r reclaim_claim_token reclaim_generation <<<"$reclaim_claim"
reclaim_delivery_key="booking-reminder/$BOOKING_RECLAIM_ID/1/email/$reclaim_generation"

"${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT public.begin_booking_reminder_attempt_v2(
  '$BOOKING_RECLAIM_ID'::uuid, 1::smallint, '$reclaim_generation'::uuid,
  '$reclaim_claim_token'::uuid, 'email', 'send', '$reclaim_delivery_key'
);
RESET ROLE;
UPDATE public.booking_reminders_sent
SET claim_expires_at = now() - interval '1 second'
WHERE booking_id = '$BOOKING_RECLAIM_ID'::uuid
  AND schedule_generation = '$reclaim_generation'::uuid;
SQL

reclaim_negative="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT attempt_count || '|' || status
FROM public.record_booking_reminder_result_v2(
  '$BOOKING_RECLAIM_ID'::uuid, 1::smallint, '$reclaim_generation'::uuid,
  '$reclaim_claim_token'::uuid, false, 3, 'email_send_failed', 'email', 'send',
  NULL, '$reclaim_delivery_key'
);
SQL
)"
if [[ "$reclaim_negative" != "1|pending" ]]; then
  echo "REMINDER_RECLAIM_NEGATIVE_RESULT_FAILED:$reclaim_negative" >&2
  exit 1
fi

reclaim_again_count="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT count(*) FROM public.claim_booking_reminder_v2(
  '$BOOKING_RECLAIM_ID'::uuid, 1::smallint
);
SQL
)"
if [[ "$reclaim_again_count" != "0" ]]; then
  echo "REMINDER_EXPIRED_PROVIDER_ATTEMPT_RECLAIMED:$reclaim_again_count" >&2
  exit 1
fi

reclaim_state="$("${PSQL[@]}" <<SQL
SELECT
  reminder.status || '|' ||
  (reminder.claim_token = '$reclaim_claim_token'::uuid)::text || '|' ||
  (reminder.provider_attempt_started_at IS NOT NULL)::text || '|' ||
  (reminder.claim_expires_at > now())::text || '|' ||
  COALESCE(reminder.last_error_code, '')
FROM public.booking_reminders_sent AS reminder
WHERE reminder.booking_id = '$BOOKING_RECLAIM_ID'::uuid
  AND reminder.schedule_generation = '$reclaim_generation'::uuid;
SQL
)"
expected_reclaim_state="pending|true|true|true|REMINDER_PROVIDER_RESULT_PENDING_AFTER_NEGATIVE_RESULT"
if [[ "$reclaim_state" != "$expected_reclaim_state" ]]; then
  echo "REMINDER_RECLAIM_FENCE_FAILED:$reclaim_state" >&2
  exit 1
fi

reclaim_expiry_before="$("${PSQL[@]}" <<SQL
SELECT extract(epoch FROM reminder.claim_expires_at)::text
FROM public.booking_reminders_sent AS reminder
WHERE reminder.booking_id = '$BOOKING_RECLAIM_ID'::uuid
  AND reminder.schedule_generation = '$reclaim_generation'::uuid;
SQL
)"

reclaim_duplicate="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT attempt_count || '|' || status
FROM public.record_booking_reminder_result_v2(
  '$BOOKING_RECLAIM_ID'::uuid, 1::smallint, '$reclaim_generation'::uuid,
  '$reclaim_claim_token'::uuid, false, 3, 'email_send_failed', 'email', 'send',
  NULL, '$reclaim_delivery_key'
);
SQL
)"
if [[ "$reclaim_duplicate" != "1|pending" ]]; then
  echo "REMINDER_RECLAIM_DUPLICATE_RESULT_FAILED:$reclaim_duplicate" >&2
  exit 1
fi

reclaim_expiry_after="$("${PSQL[@]}" <<SQL
SELECT extract(epoch FROM reminder.claim_expires_at)::text
FROM public.booking_reminders_sent AS reminder
WHERE reminder.booking_id = '$BOOKING_RECLAIM_ID'::uuid
  AND reminder.schedule_generation = '$reclaim_generation'::uuid;
SQL
)"
if [[ "$reclaim_expiry_after" != "$reclaim_expiry_before" ]]; then
  echo "REMINDER_DUPLICATE_NEGATIVE_EXTENDED_GRACE:$reclaim_expiry_before:$reclaim_expiry_after" >&2
  exit 1
fi

"${PSQL[@]}" <<SQL
UPDATE public.booking_reminders_sent
SET claim_expires_at = now() - interval '1 second'
WHERE booking_id = '$BOOKING_RECLAIM_ID'::uuid
  AND schedule_generation = '$reclaim_generation'::uuid;
SQL

reclaim_reconciled="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT public.reconcile_booking_reminders_v2();
SQL
)"
if [[ "$reclaim_reconciled" != "1" ]]; then
  echo "REMINDER_RECLAIM_GRACE_RECONCILE_FAILED:$reclaim_reconciled" >&2
  exit 1
fi

reclaim_closed_state="$("${PSQL[@]}" <<SQL
SELECT
  reminder.status || '|' ||
  (reminder.claim_token IS NULL)::text || '|' ||
  (reminder.provider_attempt_started_at IS NULL)::text || '|' ||
  COALESCE(reminder.last_error_code, '')
FROM public.booking_reminders_sent AS reminder
WHERE reminder.booking_id = '$BOOKING_RECLAIM_ID'::uuid
  AND reminder.schedule_generation = '$reclaim_generation'::uuid;
SQL
)"
expected_reclaim_closed_state="delivery_unknown|true|true|REMINDER_PROVIDER_RESULT_UNRESOLVED_AFTER_GRACE"
if [[ "$reclaim_closed_state" != "$expected_reclaim_closed_state" ]]; then
  echo "REMINDER_RECLAIM_GRACE_RELEASE_FAILED:$reclaim_closed_state" >&2
  exit 1
fi

# A terminal negative result retains the fence only for a bounded grace period.
# Once that period expires, reconciliation releases deletion without retrying.
terminal_claim="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT claim_token::text || '|' || schedule_generation::text
FROM public.claim_booking_reminder_v2('$BOOKING_TERMINAL_ID'::uuid, 1::smallint);
SQL
)"
IFS='|' read -r terminal_claim_token terminal_generation <<<"$terminal_claim"
terminal_delivery_key="booking-reminder/$BOOKING_TERMINAL_ID/1/email/$terminal_generation"

"${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT public.begin_booking_reminder_attempt_v2(
  '$BOOKING_TERMINAL_ID'::uuid, 1::smallint, '$terminal_generation'::uuid,
  '$terminal_claim_token'::uuid, 'email', 'send', '$terminal_delivery_key'
);
RESET ROLE;
UPDATE public.booking_reminders_sent
SET claim_expires_at = now() - interval '1 second'
WHERE booking_id = '$BOOKING_TERMINAL_ID'::uuid
  AND schedule_generation = '$terminal_generation'::uuid;
SQL

terminal_negative="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT attempt_count || '|' || status
FROM public.record_booking_reminder_result_v2(
  '$BOOKING_TERMINAL_ID'::uuid, 1::smallint, '$terminal_generation'::uuid,
  '$terminal_claim_token'::uuid, false, 1, 'email_send_failed', 'email', 'send',
  NULL, '$terminal_delivery_key'
);
SQL
)"
if [[ "$terminal_negative" != "1|email_send_failed" ]]; then
  echo "REMINDER_TERMINAL_NEGATIVE_RESULT_FAILED:$terminal_negative" >&2
  exit 1
fi

"${PSQL[@]}" <<SQL
UPDATE public.booking_reminders_sent
SET claim_expires_at = now() - interval '1 second'
WHERE booking_id = '$BOOKING_TERMINAL_ID'::uuid
  AND schedule_generation = '$terminal_generation'::uuid;
SQL

terminal_reconciled="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
SELECT public.reconcile_booking_reminders_v2();
SQL
)"
if [[ "$terminal_reconciled" != "1" ]]; then
  echo "REMINDER_TERMINAL_GRACE_RECONCILE_FAILED:$terminal_reconciled" >&2
  exit 1
fi

terminal_state="$("${PSQL[@]}" <<SQL
SELECT
  reminder.status || '|' ||
  (reminder.claim_token IS NULL)::text || '|' ||
  (reminder.provider_attempt_started_at IS NULL)::text || '|' ||
  COALESCE(reminder.last_error_code, '')
FROM public.booking_reminders_sent AS reminder
WHERE reminder.booking_id = '$BOOKING_TERMINAL_ID'::uuid
  AND reminder.schedule_generation = '$terminal_generation'::uuid;
SQL
)"
expected_terminal_state="email_send_failed|true|true|REMINDER_PROVIDER_RESULT_UNRESOLVED_AFTER_GRACE"
if [[ "$terminal_state" != "$expected_terminal_state" ]]; then
  echo "REMINDER_TERMINAL_GRACE_RELEASE_FAILED:$terminal_state" >&2
  exit 1
fi

terminal_delete_count="$("${PSQL[@]}" <<SQL
SET ROLE service_role;
DELETE FROM public.bookings
WHERE id = '$BOOKING_TERMINAL_ID'::uuid;
SELECT count(*) FROM public.bookings
WHERE id = '$BOOKING_TERMINAL_ID'::uuid;
SQL
)"
if [[ "$terminal_delete_count" != "0" ]]; then
  echo "REMINDER_TERMINAL_DELETE_STILL_BLOCKED:$terminal_delete_count" >&2
  exit 1
fi

printf 'REMINDER_CROSS_CALENDAR_RACE_CONTRACT_PASS|reschedule_wait_seconds=%s|result_wait_seconds=%s\n' \
  "$wait_seconds" "$late_wait_seconds"
