-- Clean-bootstrap compatibility: later migrations and the generated production
-- types use these legacy conversation fields, but the historical add-column
-- migrations are missing or dated after their first use. Existing databases
-- already have them, so this is deliberately additive and idempotent.
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS "From" text;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_session_id
  ON public.whatsapp_conversations(session_id)
  WHERE session_id IS NOT NULL;
