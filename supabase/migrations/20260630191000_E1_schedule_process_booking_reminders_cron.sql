-- E-1 (E2E launch-ready loop): SCHEDULE the reminder engine.
--
-- BUG. supabase/functions/process-booking-reminders is fully built (claim-then-send
-- dedup over booking_reminders_sent + the get_due_booking_reminders RPC) but was DORMANT:
-- NO pg_cron job ever invoked it, so cron.job had no reminder row and the product's
-- headline value-prop (no-show reduction via reminders) never fired in production. This
-- schedules it, mirroring the keep-warm-whatsapp cron (20260623130000): pg_cron fires a
-- pg_net POST at the deployed edge function.
--
-- AUTH. The function is internal: it sends customer reminders, so it is gated by a shared
-- secret (x-internal-secret), the same pattern as whatsapp-payment-handler. Unlike the
-- function-to-function callers, a SQL cron job cannot read the function's
-- INTERNAL_FUNCTION_SECRET env var. To avoid hardcoding any secret in the repo, the job
-- reads a dedicated secret from Supabase Vault (vault.decrypted_secrets, name
-- 'reminder_cron_secret'); the same value is set as the function secret REMINDER_CRON_SECRET
-- so the function can verify it. Both are provisioned out-of-band (Management API), never
-- committed. If the vault secret is absent the job simply sends no x-internal-secret header
-- and the function returns 401 (fails closed -> no unauthenticated send), so a missing
-- secret degrades safely rather than sending unguarded.
--
-- The function is verify_jwt = false (config.toml) so the gateway does not also require a
-- JWT; the x-internal-secret app-layer check is the sole gate (identical posture to
-- whatsapp-payment-handler). The reminder cadence is hours/minutes-grained per calendar
-- (first_reminder_timing_hours / second_reminder_timing_minutes), so a 5-minute tick gives
-- prompt second-reminder delivery at trivial cost; claim-then-send makes overlapping ticks
-- safe (no double-send).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: drop any prior version of this job before re-scheduling.
select cron.unschedule('process-booking-reminders')
where exists (select 1 from cron.job where jobname = 'process-booking-reminders');

select cron.schedule(
  'process-booking-reminders',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url     := 'https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/process-booking-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_cron_secret' limit 1),
          ''
        )
      ),
      body    := '{}'::jsonb
    );
  $job$
);
