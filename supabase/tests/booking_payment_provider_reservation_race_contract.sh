#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase_db_grdgjhkygzciwwrxgvgy}"
PSQL=(docker exec -i "$DB_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres)

OWNER_ID="48100000-0000-4000-8000-000000000001"
CALENDAR_ID="48100000-0000-4000-8000-000000000010"
SERVICE_ID="48100000-0000-4000-8000-000000000020"
BOOKING_ID="48100000-0000-4000-8000-000000000101"
WEB_FINGERPRINT="$(printf 'd%.0s' {1..64})"
WHATSAPP_FINGERPRINT="$(printf 'e%.0s' {1..64})"

session_a_output="$(mktemp)"
session_b_output="$(mktemp)"
cleanup() {
  rm -f "$session_a_output" "$session_b_output"
  "${PSQL[@]}" >/dev/null <<SQL
DELETE FROM public.booking_payment_provider_cleanup_jobs WHERE booking_id = '$BOOKING_ID'::uuid;
DELETE FROM public.booking_payment_provider_reservations WHERE booking_id = '$BOOKING_ID'::uuid;
DELETE FROM public.bookings WHERE id = '$BOOKING_ID'::uuid;
DELETE FROM public.service_types WHERE id = '$SERVICE_ID'::uuid;
DELETE FROM public.business_stripe_accounts WHERE account_owner_id = '$OWNER_ID'::uuid;
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
  '$OWNER_ID'::uuid, 'r48-provider-race@example.invalid',
  'authenticated', 'authenticated', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"R48 Provider Race"}'::jsonb, now(), now()
);
INSERT INTO public.calendars (id, user_id, name, slug, is_active, timezone)
VALUES (
  '$CALENDAR_ID'::uuid, '$OWNER_ID'::uuid, 'R48 Provider Race',
  'r48-provider-race', true, 'Europe/Amsterdam'
);
INSERT INTO public.business_stripe_accounts (
  calendar_id, user_id, account_owner_id, stripe_account_id,
  platform_account_id, environment, account_status,
  onboarding_completed, charges_enabled, payouts_enabled
) VALUES (
  '$CALENDAR_ID'::uuid, '$OWNER_ID'::uuid, '$OWNER_ID'::uuid,
  'acct_test_r48_race', 'acct_platform_test_r48_race', 'test',
  'active', true, true, true
);
INSERT INTO public.service_types (
  id, calendar_id, name, duration, price, is_active, business_country,
  tax_enabled, tax_behavior, applicable_tax_rate, supply_type
) VALUES (
  '$SERVICE_ID'::uuid, '$CALENDAR_ID'::uuid, 'R48 Race Service',
  60, 100.00, true, 'NL', false, 'exclusive', 0, 'in_person'
);
INSERT INTO public.bookings (
  id, calendar_id, service_type_id, customer_name, customer_email,
  customer_phone, start_time, end_time, status, total_price,
  total_amount_cents, payment_currency, payment_status, payment_required,
  payment_timing, service_name, booking_duration
) VALUES (
  '$BOOKING_ID'::uuid, '$CALENDAR_ID'::uuid, '$SERVICE_ID'::uuid,
  'Race Customer', 'r48-race-customer@example.invalid', '+31610000201',
  now() + interval '25 days', now() + interval '25 days 1 hour',
  'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
  'R48 Race Service', 60
);
SQL

# Session A owns the booking row and holds it. Session B must block on the same
# booking lock, then observe A's committed web authority and return conflict.
"${PSQL[@]}" >"$session_a_output" 2>&1 <<SQL &
BEGIN;
SET LOCAL statement_timeout = '10s';
SELECT public.claim_booking_payment_provider_reservation(
  '$BOOKING_ID'::uuid, 'web', 'payment_intent', 10000, 10000,
  'eur', 'test', 'acct_test_r48_race', 'acct_platform_test_r48_race',
  NULL, '$WEB_FINGERPRINT', 120
)->>'outcome';
SELECT pg_sleep(2);
COMMIT;
SQL
session_a_pid=$!

sleep 0.25
"${PSQL[@]}" >"$session_b_output" <<SQL
SET statement_timeout = '10s';
BEGIN;
CREATE TEMP TABLE race_timer (started_at timestamptz NOT NULL) ON COMMIT DROP;
INSERT INTO race_timer VALUES (clock_timestamp());
SELECT (
  public.claim_booking_payment_provider_reservation(
    '$BOOKING_ID'::uuid, 'whatsapp', 'checkout_session', 10000, 10000,
    'eur', 'test', 'acct_test_r48_race', 'acct_platform_test_r48_race',
    NULL, '$WHATSAPP_FINGERPRINT', 120
  )->>'outcome'
) || '|' || extract(epoch FROM clock_timestamp() - started_at)
FROM race_timer;
COMMIT;
SQL

if ! wait "$session_a_pid"; then
  echo "BOOKING_PROVIDER_RACE_SESSION_A_FAILED" >&2
  sed -n '1,80p' "$session_a_output" >&2
  exit 1
fi

session_a_claim="$(sed -n '1p' "$session_a_output")"
result="$(sed -n '1p' "$session_b_output")"
outcome="${result%%|*}"
wait_seconds="${result#*|}"
if [[ "$session_a_claim" != "claimed" ]]; then
  echo "BOOKING_PROVIDER_RACE_WEB_DID_NOT_CLAIM:$session_a_claim" >&2
  exit 1
fi
if [[ "$outcome" != "conflict" ]]; then
  echo "BOOKING_PROVIDER_RACE_CROSS_CHANNEL_NOT_CLOSED:$result" >&2
  exit 1
fi
if ! awk -v seconds="$wait_seconds" 'BEGIN { exit !(seconds >= 1.0) }'; then
  echo "BOOKING_PROVIDER_RACE_DID_NOT_SERIALIZE:$wait_seconds" >&2
  exit 1
fi

authority="$("${PSQL[@]}" <<SQL
SELECT count(*)::text || '|' || min(channel)
FROM public.booking_payment_provider_reservations
WHERE booking_id = '$BOOKING_ID'::uuid
  AND state IN ('claimed', 'provider_created', 'cleanup_pending');
SQL
)"
if [[ "$authority" != "1|web" ]]; then
  echo "BOOKING_PROVIDER_RACE_AUTHORITY_CORRUPT:$authority" >&2
  exit 1
fi

echo "BOOKING_PAYMENT_PROVIDER_RESERVATION_RACE_PASS|wait_seconds=$wait_seconds"
