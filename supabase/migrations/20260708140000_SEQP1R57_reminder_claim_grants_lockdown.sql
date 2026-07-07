-- SEQP1R57: fix R56-1, a live sev-2 privilege-escalation regression reproduced fresh in
-- launch-ready-loop/evidence/SEQ_P1_r56_verify.md and re-reproduced fresh again this round,
-- evidence/SEQ_P1_r57.md.
--
-- ROOT CAUSE: SEQP1R55 (20260708130000_SEQP1R55_reminder_claim_time_channel_freshness.sql)
-- used a genuine `DROP FUNCTION` + `CREATE FUNCTION` (not `CREATE OR REPLACE FUNCTION`) on
-- both `claim_booking_reminder` and `record_booking_reminder_result`, to widen their RETURN/
-- parameter shape with the new `channel`/`p_channel` column. A real DROP-then-CREATE does NOT
-- preserve the previous ACL the way `CREATE OR REPLACE FUNCTION` does; Postgres re-applies its
-- own default (EXECUTE granted to PUBLIC) on function creation. R55 never re-applied the
-- REVOKE-ALL-FROM-PUBLIC/anon/authenticated + GRANT-EXECUTE-TO-service_role-ONLY block that
-- every other migration in this exact lineage (R28/R31/R35/R38/R42/R51, and R55 itself for
-- get_due_booking_reminders) carries after every drop-then-create on these SECURITY DEFINER
-- functions. Confirmed live via has_function_privilege before this fix: `anon` and
-- `authenticated` both had EXECUTE on both functions; `get_due_booking_reminders` (untouched
-- grants-wise by R55) correctly had neither, proving this is not a project-wide config issue,
-- it is specific to the two functions R55 dropped and recreated.
--
-- IMPACT while open: both functions are `SECURITY DEFINER` (RLS bypassed by design) and
-- neither checks `auth.uid()` or any tenant ownership (never their job, they were meant to be
-- service-role-only, called exclusively from the cron-secret-gated `process-booking-reminders`
-- edge function). Any anonymous caller with just the public anon key could call
-- `claim_booking_reminder`/`record_booking_reminder_result` directly over the public REST API
-- against any booking id, genuinely mutating `booking_reminders_sent` rows platform-wide.
--
-- FIX: additive-only lockdown migration. Does not edit or revert R55's migration file. Both
-- function bodies are untouched (this migration contains ZERO `CREATE`/`DROP FUNCTION`
-- statements); only their grants are re-asserted, using the CURRENT live signatures (R55 added
-- a 7th `channel` OUT column to claim_booking_reminder, which does not change its identity
-- arguments, and a 6th `p_channel text` IN parameter to record_booking_reminder_result, which
-- DOES change its identity arguments from R45's 5-arg form to a 6-arg form). Signatures below
-- confirmed live via pg_get_function_identity_arguments before writing this migration.

REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;

REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text, text) TO service_role;

COMMENT ON FUNCTION public.claim_booking_reminder(uuid, smallint) IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R28/SEQP1R31/SEQP1R35/SEQP1R38/SEQP1R42/SEQP1R51/SEQP1R55/SEQP1R57: atomic claim-or-resume-retry of a reminder row, now including claim-time-fresh channel (R55). SEQP1R57: re-asserts the REVOKE/GRANT lockdown R55''s drop-then-create silently dropped (a real live regression, R56-1), restoring service_role-only EXECUTE. No function-body change.';

COMMENT ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text, text) IS
  'SEQP1R3/SEQP1R9/SEQP1R38/SEQP1R42/SEQP1R44/SEQP1R45/SEQP1R55/SEQP1R57: records the outcome of a reminder send attempt, now including the actually-attempted channel (R55). SEQP1R57: re-asserts the REVOKE/GRANT lockdown R55''s drop-then-create silently dropped (a real live regression, R56-1), restoring service_role-only EXECUTE. No function-body change.';
