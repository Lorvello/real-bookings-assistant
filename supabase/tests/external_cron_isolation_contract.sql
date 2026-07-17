\set ON_ERROR_STOP on

BEGIN;

DO $test$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname IN (
      'process-booking-reminders',
      'keep-warm-whatsapp',
      'monitoring-alert-dispatch'
    )
  ) THEN
    RAISE EXCEPTION 'preproduction external delivery cron is not quiesced';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE command ILIKE '%net.http_%'
       OR command ~ 'https://[a-z0-9-]+[.]supabase[.]co/functions/v1/'
  ) THEN
    RAISE EXCEPTION 'an active cron job still contains an external Edge request';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'EXTERNAL_CRON_ISOLATION_CONTRACT_PASS';
