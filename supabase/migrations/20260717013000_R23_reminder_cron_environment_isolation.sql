-- R23: isolate reminder cron delivery by environment.
--
-- The previous job embedded the production project URL in migration SQL. Every fresh local
-- reset therefore called the production Edge endpoint every five minutes (observed locally
-- as repeated 401 responses). It failed closed only because local Vault had no matching
-- secret; provisioning a copied secret would have turned a local/test cron into a production
-- caller. The job now performs no HTTP request unless BOTH environment-specific values are
-- present in Vault:
--   reminder_function_url  exact deployed process-booking-reminders HTTPS URL
--   reminder_cron_secret   matching Edge REMINDER_CRON_SECRET
-- No URL or secret is committed to the repository. This migration deliberately leaves the
-- job unscheduled: scheduling before the matching Edge/RPC version is deployed creates a
-- mixed-version send window. A later human-gated activation migration may install this exact
-- Vault-backed job only after the deployed function and rollback canary are verified.

SELECT cron.unschedule('process-booking-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-booking-reminders'
);

COMMENT ON EXTENSION pg_cron IS
  'R23 reminder cron is environment-isolated and intentionally quiesced. Human activation requires matching DB and Edge versions, valid Vault values, and a rollback-ready canary.';
