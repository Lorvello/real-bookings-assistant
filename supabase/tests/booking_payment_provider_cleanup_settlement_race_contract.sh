#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase_db_grdgjhkygzciwwrxgvgy}"
PSQL=(docker exec -i "$DB_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d postgres)

OWNER_ID="48300000-0000-4000-8000-000000000001"
CALENDAR_ID="48300000-0000-4000-8000-000000000010"
SERVICE_ID="48300000-0000-4000-8000-000000000020"
BOOKING_ID="48300000-0000-4000-8000-000000000101"
FINGERPRINT="$(printf '7%.0s' {1..64})"

session_a_output="$(mktemp)"
session_b_output="$(mktemp)"
cleanup() {
  rm -f "$session_a_output" "$session_b_output"
  "${PSQL[@]}" >/dev/null <<SQL
DROP TRIGGER IF EXISTS r48_test_delay_cleanup_insert
  ON public.booking_payment_provider_cleanup_jobs;
DROP FUNCTION IF EXISTS public.r48_test_delay_cleanup_insert();
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
  '$OWNER_ID'::uuid, 'r48-cleanup-settlement-race@example.invalid',
  'authenticated', 'authenticated', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"R48 Cleanup Settlement Race"}'::jsonb, now(), now()
);
INSERT INTO public.calendars (id, user_id, name, slug, is_active, timezone)
VALUES (
  '$CALENDAR_ID'::uuid, '$OWNER_ID'::uuid, 'R48 Cleanup Settlement Race',
  'r48-cleanup-settlement-race', true, 'Europe/Amsterdam'
);
INSERT INTO public.business_stripe_accounts (
  calendar_id, user_id, account_owner_id, stripe_account_id,
  platform_account_id, environment, account_status,
  onboarding_completed, charges_enabled, payouts_enabled
) VALUES (
  '$CALENDAR_ID'::uuid, '$OWNER_ID'::uuid, '$OWNER_ID'::uuid,
  'acct_test_r48_cleanup_race', 'acct_platform_test_r48_cleanup_race',
  'test', 'active', true, true, true
);
INSERT INTO public.service_types (
  id, calendar_id, name, duration, price, is_active, business_country,
  tax_enabled, tax_behavior, applicable_tax_rate, supply_type
) VALUES (
  '$SERVICE_ID'::uuid, '$CALENDAR_ID'::uuid, 'R48 Cleanup Race Service',
  60, 100.00, true, 'NL', false, 'exclusive', 0, 'in_person'
);
INSERT INTO public.bookings (
  id, calendar_id, service_type_id, customer_name, customer_email,
  customer_phone, start_time, end_time, status, total_price,
  total_amount_cents, payment_currency, payment_status, payment_required,
  payment_timing, service_name, booking_duration
) VALUES (
  '$BOOKING_ID'::uuid, '$CALENDAR_ID'::uuid, '$SERVICE_ID'::uuid,
  'Cleanup Race Customer', 'r48-cleanup-race@example.invalid', '+31610000401',
  now() + interval '36 days', now() + interval '36 days 1 hour',
  'pending', 100.00, 10000, 'eur', 'none', true, 'pay_now',
  'R48 Cleanup Race Service', 60
);
DO \$setup\$
DECLARE
  v_claim jsonb;
  v_result jsonb;
BEGIN
  v_claim := public.claim_booking_payment_provider_reservation(
    '$BOOKING_ID'::uuid, 'whatsapp', 'checkout_session', 10000, 10000,
    'eur', 'test', 'acct_test_r48_cleanup_race',
    'acct_platform_test_r48_cleanup_race', NULL, '$FINGERPRINT', 120
  );
  v_result := public.finalize_booking_payment_provider_reservation(
    '$BOOKING_ID'::uuid, (v_claim->>'reservation_id')::uuid,
    (v_claim->>'claim_token')::uuid, (v_claim->>'generation')::integer,
    '$FINGERPRINT', 'test', 'cs_test_r48_cleanup_race',
    'https://checkout.stripe.test/r48-cleanup-race',
    now() + interval '30 minutes'
  );
  IF v_result->>'outcome' <> 'created' THEN
    RAISE EXCEPTION 'R48_CLEANUP_RACE_PROVIDER_FINALIZE_FAILED:%', v_result;
  END IF;
END;
\$setup\$;
SQL

# Force require_cleanup to pause after taking its locks but before the cleanup
# insert's booking FK check. With the old reservation -> booking order, a real
# settlement takes booking -> reservation and PostgreSQL detects a deadlock.
"${PSQL[@]}" <<SQL
CREATE OR REPLACE FUNCTION public.r48_test_delay_cleanup_insert()
RETURNS trigger
LANGUAGE plpgsql
AS \$function\$
BEGIN
  PERFORM pg_sleep(2);
  RETURN NEW;
END;
\$function\$;
CREATE TRIGGER r48_test_delay_cleanup_insert
BEFORE INSERT ON public.booking_payment_provider_cleanup_jobs
FOR EACH ROW EXECUTE FUNCTION public.r48_test_delay_cleanup_insert();
SQL

"${PSQL[@]}" >"$session_a_output" 2>&1 <<SQL &
BEGIN;
SET LOCAL statement_timeout = '10s';
SELECT public.require_booking_payment_provider_cleanup(
  '$BOOKING_ID'::uuid,
  (
    SELECT id FROM public.booking_payment_provider_reservations
    WHERE booking_id = '$BOOKING_ID'::uuid AND generation = 1
  ),
  1, '$FINGERPRINT', 'cs_test_r48_cleanup_race',
  'R48_REQUIRE_SETTLEMENT_LOCK_ORDER'
)->>'outcome';
COMMIT;
SQL
require_pid=$!

sleep 0.25
"${PSQL[@]}" >"$session_b_output" <<SQL
SET statement_timeout = '10s';
BEGIN;
CREATE TEMP TABLE race_timer (started_at timestamptz NOT NULL) ON COMMIT DROP;
INSERT INTO race_timer VALUES (clock_timestamp());
SELECT (
  public.authorize_booking_payment_provider_settlement(
    '$BOOKING_ID'::uuid, 'checkout_session', 'cs_test_r48_cleanup_race',
    1, '$FINGERPRINT', 'pi_test_r48_require_race', 10000,
    'eur', 'test', 'acct_test_r48_cleanup_race'
  )->>'outcome'
) || '|' || extract(epoch FROM clock_timestamp() - started_at)
FROM race_timer;
COMMIT;
SQL

if ! wait "$require_pid"; then
  echo "BOOKING_PROVIDER_REQUIRE_CLEANUP_LOCK_ORDER_SESSION_FAILED" >&2
  sed -n '1,80p' "$session_a_output" >&2
  exit 1
fi

require_outcome="$(sed -n '1p' "$session_a_output")"
settlement_result="$(sed -n '1p' "$session_b_output")"
settlement_outcome="${settlement_result%%|*}"
require_wait_seconds="${settlement_result#*|}"
if [[ "$require_outcome" != "queued" || "$settlement_outcome" != "authorized" ]]; then
  echo "BOOKING_PROVIDER_REQUIRE_CLEANUP_LOCK_ORDER_BAD_RESULT:$require_outcome:$settlement_result" >&2
  exit 1
fi
if ! awk -v seconds="$require_wait_seconds" 'BEGIN { exit !(seconds >= 1.0) }'; then
  echo "BOOKING_PROVIDER_REQUIRE_CLEANUP_LOCK_ORDER_DID_NOT_SERIALIZE:$require_wait_seconds" >&2
  exit 1
fi

"${PSQL[@]}" <<SQL
DROP TRIGGER r48_test_delay_cleanup_insert
  ON public.booking_payment_provider_cleanup_jobs;
DROP FUNCTION public.r48_test_delay_cleanup_insert();
DELETE FROM public.booking_payment_provider_cleanup_jobs
WHERE booking_id = '$BOOKING_ID'::uuid;
UPDATE public.booking_payment_provider_reservations
SET state = 'provider_created', settlement_payment_intent_id = NULL
WHERE booking_id = '$BOOKING_ID'::uuid AND generation = 1;
DO \$requeue\$
DECLARE
  v_reservation_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_reservation_id
  FROM public.booking_payment_provider_reservations
  WHERE booking_id = '$BOOKING_ID'::uuid AND generation = 1;
  v_result := public.require_booking_payment_provider_cleanup(
    '$BOOKING_ID'::uuid, v_reservation_id, 1, '$FINGERPRINT',
    'cs_test_r48_cleanup_race', 'R48_CLEANUP_SETTLEMENT_RACE'
  );
  IF v_result->>'outcome' <> 'queued' THEN
    RAISE EXCEPTION 'R48_CLEANUP_RACE_REQUEUE_FAILED:%', v_result;
  END IF;
END;
\$requeue\$;
SQL

claim_identity="$("${PSQL[@]}" <<SQL
SELECT job_id::text || '|' || claim_token::text
FROM public.claim_booking_payment_provider_cleanup(1, 120);
SQL
)"
JOB_ID="${claim_identity%%|*}"
CLAIM_TOKEN="${claim_identity#*|}"
if [[ -z "$JOB_ID" || -z "$CLAIM_TOKEN" || "$JOB_ID" == "$CLAIM_TOKEN" ]]; then
  echo "BOOKING_PROVIDER_CLEANUP_RACE_CLAIM_FAILED:$claim_identity" >&2
  exit 1
fi

# Session A holds the canonical booking -> reservation -> cleanup-job lock chain.
# Settlement must wait at the booking lock, then return in_progress rather than deadlock.
"${PSQL[@]}" >"$session_a_output" 2>&1 <<SQL &
BEGIN;
SET LOCAL statement_timeout = '10s';
SELECT public.verify_booking_payment_provider_cleanup_claim(
  '$JOB_ID'::uuid, '$CLAIM_TOKEN'::uuid
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
  public.authorize_booking_payment_provider_settlement(
    '$BOOKING_ID'::uuid, 'checkout_session', 'cs_test_r48_cleanup_race',
    1, '$FINGERPRINT', 'pi_test_r48_cleanup_race', 10000,
    'eur', 'test', 'acct_test_r48_cleanup_race'
  )->>'outcome'
) || '|' || extract(epoch FROM clock_timestamp() - started_at)
FROM race_timer;
COMMIT;
SQL

if ! wait "$session_a_pid"; then
  echo "BOOKING_PROVIDER_CLEANUP_RACE_SESSION_A_FAILED" >&2
  sed -n '1,80p' "$session_a_output" >&2
  exit 1
fi

session_a_fence="$(sed -n '1p' "$session_a_output")"
result="$(sed -n '1p' "$session_b_output")"
outcome="${result%%|*}"
wait_seconds="${result#*|}"
if [[ "$session_a_fence" != "authorized" ]]; then
  echo "BOOKING_PROVIDER_CLEANUP_RACE_FENCE_FAILED:$session_a_fence" >&2
  exit 1
fi
if [[ "$outcome" != "in_progress" ]]; then
  echo "BOOKING_PROVIDER_CLEANUP_RACE_SETTLEMENT_NOT_FENCED:$result" >&2
  exit 1
fi
if ! awk -v seconds="$wait_seconds" 'BEGIN { exit !(seconds >= 1.0) }'; then
  echo "BOOKING_PROVIDER_CLEANUP_RACE_DID_NOT_SERIALIZE:$wait_seconds" >&2
  exit 1
fi

echo "BOOKING_PAYMENT_PROVIDER_CLEANUP_SETTLEMENT_RACE_PASS|wait_seconds=$wait_seconds"
