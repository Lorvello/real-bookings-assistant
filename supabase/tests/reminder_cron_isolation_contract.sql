\set ON_ERROR_STOP on

BEGIN;

DO $test$
DECLARE
  v_job_count integer;
BEGIN
  SELECT count(*) INTO v_job_count
  FROM cron.job
  WHERE jobname = 'process-booking-reminders';

  -- R28 deliberately leaves the v2 sender unscheduled until the matching Edge
  -- function is deployed and a human-controlled production canary has passed.
  IF v_job_count <> 0 THEN
    RAISE EXCEPTION 'preproduction reminder cron must remain quiesced; found % job(s)', v_job_count;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_before bigint;
  v_after bigint;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name IN ('reminder_function_url', 'reminder_cron_secret')
  ) THEN
    RAISE EXCEPTION 'local contract requires an unprovisioned reminder Vault';
  END IF;

  SELECT count(*) INTO v_before FROM net.http_request_queue;

  PERFORM net.http_post(
    url := reminder_config.function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', reminder_config.cron_secret
    ),
    body := '{}'::jsonb
  )
  FROM (
    SELECT
      max(decrypted_secret) FILTER (
        WHERE name = 'reminder_function_url'
      ) AS function_url,
      max(decrypted_secret) FILTER (
        WHERE name = 'reminder_cron_secret'
      ) AS cron_secret
    FROM vault.decrypted_secrets
  ) AS reminder_config
  WHERE reminder_config.function_url
    ~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/process-booking-reminders$'
    AND length(reminder_config.cron_secret) >= 32;

  SELECT count(*) INTO v_after FROM net.http_request_queue;
  IF v_after <> v_before THEN
    RAISE EXCEPTION 'unprovisioned local reminder cron enqueued an external request';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'REMINDER_CRON_ISOLATION_CONTRACT_PASS';
