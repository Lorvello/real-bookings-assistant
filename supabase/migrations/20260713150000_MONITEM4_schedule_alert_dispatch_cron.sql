-- MONITORING/ALERTS ITEM 4 (see ../../launch-ready-loop/MONITORING_ALERTS_DESIGN.md section 4,
-- and ../../launch-ready-loop/GOAL_PROMPT_BA_MONITORING_ALERTS.md backlog Item 4).
--
-- Schedules the delivery step (monitoring-alert-dispatcher edge function) on its own pg_cron job,
-- mirroring process-booking-reminders' own cron-invoked shape (migration 20260630191000): pg_cron
-- fires a pg_net POST at the deployed edge function every 5 minutes. Deliberately a SEPARATE
-- deploy unit and a SEPARATE cron job from Item 3's detection sweep
-- (scan-recent-booking-date-drift), per the run-spec's decoupling rule: a delivery failure here
-- can never block or slow detection, and a detection bug can never suppress an already-written
-- alert waiting for delivery.
--
-- AUTH. Same posture as process-booking-reminders: the function is internal (it sends real email
-- to Mathew), gated by a shared secret (x-internal-secret) a SQL cron job cannot read from the
-- function's own env, so it is provisioned in Supabase Vault out-of-band (Management API, never
-- committed) under the name 'monitoring_alert_dispatch_secret', with the identical value also set
-- as the function secret MONITORING_ALERT_DISPATCH_SECRET so the function can verify it. If the
-- vault secret is ever absent the job sends no x-internal-secret header and the function returns
-- 401 (fails closed, no unauthenticated send).
--
-- The function itself only ever sends when monitoring_alert_config.enabled = true AND
-- alert_email is set (see index.ts), so this schedule is safe to activate even while enabled
-- stays false; it simply no-ops every tick until a human explicitly flips the flag.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotent: drop any prior version of this job before re-scheduling.
select cron.unschedule('monitoring-alert-dispatch')
where exists (select 1 from cron.job where jobname = 'monitoring-alert-dispatch');

select cron.schedule(
  'monitoring-alert-dispatch',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url     := 'https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/monitoring-alert-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'monitoring_alert_dispatch_secret' limit 1),
          ''
        )
      ),
      body    := '{}'::jsonb
    );
  $job$
);
