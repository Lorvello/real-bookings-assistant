-- R31 (BLOK G2, 2026-06-19): drop the vestigial whatsapp_webhook_queue + its processor.
--
-- The queue was never consumed. Since the n8n -> Supabase agent port (2026-06-17), inbound
-- WhatsApp messages are processed INLINE inside the whatsapp-webhook edge function; F4
-- (2026-06-18) removed the queue insert there. Nothing read the queue: process_whatsapp_webhook_queue()
-- is the only "processor" and it is never invoked.
--
-- Verified before this drop (R31): the table has 0 rows, no FK references, no dependent views;
-- its only trigger (on_whatsapp_webhook_inserted -> handle_new_whatsapp_webhook) just pg_notify's
-- with no LISTEN consumer; process_whatsapp_webhook_queue() has NO pg_cron schedule and NO live
-- caller (only a now-deleted dead hook + explanatory comments referenced it). Irreversible by design.
drop trigger if exists on_whatsapp_webhook_inserted on public.whatsapp_webhook_queue;
drop function if exists public.handle_new_whatsapp_webhook();
drop function if exists public.process_whatsapp_webhook_queue();
drop table if exists public.whatsapp_webhook_queue;
