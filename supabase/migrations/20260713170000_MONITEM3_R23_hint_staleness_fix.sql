-- R23 REMEDIATION (see ../../launch-ready-loop/_BA_MONITORING_ALERTS_STATE.md R22 finding 3 / R23
-- remediation item 3): R21's fix (20260713160000 migration) added an `OR b.updated_at > now() -
-- interval '20 minutes'` branch to scan_recent_booking_date_drift so a reschedule of an old booking
-- is now caught by the sweep. That branch can false-positive when a reschedule commits WITHOUT a
-- fresh date hint being written this turn (index.ts's own effectiveDateHint/carriedForwardDayHint
-- gating skips the monitoring_alert_hints upsert whenever no fresh/carried-forward date hint exists
-- for the turn - see index.ts ~3330-3341): the hint row then stays stale (established_iso from a
-- PRIOR turn) while the booking's real `updated_at` correctly advances from THIS turn's commit, and
-- the sweep compares a stale hint against a genuinely-updated booking and can wrongly fire.
--
-- This is self-limiting (the sweep's own dedup NOT EXISTS guard means at most one false alert per
-- booking_id) and noisy-direction only (a false positive here never suppresses or masks a true
-- positive - it can only add one extra, incorrect alert). Per the run-spec's own instruction, fixed
-- CONSERVATIVELY: prefer not alerting when the hint might be stale, over anything that risks
-- weakening true-positive detection.
--
-- Fix: add `updated_at` to monitoring_alert_hints, stamped explicitly on every real upsert
-- (index.ts's own hint-upsert call site, this same round) since a bare `.upsert()` only applies a
-- column DEFAULT on INSERT, never on UPDATE/conflict - without an explicit value the column would
-- silently freeze at row-creation time forever and never actually reflect "was this hint refreshed
-- THIS turn". The sweep then only alerts when the hint is at least as fresh as the booking's own
-- last update (h.updated_at >= b.updated_at) - if the hint predates the booking's last real change,
-- comparing them is not meaningful, so that row is skipped this pass rather than risking a false
-- alert. A booking whose hint later DOES get refreshed (e.g. a subsequent turn that does name a
-- fresh date) becomes comparable again on the next sweep run, so this narrows the false-positive
-- window rather than blinding the sweep for that booking permanently.
--
-- New migration, not an in-place edit of either already-applied prior migration (20260713120000
-- created the table, 20260713160000 already replaced the function) - same out-of-band
-- CREATE OR REPLACE / ALTER TABLE ... ADD COLUMN IF NOT EXISTS discipline every prior round in this
-- loop used, both fully re-run-safe.
ALTER TABLE public.monitoring_alert_hints
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing rows to their own created_at (not "now()") so a hint that has ALWAYS been
-- stale relative to its booking does not suddenly look freshly-updated purely because this
-- migration ran - preserves each row's true historical staleness instead of masking it.
UPDATE public.monitoring_alert_hints SET updated_at = created_at WHERE updated_at IS DISTINCT FROM created_at;

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
    -- R23 FIX (gap 3): skip the comparison entirely when the hint is older than the booking's own
    -- last update - a hint that predates the booking's most recent real change is not a meaningful
    -- thing to compare against that booking's CURRENT date, so treat it as "not enough evidence
    -- yet" rather than alerting on it. Conservative: this can only suppress a false alert, never a
    -- true one - a genuine drift where the hint WAS refreshed this turn still has h.updated_at
    -- stamped from the same turn as b.updated_at (index.ts writes both in the same turn's
    -- background block), so h.updated_at >= b.updated_at still holds for the real R127-class bug
    -- shape this sweep exists to catch.
    AND h.updated_at >= b.updated_at
    AND (b.start_time AT TIME ZONE 'Europe/Amsterdam')::date <> h.established_iso
    AND NOT EXISTS (
      SELECT 1 FROM public.monitoring_alerts a
      WHERE a.details ->> 'booking_id' = b.id::text
        AND a.failure_class IN ('date_mismatch', 'date_mismatch_cron_sweep')
    );
END;
$function$;

-- Same explicit-grant discipline as the original/R21 function - a bare REVOKE ALL can still leave a
-- stray default-privilege grant to anon/authenticated on a re-created function object.
REVOKE ALL ON FUNCTION public.scan_recent_booking_date_drift() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_recent_booking_date_drift() TO service_role;
