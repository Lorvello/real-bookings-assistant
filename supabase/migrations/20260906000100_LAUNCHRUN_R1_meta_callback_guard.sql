-- LAUNCH-RUN 2026-09 / R1 "DE INGANG" - watchdog on the Meta `messages` callback.
--
-- WHY: the Meta app-level `messages` subscription has been hijacked back to Luciano's n8n three
-- times (2026-06-17, 2026-06-24, and the state measured 2026-09-05/06). While it points at n8n,
-- every inbound WhatsApp message to +31 85 115 5243 is delivered to a workflow with 0 executions
-- since 2026-07-13 and never reaches the agent. The existing monitor_heartbeat_missing alarm fired
-- daily for 54 days and never named that cause. This adds the check that names it.
--
-- WHAT THIS FILE CREATES
--   1. public.meta_callback_guard_runs - one row per guard run, ALSO on ok, so "the watchdog is
--      actually running" is queryable instead of assumed.
--   2. cron job `meta-callback-guard`, every 5 minutes, invoking the edge function of the same
--      name via pg_net, gated by the same x-internal-secret / vault secret the monitoring
--      dispatcher already uses (`monitoring_alert_dispatch_secret`).
--
-- The drift ALERT itself is written by the edge function into the existing public.monitoring_alerts
-- (failure_class `meta_callback_drift`), so the existing monitoring-alert-dispatcher delivers it.
-- No second delivery path is built.
--
-- ROLLBACK (exact, tested shape):
--   select cron.unschedule('meta-callback-guard');
--   drop table if exists public.meta_callback_guard_runs;
--   delete from supabase_migrations.schema_migrations where version = '20260906000100';

create table if not exists public.meta_callback_guard_runs (
  id                 uuid primary key default gen_random_uuid(),
  checked_at         timestamptz not null default now(),
  status             text        not null check (status in ('ok','drift','error')),
  reason             text        not null,
  phase              text        not null default 'check' check (phase in ('check','readback')),
  measured_url       text,
  expected_url       text        not null,
  selfheal_enabled   boolean     not null default false,
  selfheal_attempted boolean     not null default false,
  selfheal_ok        boolean,
  http_status        integer,
  run_marker         text,
  detected_by        text        not null default 'pg_cron'
                     check (detected_by in ('in_turn','pg_cron','mechanism_test')),
  details            jsonb       not null default '{}'::jsonb
);

comment on table public.meta_callback_guard_runs is
  'LAUNCH-RUN 2026-09 R1: one row per meta-callback-guard run, including ok runs, so a silent '
  'watchdog is detectable. status=error means the CHECK failed - never read that as healthy.';

create index if not exists meta_callback_guard_runs_checked_at_idx
  on public.meta_callback_guard_runs (checked_at desc);
create index if not exists meta_callback_guard_runs_status_idx
  on public.meta_callback_guard_runs (status, checked_at desc);
create index if not exists meta_callback_guard_runs_run_marker_idx
  on public.meta_callback_guard_runs (run_marker) where run_marker is not null;

-- Locked down: RLS on with no policies, so only service_role (which bypasses RLS) can read/write.
alter table public.meta_callback_guard_runs enable row level security;
revoke all on public.meta_callback_guard_runs from anon, authenticated;

-- Every 5 minutes, same shape as cron job 9 (monitoring-alert-dispatch).
do $$
begin
  perform cron.unschedule('meta-callback-guard');
exception when others then
  null; -- job did not exist yet
end $$;

select cron.schedule(
  'meta-callback-guard',
  '*/5 * * * *',
  $cron$
    select net.http_post(
      url     := 'https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/meta-callback-guard',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', coalesce(
          (select decrypted_secret from vault.decrypted_secrets where name = 'monitoring_alert_dispatch_secret' limit 1),
          ''
        )
      ),
      body    := '{}'::jsonb
    );
  $cron$
);
