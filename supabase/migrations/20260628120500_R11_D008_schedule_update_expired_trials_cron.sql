-- R11 / D-008: schedule update_expired_trials() via pg_cron (hourly).
--
-- update_expired_trials() flips users.subscription_status to 'expired' for
-- lapsed trials + ended active/paid subscriptions, but it was never scheduled,
-- so the stored status lagged the live RPC decision. Scheduling it keeps the
-- stored column coherent for anything that reads users.subscription_status
-- directly (rather than via get_user_status_type).
--
-- SAFETY (ordering): this is applied AFTER F-013
-- (20260628120000_R11_F013_gate_paid_subscriber_behind_not_lapsed.sql) gates
-- the get_user_status_type paid_subscriber branch behind a users-not-lapsed
-- check. Without F-013, activating this cron on any stale-subscribers tenant
-- would surface the paywall leak (users=expired + subscribers.subscribed=true
-- -> paid_subscriber). With F-013 live and proven, the cron is safe: a tenant
-- it marks 'expired' now correctly routes to expired_trial (Free downgrade).
--
-- Idempotent: unschedule any prior job of the same name before re-scheduling.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-expired-trials') THEN
    PERFORM cron.unschedule('update-expired-trials');
  END IF;
END $$;

SELECT cron.schedule(
  'update-expired-trials',
  '0 * * * *',                       -- top of every hour
  $$select public.update_expired_trials();$$
);
