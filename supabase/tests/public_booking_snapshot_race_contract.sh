#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase_db_grdgjhkygzciwwrxgvgy}"
PSQL=(docker exec -i "$DB_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres)

OWNER_ID="45100000-0000-4000-8000-000000000001"
CALENDAR_ID="45100000-0000-4000-8000-000000000010"
SERVICE_ID="45100000-0000-4000-8000-000000000020"
SLUG="public-booking-race-contract"

session_a_output="$(mktemp)"
session_b_output_file="$(mktemp)"
final_state_file="$(mktemp)"
cleanup() {
  rm -f "$session_a_output" "$session_b_output_file" "$final_state_file"
  "${PSQL[@]}" >/dev/null <<SQL
DELETE FROM public.bookings WHERE calendar_id = '$CALENDAR_ID'::uuid;
DELETE FROM public.service_types WHERE id = '$SERVICE_ID'::uuid;
DELETE FROM public.calendars WHERE id = '$CALENDAR_ID'::uuid;
DELETE FROM auth.users WHERE id = '$OWNER_ID'::uuid;
SQL
}
trap cleanup EXIT
cleanup

"${PSQL[@]}" <<SQL
INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '$OWNER_ID'::uuid, 'public-booking-race@example.invalid',
  'authenticated', 'authenticated', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Public Booking Race Owner"}'::jsonb, now(), now()
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active, timezone)
VALUES (
  '$CALENDAR_ID'::uuid, '$OWNER_ID'::uuid,
  'Public Booking Race Contract', '$SLUG', true, 'Europe/Amsterdam'
);

UPDATE public.calendar_settings
SET minimum_notice_hours = 0,
    booking_window_days = 60,
    buffer_time = 0,
    max_bookings_per_day = NULL
WHERE calendar_id = '$CALENDAR_ID'::uuid;

INSERT INTO public.service_types (
  id, calendar_id, name, duration, price, is_active, business_country,
  tax_enabled, tax_code, tax_behavior, applicable_tax_rate, supply_type
) VALUES (
  '$SERVICE_ID'::uuid, '$CALENDAR_ID'::uuid,
  'Race Service', 60, 89.95, true, 'NL', true,
  'txcd_20030000', 'exclusive', 21, 'in_person'
);

UPDATE public.payment_settings
SET secure_payments_enabled = true,
    payment_required_for_booking = true,
    payment_optional = false,
    enabled_payment_methods = '["ideal","card"]'::jsonb,
    allowed_payment_timing = '["pay_now"]'::jsonb,
    payout_option = 'standard',
    payment_deadline_hours = 24,
    auto_cancel_unpaid_bookings = true
WHERE calendar_id = '$CALENDAR_ID'::uuid;

WITH schedule AS (
  INSERT INTO public.availability_schedules (calendar_id, name, is_default)
  VALUES ('$CALENDAR_ID'::uuid, 'Race schedule', true)
  RETURNING id
)
INSERT INTO public.availability_rules (
  schedule_id, day_of_week, start_time, end_time, is_available
)
SELECT
  id,
  extract(isodow FROM current_date + (8 - extract(isodow FROM current_date)::integer))::integer,
  time '09:00',
  time '17:00',
  true
FROM schedule;
SQL

# Session A changes every amount/policy input in one transaction and holds the
# authoritative rows. Session B must wait, then snapshot the fully committed
# new version; it may never mix old price/tax with new payment settings.
"${PSQL[@]}" >"$session_a_output" 2>&1 <<SQL &
BEGIN;
SET LOCAL statement_timeout = '10s';
UPDATE public.service_types
SET price = 100.00,
    applicable_tax_rate = 9,
    tax_behavior = 'exclusive',
    tax_enabled = true
WHERE id = '$SERVICE_ID'::uuid;
UPDATE public.payment_settings
SET payment_required_for_booking = false,
    payment_optional = true,
    enabled_payment_methods = '["card"]'::jsonb,
    allowed_payment_timing = '["pay_now","pay_on_site"]'::jsonb
WHERE calendar_id = '$CALENDAR_ID'::uuid;
SELECT pg_sleep(2);
COMMIT;
SQL
session_a_pid=$!

sleep 0.25
"${PSQL[@]}" >"$session_b_output_file" <<SQL
SET ROLE service_role;
SET statement_timeout = '10s';
BEGIN;
CREATE TEMP TABLE race_timer (started_at timestamptz NOT NULL) ON COMMIT DROP;
INSERT INTO race_timer VALUES (clock_timestamp());
WITH committed AS (
  SELECT public.commit_public_booking(
    '$SLUG',
    '$SERVICE_ID'::uuid,
    (
      current_date + (8 - extract(isodow FROM current_date)::integer)
      + time '10:00'
    ) AT TIME ZONE 'Europe/Amsterdam',
    'Race Customer',
    'race-customer@example.invalid',
    '+31612345999',
    NULL,
    'NL',
    NULL,
    'en'
  ) AS payload
)
SELECT payload->>'success' || '|' || (payload #>> '{booking,id}') FROM committed;
SELECT extract(epoch FROM clock_timestamp() - started_at) FROM race_timer;
COMMIT;
SQL
session_b_output="$(sed -n '1,20p' "$session_b_output_file")"

if ! wait "$session_a_pid"; then
  echo "PUBLIC_BOOKING_SNAPSHOT_RACE_MUTATION_FAILED" >&2
  sed -n '1,80p' "$session_a_output" >&2
  exit 1
fi

result_line="$(printf '%s\n' "$session_b_output" | sed -n '1p')"
wait_seconds="$(printf '%s\n' "$session_b_output" | sed -n '2p')"
if [[ "$result_line" != true\|* ]]; then
  echo "PUBLIC_BOOKING_SNAPSHOT_RACE_COMMIT_FAILED:$result_line" >&2
  exit 1
fi
booking_id="${result_line#true|}"
if ! awk -v seconds="$wait_seconds" 'BEGIN { exit !(seconds >= 1.0) }'; then
  echo "PUBLIC_BOOKING_SNAPSHOT_RACE_DID_NOT_SERIALIZE:$wait_seconds" >&2
  exit 1
fi

"${PSQL[@]}" >"$final_state_file" <<SQL
SELECT
  booking.total_price::text || '|' ||
  booking.total_amount_cents::text || '|' ||
  (booking.public_booking_policy_snapshot #>> '{tax,applicable_tax_rate}') || '|' ||
  (booking.public_booking_policy_snapshot ->> 'payment_required') || '|' ||
  (booking.public_booking_policy_snapshot ->> 'payment_optional') || '|' ||
  (booking.public_booking_policy_snapshot -> 'enabled_payment_methods')::text
FROM public.bookings AS booking
WHERE booking.id = '$booking_id'::uuid;
SQL
final_state="$(sed -n '1,5p' "$final_state_file")"

if [[ "$final_state" != '100.00|10000|9|false|true|["card"]' ]]; then
  echo "PUBLIC_BOOKING_SNAPSHOT_RACE_TORN_SNAPSHOT:$final_state" >&2
  exit 1
fi

echo "PUBLIC_BOOKING_SNAPSHOT_RACE_CONTRACT_PASS|wait_seconds=$wait_seconds"
