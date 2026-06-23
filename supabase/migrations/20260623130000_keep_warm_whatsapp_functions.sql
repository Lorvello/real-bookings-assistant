-- Keep-warm pinger for the two WhatsApp edge functions (whatsapp-webhook + whatsapp-agent).
--
-- WHY. The first message after an idle gap (the typical "hallo") pays a deep cold
-- start. Measured 2026-06-23 on real traffic + the LLM-free webhook (no model
-- variance): a function idle for 30 min to 10 h ran ~3000 ms vs a warm floor of
-- ~750 ms (webhook) / ~2400 ms (agent), i.e. ~2.2 to 2.8 s of pure cold start.
-- "hallo" is almost always the first message after an overnight/multi-hour gap,
-- so it reliably hits that worst case (felt ~8 to 10 s including Meta's own
-- delivery time). Pinging both functions every 2 min keeps their isolate +
-- module graph warm, so the first real message lands warm instead of cold.
--
-- HOW. pg_cron fires pg_net POSTs carrying the header x-keep-warm: 1. Both
-- functions short-circuit on that header and return 200 "warm" BEFORE any
-- signature check, DB read, agent invoke or LLM call (see each function's
-- index.ts), so a ping costs ~nothing (no Groq tokens, no data touched) and
-- cannot process or send a message.
--
-- AUTH. whatsapp-webhook is verify_jwt=false (public, Meta-signature based) so a
-- bare header ping reaches our early return. whatsapp-agent defaults to
-- verify_jwt=true, so the gateway requires a valid JWT first; we send the PUBLIC
-- anon key (already shipped in the frontend bundle, src/integrations/supabase/
-- client.ts) which is not a secret. We deliberately do NOT add a verify_jwt=false
-- block for the agent: that would weaken its auth posture for a tiny convenience.

-- Idempotent: drop any prior version of this job before re-scheduling.
select cron.unschedule('keep-warm-whatsapp')
where exists (select 1 from cron.job where jobname = 'keep-warm-whatsapp');

select cron.schedule(
  'keep-warm-whatsapp',
  '*/2 * * * *',
  $job$
    select net.http_post(
      url     := 'https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/whatsapp-webhook',
      headers := '{"Content-Type":"application/json","x-keep-warm":"1"}'::jsonb,
      body    := '{}'::jsonb
    );
    select net.http_post(
      url     := 'https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/whatsapp-agent',
      headers := '{"Content-Type":"application/json","x-keep-warm":"1","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZGdqaGt5Z3pjaXd3cnhndmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyODI0MDMsImV4cCI6MjA2NTg1ODQwM30.deOQDQR5LTS5NqYQ9s_D_6sL0578yuSJc_zUZKzhjqY"}'::jsonb,
      body    := '{}'::jsonb
    );
  $job$
);
