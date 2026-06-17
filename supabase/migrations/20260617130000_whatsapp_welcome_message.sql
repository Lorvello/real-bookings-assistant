-- Per-calendar customizable WhatsApp welcome message.
-- The agent (whatsapp-agent) sends this as its FIRST reply when a customer opens
-- the chat. NULL = use the default template baked into the agent code
-- (DEFAULT_WHATSAPP_WELCOME in supabase/functions/whatsapp-agent/prompt.ts).
-- The token {bedrijf} is replaced with the business name at runtime.
ALTER TABLE public.calendar_settings
  ADD COLUMN IF NOT EXISTS whatsapp_welcome_message text;

COMMENT ON COLUMN public.calendar_settings.whatsapp_welcome_message IS
  'Optional per-calendar WhatsApp greeting the agent sends as its first reply. NULL = default template in agent code. {bedrijf} is replaced with the business name at runtime.';
