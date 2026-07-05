-- R113 (F-R113-1): align webhook_security_logs with what whatsapp-webhook actually writes.
--
-- BUG: whatsapp-webhook's logSecurityEvent() helper unconditionally inserts an ip_address
-- field on every call (webhook_verification_success/_failed, signature_validated,
-- invalid_signature, webhook_processed, whatsapp_forward_gated, whatsapp_forward_bot_off,
-- whatsapp_codeless_inbound), but the table has never had an ip_address column (only
-- id, event_type, event_data, created_at, plus severity/user_id added in migration
-- 20260629120000_S4_F-S4-01 for the stripe-webhook's copy of this same bug class).
-- Every insert fails with 42703 (undefined column) / PGRST204 and is silently swallowed
-- (no .select(), no error-checking on the call sites) -- the entire WhatsApp webhook
-- security/audit trail (gating, signature validation, verification) has never actually
-- been written. Reproduced directly (raw SQL insert -> 42703) and live (GET with a wrong
-- verify_token + POST with a bad X-Hub-Signature-256 against the deployed function,
-- both returned the correct 403 to the caller but wrote 0 rows to webhook_security_logs).
--
-- FIX: same additive pattern as the stripe-webhook fix in 20260629120000_S4_F-S4-01 --
-- add the missing column. TEXT (not inet) because the code passes ipAddress straight out
-- of req.headers.get(...) || 'unknown', an arbitrary string, not a validated address.
-- Additive + nullable: no data migration needed, no risk to existing rows.

ALTER TABLE public.webhook_security_logs
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_ip_address
  ON public.webhook_security_logs(ip_address);

COMMENT ON COLUMN public.webhook_security_logs.ip_address IS 'client IP as seen by the webhook (x-forwarded-for/x-real-ip), or ''unknown'' when absent; free-text, not validated as inet';
