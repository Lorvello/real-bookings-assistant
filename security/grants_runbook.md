# Grants/permissions-diff check: runbook

Standing check that catches a migration silently narrowing or widening access-control grants
on sensitive Postgres functions. Built as Phase 2 item P2-0, the llm-council's binding condition
after the R55/R56/R57 incident (a `DROP FUNCTION` + `CREATE FUNCTION` on
`claim_booking_reminder`/`record_booking_reminder_result` dropped their `REVOKE`/`GRANT`
lockdown; Postgres does not carry ACLs across a drop-then-recreate, only `CREATE OR REPLACE`
does; both RPCs were anonymously callable over the public REST API for one round until the next
verification round happened to catch it). This makes that catch automatic.

## Files

- `security/grants_check.sh`: the script (`snapshot` / `baseline` / `check` subcommands).
- `security/grants_baseline.json`: the committed known-good grants snapshot.

## The sensitive-function set (extend over time)

| Function | Why it is here |
|---|---|
| `claim_booking_reminder(uuid, smallint)` | Core reminder-pipeline RPC, service_role-only by design, the exact R55/R56 incident target. |
| `record_booking_reminder_result(uuid, smallint, boolean, integer, text, text)` | Same lineage, mutates reminder state, the other R56 incident target. |
| `get_due_booking_reminders()` | Same lineage, the correctly-locked control used throughout the R56/R57 evidence. |
| `admin_update_user_subscription` (all overloads) | Mutates a user's billing/subscription tier and status directly, money-adjacent. |
| `admin_developer_update_user_subscription` | Same class as above, a developer-console variant. |
| `get_user_subscription_details(uuid)` | Returns a full PII/billing row (`row_to_json(v_user)`, tier, status) for an arbitrary `p_user_id`, service_role-only by design. |
| `get_user_subscription_tier(uuid)` | Known pre-existing issue (`task_6a750a7e`, spun off separately, not fixed here): currently anon/authenticated-callable, leaks a non-sensitive tier field. Included here so the baseline still tracks it and any FURTHER widening past its current state is still caught, even though its current state is itself a known open item. |
| `reschedule_booking_atomic` (all overloads) | Mutates a booking's time/calendar; since SEQP2R5 also writes the owner activity log (`agent_actions`) inside the same transaction. service_role-only by design. Added SEQP2R5 after a REAL live finding on this exact function (see below). |
| `owner_update_booking_status(uuid, text, text)` | Mutates booking status and `payment_status` (flags `refund_required`), money-adjacent; since SEQP2R5 also writes the owner-actor `agent_actions` row. authenticated + service_role only (owner-facing RPC), never anon. |

This list is a judgment call, not exhaustive. Add any new function that touches Stripe/payments,
mutates billing/subscription state, or returns PII/customer data to a non-owner caller. When you
add one, run `./grants_check.sh baseline` again to fold it into the committed snapshot.

## How to invoke, before and after a migration

Run from `security/`:

```bash
# Before touching a migration on a sensitive function:
./grants_check.sh check
# Expect: RESULT: PASS, no drift, current state matches baseline exactly

# Apply the migration.

# After:
./grants_check.sh check
```

- **PASS with no notes**: nothing changed, safe.
- **FAIL (WIDENED)**: a sensitive function gained `anon` or `authenticated` EXECUTE it did not
  have before. This is the dangerous direction, the exact R55/R56 failure mode. Stop, add the
  missing `REVOKE ALL ... FROM PUBLIC/anon/authenticated; GRANT EXECUTE ... TO service_role;`
  block to the migration (see any of the `SEQP1R28`/`R35`/`R38`/`R42`/`R57` migrations for the
  exact pattern), re-apply, re-check until clean.
- **NARROWED, ADDED, or REMOVED (notes, exit 0)**: a legitimate change (an intentional lockdown,
  a new overload, a renamed/dropped function). Review it is actually intentional, then run
  `./grants_check.sh baseline` to fold the new state into the committed snapshot and commit the
  updated `grants_baseline.json`.

Credentials: the script reads `~/.config/ba/supabase.pat` (the same PAT every other Mgmt-API
helper in this repo uses, e.g. `_automation/r24_sql.sh`). Never hardcode it, never commit it.

## Proof it works (2026-07-08)

Live-staged a real test migration on `get_user_subscription_details(uuid)` reproducing the exact
R55 shape (`DROP FUNCTION` + `CREATE FUNCTION`, zero `REVOKE`/`GRANT` statements). `check` failed
loud and correctly:

```
FAIL: grants WIDENED (dangerous direction) on sensitive function(s):
  - get_user_subscription_details(p_user_id uuid): anon_exec baseline=False -> current=True
  - get_user_subscription_details(p_user_id uuid): authenticated_exec baseline=False -> current=True
RESULT: FAIL
```

Reverted immediately (re-applied the standard `REVOKE`/`GRANT` lockdown block), `check` returned
to clean PASS, and a grants-neutral no-op change (a `COMMENT ON FUNCTION`, added then removed)
left `check` silently PASSing throughout, no false positive. Full evidence:
`../../../Bookings Assistant/launch-ready-loop/evidence/SEQ_P2_r1.md`.

## Real finding closed: admin_update_user_subscription enum overload (2026-07-08, SEQP2R2)

The out-of-scope finding this same round's evidence flagged (one overload of
`admin_update_user_subscription`, the `subscription_tier`-enum-arg one, had
`anon_exec=true, authenticated_exec=true` while its siblings did not) was investigated and
fixed. Investigated live: the overload does carry the same internal `IF NOT is_admin() THEN
RETURN unauthorized` gate as its siblings, and a live anon-key attack against a disposable test
user was independently blocked twice over (the internal gate, and a PostgREST overload-ambiguity
error, `PGRST203`, since this overload shares 7 identical argument names with a sibling
all-text overload). Not live-exploitable, sev-4. Fixed anyway (defense-in-depth, matching the
project's own standard): `20260708150000_SEQP2R2_admin_update_user_subscription_enum_overload_grants_lockdown.sql`
locks it to `service_role`-only EXECUTE, matching its two siblings and
`admin_developer_update_user_subscription`. Baseline updated to the new locked-down state.
Full evidence: `../../../Bookings Assistant/launch-ready-loop/evidence/SEQ_P2_r2.md`.

## Real finding closed: reschedule_booking_atomic default-privilege trap (2026-07-08, SEQP2R5)

Building the new `agent_actions` owner-activity-log table (SEQP2R5), `reschedule_booking_atomic`
gained a new 6-arg overload (added `p_conversation_id`). The migration's own
`REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO service_role;` block (the exact shape used
everywhere else in this repo) was applied, then `check` on the newly-extended sensitive set
still showed the NEW overload as `anon_exec=true, authenticated_exec=true`. Root cause,
confirmed live via `pg_default_acl`: this project has an `ALTER DEFAULT PRIVILEGES` entry for
role `postgres` (the role the Mgmt-API SQL endpoint runs as) that grants `EXECUTE` on every
brand-new function DIRECTLY to `anon`/`authenticated`/`service_role`, independent of `PUBLIC`.
`REVOKE ALL ... FROM PUBLIC` never touches a direct grant, only a `PUBLIC`-inherited one, so a
genuinely NEW function signature (not a `CREATE OR REPLACE` of an existing one) needs
`anon`/`authenticated` revoked EXPLICITLY, every time, or it silently launches open. This is a
DIFFERENT mechanism than the R55/R56 drop-then-recreate incident (that one lost previously-set
ACLs; this one is a fresh object inheriting a project-level default no migration author would
expect), but the same dangerous direction and the same fix shape once known. Fixed live:
`REVOKE ALL ... FROM PUBLIC, anon, authenticated;` explicitly. `owner_update_booking_status` was
unaffected (same signature, `CREATE OR REPLACE` of an EXISTING object, default privileges only
apply to newly created objects). Both functions added to the sensitive set above so future
overloads of either are caught automatically. Baseline updated to the fixed state. Full
evidence: `../../../Bookings Assistant/launch-ready-loop/evidence/SEQ_P2_r5.md`.
