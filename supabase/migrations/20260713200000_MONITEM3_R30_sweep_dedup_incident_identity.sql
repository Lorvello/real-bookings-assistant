-- R30 REMEDIATION (see ../../launch-ready-loop/_BA_MONITORING_ALERTS_STATE.md NEXT ITEM / R29 round
-- entry): round-12 adversarial review found scan_recent_booking_date_drift's dedup guard, even after
-- R28's 60-minute window fix (20260713190000), still only compares booking_id + failure_class + the
-- time window. It has NO comparison to the actual mismatched date (established_iso). Scenario:
-- booking X reschedules to date A, the in-turn check misses it, the sweep catches it (alert row 1,
-- established_iso=A). Within the same 60-minute window, booking X reschedules AGAIN to a DIFFERENT
-- date C with a DIFFERENT mismatch (established_iso=D), the in-turn check misses this one too - the
-- sweep's NOT EXISTS finds row 1 for the same booking_id within the window and silently skips, so
-- incident 2's genuinely different evidence is never written/emailed. Same silent-loss bug CLASS as
-- R22/R23/R27/R28, one dimension deeper: R28 bounded the guard in TIME, this fix bounds it in
-- INCIDENT IDENTITY on top of that.
--
-- Fix: add established_iso to the dedup comparison (a.details ->> 'established_iso', stored as a
-- plain string per monitoringAlerts.ts's AlertDetails shape and index.ts's insert call sites - both
-- confirmed by reading the source directly, no cast needed, plain text = text comparison), so the
-- guard only suppresses when BOTH booking_id AND established_iso match an existing recent alert row.
-- A genuinely different established_iso on the same booking within the window now correctly produces
-- a NEW alert, while the SAME still-unresolved incident (same booking_id AND same established_iso)
-- within the window still correctly does not re-alert - the original R7 dedup intent, now scoped to
-- the actual incident rather than merely the booking.
--
-- New migration, not an in-place edit of the already-applied 20260713190000 file - same out-of-band
-- CREATE OR REPLACE / re-run-safe discipline every prior round in this loop used. Everything else
-- about the function (the outer WHERE, R26's clock-skew margin, R28's recheck_window, grants) is left
-- byte-for-byte identical to R28's version; only the dedup guard gained one additional AND condition.
CREATE OR REPLACE FUNCTION public.scan_recent_booking_date_drift()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  -- R28 (unchanged this round): bounded recheck window for the dedup guard below, mirroring
  -- scan_monitoring_heartbeat's own recheck_window pattern (20260713180000).
  recheck_window constant interval := interval '60 minutes';
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
    -- R26 FIX (unchanged this round): absorbs realistic clock skew between the whatsapp-agent
    -- edge-runtime clock (hint) and the Postgres server clock (booking).
    AND h.updated_at >= b.updated_at - interval '2 minutes'
    AND (b.start_time AT TIME ZONE 'Europe/Amsterdam')::date <> h.established_iso
    -- R28 FIX (unchanged this round): bounded to recheck_window instead of "ever, for this
    -- booking_id".
    -- R30 FIX: added the established_iso comparison. Previously this guard only checked
    -- booking_id + failure_class + window, so a SECOND genuinely different mismatch on the SAME
    -- booking within the window was silently swallowed (the guard couldn't tell "same unresolved
    -- incident" from "a new, different incident on the same booking"). Now it also requires the
    -- existing alert's stored established_iso to match the CURRENT mismatch's established_iso
    -- before suppressing - a different established_iso is a different incident and must still
    -- alert.
    AND NOT EXISTS (
      SELECT 1 FROM public.monitoring_alerts a
      WHERE a.details ->> 'booking_id' = b.id::text
        AND a.failure_class IN ('date_mismatch', 'date_mismatch_cron_sweep')
        AND a.created_at > now() - recheck_window
        AND a.details ->> 'established_iso' = h.established_iso::text
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.scan_recent_booking_date_drift() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_recent_booking_date_drift() TO service_role;
