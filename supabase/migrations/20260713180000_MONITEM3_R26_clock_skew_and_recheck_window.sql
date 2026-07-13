-- R26 REMEDIATION (see ../../launch-ready-loop/_BA_MONITORING_ALERTS_STATE.md R26 round entry): the
-- round-10 adversarial pass found 3 LOW-SEVERITY items, all previously rated ACCEPTABLE (no
-- MUST-FIX), which Mathew explicitly asked to close anyway so a subsequent adversarial round can
-- genuinely find nothing. This migration covers Finding 1 and Finding 3 (Finding 2 is a JS-only
-- change, see index.ts). Two independent, single-purpose sections below; do not read them as one
-- combined change.
--
-- New migration, not an in-place edit of either already-applied prior migration (20260713170000
-- added the h.updated_at >= b.updated_at guard, 20260713150000 created the heartbeat sweep) - same
-- out-of-band CREATE OR REPLACE / re-run-safe discipline every prior round in this loop used.

-- =============================================================================
-- SECTION 1 - FINDING 1: clock-skew margin on the hint-staleness guard
-- =============================================================================
-- `monitoring_alert_hints.updated_at` is stamped by the whatsapp-agent edge function's own runtime
-- clock (a client-supplied value, see index.ts's hintUpsertTimestamp), while `bookings.updated_at`
-- is stamped by the Postgres server clock via the `on_booking_updated` BEFORE UPDATE trigger
-- (handle_updated_at(), migration 20250625171209), which silently overrides any client-supplied
-- value with `now()` server-side. The R23 guard's strict `h.updated_at >= b.updated_at` comparison
-- therefore compares two DIFFERENT physical clocks (edge runtime vs Postgres server). If those
-- clocks are skewed by even a few seconds, a genuinely-fresh hint (written the same turn as the
-- booking's own commit) could spuriously fail the comparison and get wrongly excluded, defeating
-- the sweep's true-positive case for that turn.
--
-- Fix: widen the guard by a small, fixed margin that absorbs realistic clock skew between the edge
-- runtime and the Postgres server, while a hint that is stale by HOURS (left over from an earlier,
-- unrelated turn - the exact case the R23 guard exists to exclude) still correctly fails the
-- comparison and gets skipped. 2 minutes is comfortably larger than any realistic NTP-bounded clock
-- skew between two cloud-hosted clocks (typically low milliseconds to low seconds) while being
-- negligible next to the hours-scale staleness the guard is actually meant to catch.
CREATE OR REPLACE FUNCTION public.scan_recent_booking_date_drift()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.monitoring_alerts (failure_class, conversation_id, contact_phone, details, detected_by)
  SELECT
    'date_mismatch_cron_sweep',
    NULL,
    b.customer_phone,
    jsonb_build_object(
      'booking_id', b.id,
      'booking_date', (b.start_time AT TIME ZONE 'Europe/Amsterdam')::date,
      'established_iso', h.established_iso,
      'created_at', b.created_at
    ),
    'pg_cron'
  FROM public.bookings b
  JOIN public.monitoring_alert_hints h ON h.booking_id = b.id
  WHERE (
      b.created_at > now() - interval '20 minutes'
      OR b.updated_at > now() - interval '20 minutes'
    )
    -- R26 FIX (Finding 1): widened from the R23 strict `h.updated_at >= b.updated_at` to
    -- `h.updated_at >= b.updated_at - interval '2 minutes'`. Absorbs realistic clock skew between
    -- the whatsapp-agent edge-runtime clock (hint) and the Postgres server clock (booking, via the
    -- on_booking_updated trigger) so a genuinely-fresh same-turn hint is never spuriously excluded
    -- by a few seconds of drift, while a hint stale by hours from an old unrelated turn is still
    -- (h.updated_at is still far less than b.updated_at - 2 minutes) correctly excluded.
    AND h.updated_at >= b.updated_at - interval '2 minutes'
    AND (b.start_time AT TIME ZONE 'Europe/Amsterdam')::date <> h.established_iso
    AND NOT EXISTS (
      SELECT 1 FROM public.monitoring_alerts a
      WHERE a.details ->> 'booking_id' = b.id::text
        AND a.failure_class IN ('date_mismatch', 'date_mismatch_cron_sweep')
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.scan_recent_booking_date_drift() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_recent_booking_date_drift() TO service_role;

-- =============================================================================
-- SECTION 2 - FINDING 3: widen the heartbeat sweep's recheck_window (alert fatigue)
-- =============================================================================
-- The R9 heartbeat sweep's dedup window (recheck_window, 6 hours) means a stale_heartbeat alert +
-- email fires roughly every 6 hours indefinitely whenever there is no live customer traffic (the
-- pre-launch idle condition today). Not dangerous (the alert is correct, the condition it reports
-- is real and expected pre-launch), but it is ops noise. Widen recheck_window from 6 hours to 24
-- hours so at most one email per day fires for the same expected pre-launch idle condition. A
-- genuine ongoing detection outage still eventually re-surfaces (daily, not every 6 hours) - this
-- only changes the recheck cadence, not whether the condition is ever detected or alerted.
-- config_disabled uses the same recheck_window constant, so it is widened identically; that is
-- intentional (same alert-fatigue reasoning applies equally to both branches).
CREATE OR REPLACE FUNCTION public.scan_monitoring_heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  stale_cutoff constant interval := interval '1 hour';
  -- R26 FIX (Finding 3): widened from 6 hours (R9) to 24 hours to cut a recurring
  -- pre-launch-idle stale_heartbeat email down to at most once per day instead of every 6 hours.
  recheck_window constant interval := interval '24 hours';
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
