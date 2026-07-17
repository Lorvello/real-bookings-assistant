#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$SCRIPT_DIR/grants_check.sh"
BASELINE="$SCRIPT_DIR/grants_baseline.json"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/grants-check-test.XXXXXX")"
trap 'rm -rf "$TMP_ROOT"' EXIT

mkdir -p "$TMP_ROOT/bin" "$TMP_ROOT/home/.config/ba"
printf 'fixture-only-token\n' > "$TMP_ROOT/home/.config/ba/supabase.pat"

cat > "$TMP_ROOT/bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
: "${BA_GRANTS_FIXTURE:?BA_GRANTS_FIXTURE is required}"
exec /bin/cat "$BA_GRANTS_FIXTURE"
EOF
chmod +x "$TMP_ROOT/bin/curl"

OVERLOAD_FIXTURE="$TMP_ROOT/new-default-public-overload.json"
NARROWED_FIXTURE="$TMP_ROOT/missing-service-role-grant.json"
INVOKER_FIXTURE="$TMP_ROOT/security-invoker-drift.json"
python3 - "$BASELINE" "$OVERLOAD_FIXTURE" <<'PY'
import json
import sys

baseline_path, fixture_path = sys.argv[1:]
with open(baseline_path) as source:
    rows = json.load(source)

rows.append(
    {
        "anon_exec": True,
        "args": "p_booking_id uuid, p_reminder_number smallint, p_test_mode boolean",
        "authenticated_exec": True,
        "function_name": "claim_booking_reminder",
        "security_definer": True,
        "service_role_exec": True,
    }
)

with open(fixture_path, "w") as fixture:
    json.dump(rows, fixture)
PY

python3 - "$BASELINE" "$INVOKER_FIXTURE" <<'PY'
import json
import sys

baseline_path, fixture_path = sys.argv[1:]
with open(baseline_path) as source:
    rows = json.load(source)

target = next(
    row for row in rows
    if row["function_name"] == "finalize_booking_payment_success_v2"
)
target["security_definer"] = False

with open(fixture_path, "w") as fixture:
    json.dump(rows, fixture)
PY

python3 - "$BASELINE" "$NARROWED_FIXTURE" <<'PY'
import json
import sys

baseline_path, fixture_path = sys.argv[1:]
with open(baseline_path) as source:
    rows = json.load(source)

target = next(
    row for row in rows
    if row["function_name"] == "finalize_booking_payment_success_v2"
)
target["service_role_exec"] = False

with open(fixture_path, "w") as fixture:
    json.dump(rows, fixture)
PY

RUN_STATUS=0
RUN_OUTPUT=""

run_check() {
  local fixture="$1"

  set +e
  RUN_OUTPUT="$(
    HOME="$TMP_ROOT/home" \
      PATH="$TMP_ROOT/bin:/usr/bin:/bin" \
      BA_GRANTS_TARGET=remote \
      BA_GRANTS_FIXTURE="$fixture" \
      "$GATE" check 2>&1
  )"
  RUN_STATUS=$?
  set -e
}

failures=0

run_check "$BASELINE"
if [ "$RUN_STATUS" -eq 0 ] && [[ "$RUN_OUTPUT" == *"RESULT: PASS, no drift, current state matches baseline exactly"* ]]; then
  echo "PASS: exact existing baseline is accepted"
else
  echo "FAIL: exact existing baseline was not accepted" >&2
  printf '%s\n' "$RUN_OUTPUT" >&2
  failures=$((failures + 1))
fi

run_check "$OVERLOAD_FIXTURE"
if [ "$RUN_STATUS" -eq 1 ] \
  && [[ "$RUN_OUTPUT" == *"claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint, p_test_mode boolean)"* ]] \
  && [[ "$RUN_OUTPUT" == *"RESULT: FAIL"* ]]; then
  echo "PASS: newly added default-PUBLIC SECURITY DEFINER overload is rejected"
else
  echo "FAIL: newly added default-PUBLIC SECURITY DEFINER overload was accepted" >&2
  printf '%s\n' "$RUN_OUTPUT" >&2
  failures=$((failures + 1))
fi

run_check "$NARROWED_FIXTURE"
if [ "$RUN_STATUS" -eq 1 ] \
  && [[ "$RUN_OUTPUT" == *"finalize_booking_payment_success_v2"* ]] \
  && [[ "$RUN_OUTPUT" == *"required grants NARROWED"* ]] \
  && [[ "$RUN_OUTPUT" == *"RESULT: FAIL"* ]]; then
  echo "PASS: missing active settlement service-role grant is rejected"
else
  echo "FAIL: missing active settlement service-role grant was accepted" >&2
  printf '%s\n' "$RUN_OUTPUT" >&2
  failures=$((failures + 1))
fi

run_check "$INVOKER_FIXTURE"
if [ "$RUN_STATUS" -eq 1 ] \
  && [[ "$RUN_OUTPUT" == *"finalize_booking_payment_success_v2"* ]] \
  && [[ "$RUN_OUTPUT" == *"security mode CHANGED"* ]] \
  && [[ "$RUN_OUTPUT" == *"RESULT: FAIL"* ]]; then
  echo "PASS: SECURITY DEFINER to SECURITY INVOKER drift is rejected"
else
  echo "FAIL: SECURITY DEFINER to SECURITY INVOKER drift was accepted" >&2
  printf '%s\n' "$RUN_OUTPUT" >&2
  failures=$((failures + 1))
fi

if [ "$failures" -ne 0 ]; then
  exit 1
fi

echo "PASS: grants gate fixture tests"
