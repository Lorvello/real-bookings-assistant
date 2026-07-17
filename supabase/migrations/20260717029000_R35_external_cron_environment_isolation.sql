-- R35: a clean local or preview reset must never call production Edge URLs.
--
-- Two historical migrations embedded the production project URL directly in active
-- pg_cron jobs. Keep-warm and monitoring delivery are useful production operations,
-- but activation belongs to an environment-specific, human-gated deployment step
-- after the matching Edge version, secret, canary and rollback have been verified.
-- Pure SQL maintenance jobs remain untouched.

SELECT cron.unschedule('keep-warm-whatsapp')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'keep-warm-whatsapp'
);

SELECT cron.unschedule('monitoring-alert-dispatch')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monitoring-alert-dispatch'
);

COMMENT ON EXTENSION pg_cron IS
  'R23/R35 external HTTP cron delivery is environment-isolated and intentionally quiesced. Human activation requires environment-owned URLs and secrets, matching DB and Edge versions, a successful canary, and tested rollback.';
