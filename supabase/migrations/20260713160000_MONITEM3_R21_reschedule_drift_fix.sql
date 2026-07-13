-- R21 REMEDIATION (see ../../launch-ready-loop/_BA_MONITORING_ALERTS_STATE.md R20 finding 1 /
-- R21 remediation item 1): scan_recent_booking_date_drift (20260713120000_MONITEM3_
-- alerts_storage_and_cron.sql) filtered candidate bookings on `b.created_at > now() - interval
-- '20 minutes'` only. reschedule_appointment bumps `updated_at`, never `created_at`, so a
-- reschedule of a booking created more than 20 minutes ago was invisible to this sweep - the cron
-- belt-and-suspenders layer effectively only ever covered book_appointment, not
-- reschedule_appointment.
--
-- This is a NEW migration, not an in-place edit of the already-applied 20260713120000 file: the
-- live DB already has the old function deployed (applied out-of-band via the Management API, see
-- the R20/R21 digest), so CREATE OR REPLACE is the correct re-run-safe way to ship the fix.
--
-- Fix: OR in a match on `b.updated_at` within the same 20-minute window, so a recent reschedule is
-- caught regardless of how old the booking itself is. Everything else about the function
-- (dedup NOT EXISTS clause, join shape, jsonb payload, grants) is identical to the original.
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
    AND (b.start_time AT TIME ZONE 'Europe/Amsterdam')::date <> h.established_iso
    AND NOT EXISTS (
      SELECT 1 FROM public.monitoring_alerts a
      WHERE a.details ->> 'booking_id' = b.id::text
        AND a.failure_class IN ('date_mismatch', 'date_mismatch_cron_sweep')
    );
END;
$function$;

-- Same explicit-grant discipline as the original function (a bare REVOKE ALL FROM PUBLIC can still
-- leave a stray default-privilege grant to anon/authenticated on a re-created function object).
REVOKE ALL ON FUNCTION public.scan_recent_booking_date_drift() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_recent_booking_date_drift() TO service_role;
