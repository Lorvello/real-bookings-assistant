-- SECURITY: process_whatsapp_message is a SECURITY DEFINER mutation that
-- creates/updates whatsapp_contacts, whatsapp_conversations and whatsapp_messages
-- for an arbitrary p_calendar_id. It is only ever called by the whatsapp-webhook
-- edge function (service_role) after Meta signature verification - never from the
-- frontend (verified by grep). Yet EXECUTE was granted to anon/authenticated,
-- letting anyone inject spoofed "inbound" WhatsApp messages into any tenant's
-- inbox (polluting their conversation history and triggering their n8n AI agent).
-- Restrict to service_role / internal only.
REVOKE EXECUTE ON FUNCTION public.process_whatsapp_message(text, text, text, uuid) FROM PUBLIC, anon, authenticated;
