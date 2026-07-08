#!/usr/bin/env bash
# grants_check.sh: standing grants/permissions-diff check for sensitive Postgres functions.
#
# Built for Phase 2 item P2-0 (Bookings Assistant sequenced roadmap), the llm-council's
# binding condition after the R55/R56/R57 incident: a migration that does DROP FUNCTION +
# CREATE FUNCTION on claim_booking_reminder/record_booking_reminder_result silently dropped
# their REVOKE/GRANT lockdown (Postgres does not carry ACLs across a drop+recreate, only
# CREATE OR REPLACE preserves them), leaving both RPCs anonymously callable over the public
# REST API for one round before the next verification round happened to catch it (R56).
# This script makes that catch automatic and repeatable instead of relying on luck.
#
# Usage:
#   ./grants_check.sh snapshot          print the CURRENT live grants state as JSON (no file I/O)
#   ./grants_check.sh baseline          snapshot + WRITE it to grants_baseline.json (overwrites)
#   ./grants_check.sh check             snapshot + DIFF against grants_baseline.json, exit 0/1
#
# Run `check` before AND after any migration that touches a function in the SENSITIVE_FUNCTIONS
# list below (see grants_runbook.md in this directory for the exact before/after invocation).
#
# Credentials: reads the Supabase Management-API PAT from ~/.config/ba/supabase.pat (the same
# file every other ad-hoc Mgmt-API helper in this repo uses, e.g. _automation/r24_sql.sh).
# Never hardcode the PAT, never print it, never commit it.

set -euo pipefail

REF="grdgjhkygzciwwrxgvgy"
PAT_FILE="$HOME/.config/ba/supabase.pat"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASELINE_FILE="$SCRIPT_DIR/grants_baseline.json"

if [ ! -f "$PAT_FILE" ]; then
  echo "ERROR: PAT file not found at $PAT_FILE" >&2
  exit 2
fi
PAT="$(cat "$PAT_FILE")"

# The sensitive-function set. See grants_runbook.md "Rationale" for why each one is here.
# Extend this list over time as new money- or PII-adjacent RPCs are added to the schema.
read -r -d '' SQL_QUERY <<'EOSQL' || true
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'claim_booking_reminder',
    'record_booking_reminder_result',
    'get_due_booking_reminders',
    'admin_update_user_subscription',
    'admin_developer_update_user_subscription',
    'get_user_subscription_details',
    'get_user_subscription_tier'
  )
order by p.proname, args;
EOSQL

run_query() {
  local body
  body="$(python3 -c 'import json,sys; print(json.dumps({"query": sys.argv[1]}))' "$SQL_QUERY")"
  curl -s -X POST \
    "https://api.supabase.com/v1/projects/${REF}/database/query" \
    -H "Authorization: Bearer ${PAT}" \
    -H "Content-Type: application/json" \
    -d "$body"
}

snapshot() {
  local raw
  raw="$(run_query)"
  # Sanity: fail loud if the Mgmt-API didn't return a JSON array (e.g. an auth error object).
  echo "$raw" | python3 -c '
import json, sys
data = json.load(sys.stdin)
if not isinstance(data, list):
    print("ERROR: unexpected Mgmt-API response (not a list):", data, file=sys.stderr)
    sys.exit(2)
if len(data) == 0:
    print("ERROR: zero sensitive functions found, check function names / schema", file=sys.stderr)
    sys.exit(2)
# stable, sorted, pretty-printed for clean diffs
print(json.dumps(sorted(data, key=lambda r: (r["function_name"], r["args"])), indent=2, sort_keys=True))
'
}

cmd="${1:-}"

case "$cmd" in
  snapshot)
    snapshot
    ;;
  baseline)
    snapshot > "$BASELINE_FILE"
    echo "Baseline written to $BASELINE_FILE" >&2
    ;;
  check)
    if [ ! -f "$BASELINE_FILE" ]; then
      echo "ERROR: no baseline at $BASELINE_FILE, run './grants_check.sh baseline' first" >&2
      exit 2
    fi
    CURRENT_TMP="$(mktemp)"
    trap 'rm -f "$CURRENT_TMP"' EXIT
    snapshot > "$CURRENT_TMP"
    python3 - "$BASELINE_FILE" "$CURRENT_TMP" <<'EOPY'
import json, sys

baseline_path = sys.argv[1]
current_path = sys.argv[2]

with open(current_path) as f:
    current = json.load(f)

with open(baseline_path) as f:
    baseline = json.load(f)

def key(row):
    return (row["function_name"], row["args"])

baseline_by_key = {key(r): r for r in baseline}
current_by_key = {key(r): r for r in current}

widened = []
narrowed = []
added = []
removed = []

roles = ["anon_exec", "authenticated_exec", "service_role_exec"]

for k, cur_row in current_by_key.items():
    base_row = baseline_by_key.get(k)
    if base_row is None:
        added.append(cur_row)
        continue
    for role in roles:
        base_val = base_row.get(role)
        cur_val = cur_row.get(role)
        if base_val == cur_val:
            continue
        entry = {
            "function": f"{k[0]}({k[1]})",
            "role": role,
            "baseline": base_val,
            "current": cur_val,
        }
        if cur_val is True and base_val is False:
            widened.append(entry)
        elif cur_val is False and base_val is True:
            narrowed.append(entry)

for k in baseline_by_key:
    if k not in current_by_key:
        removed.append(baseline_by_key[k])

if widened:
    print("FAIL: grants WIDENED (dangerous direction) on sensitive function(s):")
    for e in widened:
        print(f"  - {e['function']}: {e['role']} baseline={e['baseline']} -> current={e['current']}")
if narrowed:
    print("NOTE: grants NARROWED (safer direction, but should be an intentional lockdown, review + update the baseline if correct):")
    for e in narrowed:
        print(f"  - {e['function']}: {e['role']} baseline={e['baseline']} -> current={e['current']}")
if added:
    print("NOTE: function(s) present live but not in baseline (new overload or new sensitive function, review + update the baseline):")
    for r in added:
        print(f"  - {r['function_name']}({r['args']})")
if removed:
    print("NOTE: function(s) in baseline but not found live (dropped/renamed, review + update the baseline):")
    for r in removed:
        print(f"  - {r['function_name']}({r['args']})")

if widened:
    print("\nRESULT: FAIL")
    sys.exit(1)
if narrowed or added or removed:
    print("\nRESULT: PASS (with notes above, review before treating as final)")
    sys.exit(0)
print("RESULT: PASS, no drift, current state matches baseline exactly")
sys.exit(0)
EOPY
    ;;
  *)
    echo "Usage: $0 {snapshot|baseline|check}" >&2
    exit 2
    ;;
esac
