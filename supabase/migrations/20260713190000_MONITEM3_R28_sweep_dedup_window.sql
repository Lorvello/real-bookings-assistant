-- R28 REMEDIATION (see ../../launch-ready-loop/_BA_MONITORING_ALERTS_STATE.md NEXT ITEM / R27 round
-- entry): round-11 adversarial review found scan_recent_booking_date_drift's own dedup guard has NO
-- time bound, unlike scan_monitoring_heartbeat's two dedup guards in the SAME migration file
-- (20260713180000, "AND created_at > now() - recheck_window"). The unbounded form:
--   AND NOT EXISTS (
--     SELECT 1 FROM public.monitoring_alerts a
--     WHERE a.details ->> 'booking_id' = b.id::text
--       AND a.failure_class IN ('date_mismatch', 'date_mismatch_cron_sweep')
--   );
-- means that once a booking has EVER produced one date_mismatch/date_mismatch_cron_sweep alert, it
-- is PERMANENTLY excluded from this sweep for the rest of its lifetime - even if it is rescheduled
-- again later with a wholly independent, genuinely different date-mismatch incident that the
-- in-turn check also misses. That second real incident is silently swallowed forever, zero alert.
-- Same silent-loss bug CLASS as R22/R23's thread-hijack dedup fix, just never extended to this
-- class-1 sweep guard until now.
--
-- Fix: scope the guard to a bounded recent window, mirroring the heartbeat sweep's own correct
-- pattern in this same file, instead of "ever, for this booking_id".
--
-- Window choice (60 minutes): the outer WHERE clause already limits which bookings this function
-- even considers to those with `created_at` or `updated_at` inside the last 20 minutes (R21's own
-- reschedule-drift branch). Once a booking falls outside that 20-minute qualification window, it
-- stops matching the outer WHERE entirely regardless of this dedup guard, so the guard only needs
-- to survive long enough to prevent duplicate alerts for the SAME still-unresolved incident across
-- however many 15-minute pg_cron sweep runs (jobid 8) land inside that 20-minute qualification
-- window - realistically 1-2 runs, so roughly 20-35 minutes of real overlap risk. 60 minutes gives a
-- comfortable margin above that (roughly 2x the qualification window plus a full extra cron cycle)
-- while remaining clearly bounded, not "forever" - a booking rescheduled again outside that hour
-- with a genuinely new mismatch is no longer suppressed and can alert again, closing the R27 gap.
--
-- New migration, not an in-place edit of the already-applied 20260713180000/20260713170000 files -
-- same out-of-band CREATE OR REPLACE / re-run-safe discipline every prior round in this loop used.
-- Everything else about the function (the outer WHERE, the clock-skew margin from R26, the
-- established_iso comparison, grants) is left byte-for-byte identical to R26's version; only the
-- dedup guard's time bound changed.
CREATE OR REPLACE FUNCTION public.scan_recent_booking_date_drift()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  -- R28 FIX: bounded recheck window for the dedup guard below, mirroring
  -- scan_monitoring_heartbeat's own recheck_window pattern (20260713180000). See header comment for
  -- why 60 minutes is a safe margin above the sweep's real overlap risk without recreating the old
  -- permanent-suppression bug.
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
    -- R26 FIX (Finding 1, unchanged this round): absorbs realistic clock skew between the
    -- whatsapp-agent edge-runtime clock (hint) and the Postgres server clock (booking).
    AND h.updated_at >= b.updated_at - interval '2 minutes'
    AND (b.start_time AT TIME ZONE 'Europe/Amsterdam')::date <> h.established_iso
    -- R28 FIX: was an unbounded "ever, for this booking_id" NOT EXISTS (permanently suppressed any
    -- booking that ever got one date_mismatch alert). Now scoped to recheck_window, same pattern as
    -- scan_monitoring_heartbeat's two guards: still prevents duplicate alerts for the SAME
    -- still-unresolved incident within the window, but a genuinely new, later incident on the same
    -- booking (outside the window) is no longer silently swallowed forever.
    AND NOT EXISTS (
      SELECT 1 FROM public.monitoring_alerts a
      WHERE a.details ->> 'booking_id' = b.id::text
        AND a.failure_class IN ('date_mismatch', 'date_mismatch_cron_sweep')
        AND a.created_at > now() - recheck_window
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.scan_recent_booking_date_drift() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_recent_booking_date_drift() TO service_role;
