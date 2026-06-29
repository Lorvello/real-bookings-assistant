-- S4 (F-S4-01): align webhook_security_logs with what stripe-webhook actually writes.
--
-- BUG: stripe-webhook's logSecurityEvent() inserts { event_type, severity, user_id,
-- event_data }, but the table (migration 20251010182834) only has { id, event_type,
-- event_data, created_at } AND a CHECK constraint that only allows event_type IN
-- ('verification_success','verification_failed','signature_invalid','rate_limit_exceeded').
-- The code emits dynamic 'stripe_<event>' types (stripe_subscription_created,
-- stripe_trial_will_end, stripe_verification_failed, ...) and the missing columns, so
-- EVERY insert fails twice over (undefined column + CHECK violation). The error is
-- swallowed (console.error, non-fatal), so handlers keep working but the entire webhook
-- security/audit trail is silently empty -- signature failures and lifecycle events are
-- never recorded. Verified empty in prod (0 rows ever).
--
-- FIX: add the two missing columns and drop the over-restrictive CHECK so the table can
-- record the arbitrary 'stripe_*' audit event types the code produces. Additive + safe:
-- the table is empty, columns are nullable, no data migration needed.

ALTER TABLE public.webhook_security_logs
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- The original CHECK enumerated only 4 legacy event types and blocked the dynamic
-- 'stripe_<event>' values the webhook emits. An audit log should accept any event_type;
-- integrity here is "record everything", not "restrict to a fixed list".
ALTER TABLE public.webhook_security_logs
  DROP CONSTRAINT IF EXISTS webhook_security_logs_event_type_check;

CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_user_id
  ON public.webhook_security_logs(user_id);

COMMENT ON COLUMN public.webhook_security_logs.severity IS 'info | high (high for verification/failure events)';
COMMENT ON COLUMN public.webhook_security_logs.user_id IS 'optional: the affected user (null for pre-auth signature failures)';
