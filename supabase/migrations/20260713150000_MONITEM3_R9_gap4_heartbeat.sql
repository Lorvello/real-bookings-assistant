-- R9 GAP 4 FIX (see ../../launch-ready-loop/_BA_MONITORING_ALERTS_STATE.md R9 finding 4): no
-- dead-man's-switch existed on the in-turn detection block itself or on
-- monitoring_alert_config.enabled - a silent break in detection (shape change, exception every
-- turn, or the config flag flipped off) had zero self-alerting. Deliberately the simplest honest
-- shape per the run-spec's "targeted, not a platform" rule: ONE heartbeat row, stamped by
-- index.ts's own monitoring try/catch on every turn it runs (success OR caught exception - see
-- that block's comment), plus a small pg_cron sweep that alerts (a DIFFERENT, clearly-labeled
-- failure_class, so it never gets confused with a real customer-facing detection) when the
-- heartbeat has gone stale or the config flag is off. Strictly additive: no existing table/
-- column/trigger touched.

-- 1. monitoring_heartbeat: single-row table, one timestamp, updated on every in-turn detection
-- block execution (success or caught exception) by index.ts. A stale row means the detection code
-- path itself has stopped running (or stopped being reached), independent of whether any real
-- failure_class alert has ever fired - the exact signal Check A/B/C's own silence cannot provide.
CREATE TABLE public.monitoring_heartbeat (
  id       boolean PRIMARY KEY DEFAULT true CHECK (id = true), -- enforces single row, cheap singleton pattern
  last_beat timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.monitoring_heartbeat (id, last_beat) VALUES (true, now());

ALTER TABLE public.monitoring_heartbeat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monitoring_heartbeat FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.monitoring_heartbeat TO service_role;

COMMENT ON TABLE public.monitoring_heartbeat IS
  'R9 gap 4 (dead-man''s switch): single row, last_beat upserted by whatsapp-agent/index.ts''s monitoring try/catch on every turn (success or caught exception). scan_monitoring_heartbeat below alerts failure_class=monitor_heartbeat_missing when this goes stale or monitoring_alert_config.enabled is off.';

-- 2. Sweep function: alerts (a DISTINCT, clearly-labeled failure_class - never confused with a
-- real customer-facing date_mismatch/thread_hijack row) when either condition holds. Deduped
-- against its own most recent row so it fires at most once per 6-hour window per condition,
-- instead of spamming every cron tick while the underlying condition persists.
CREATE OR REPLACE FUNCTION public.scan_monitoring_heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  stale_cutoff constant interval := interval '1 hour';
  recheck_window constant interval := interval '6 hours';
  v_last_beat timestamptz;
  v_enabled boolean;
BEGIN
  SELECT last_beat INTO v_last_beat FROM public.monitoring_heartbeat WHERE id = true;
  SELECT enabled INTO v_enabled FROM public.monitoring_alert_config ORDER BY updated_at DESC LIMIT 1;

  IF v_last_beat IS NULL OR v_last_beat < now() - stale_cutoff THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.monitoring_alerts
      WHERE failure_class = 'monitor_heartbeat_missing'
        AND details ->> 'reason' = 'stale_heartbeat'
        AND created_at > now() - recheck_window
    ) THEN
      INSERT INTO public.monitoring_alerts (failure_class, conversation_id, contact_phone, details, detected_by)
      VALUES (
        'monitor_heartbeat_missing',
        NULL,
        NULL,
        jsonb_build_object('reason', 'stale_heartbeat', 'last_beat', v_last_beat, 'checked_at', now()),
        'pg_cron'
      );
    END IF;
  END IF;

  IF v_enabled IS DISTINCT FROM true THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.monitoring_alerts
      WHERE failure_class = 'monitor_heartbeat_missing'
        AND details ->> 'reason' = 'config_disabled'
        AND created_at > now() - recheck_window
    ) THEN
      INSERT INTO public.monitoring_alerts (failure_class, conversation_id, contact_phone, details, detected_by)
      VALUES (
        'monitor_heartbeat_missing',
        NULL,
        NULL,
        jsonb_build_object('reason', 'config_disabled', 'enabled', v_enabled, 'checked_at', now()),
        'pg_cron'
      );
    END IF;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.scan_monitoring_heartbeat() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_monitoring_heartbeat() TO service_role;

-- Every 30 minutes: at least 2 misses (stale_cutoff = 1 hour) before it can ever alert, so a
-- single slow/overlapping turn can never trip it.
SELECT cron.schedule(
  'scan-monitoring-heartbeat',
  '*/30 * * * *',
  $$SELECT public.scan_monitoring_heartbeat();$$
);
