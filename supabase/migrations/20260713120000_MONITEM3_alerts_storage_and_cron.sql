-- MONITORING/ALERTS ITEM 3 (see ../../launch-ready-loop/MONITORING_ALERTS_DESIGN.md, Item 1's
-- approved design, and ../../launch-ready-loop/GOAL_PROMPT_BA_MONITORING_ALERTS.md backlog Item 3).
--
-- Storage for the two detection classes the whatsapp-agent's monitoringAlerts.ts now writes to
-- in-turn, plus a class-1 pg_cron belt-and-suspenders sweep (design section 3). Strictly
-- additive: no existing table/column/trigger is touched, nothing here runs on the live
-- conversation flow, this migration only adds new objects that a detection bug can only ever
-- fail to write, never mutate a real booking or reply.

-- 1. monitoring_alerts: the storage shape from design section 6.
CREATE TABLE public.monitoring_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_class   text NOT NULL,
  conversation_id uuid,
  contact_phone   text,
  turn_id         text,
  details         jsonb NOT NULL,
  detected_by     text NOT NULL DEFAULT 'in_turn' CHECK (detected_by IN ('in_turn', 'pg_cron', 'mechanism_test')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  notified_at     timestamptz
);

CREATE INDEX monitoring_alerts_unnotified_idx ON public.monitoring_alerts (created_at)
  WHERE notified_at IS NULL;

COMMENT ON TABLE public.monitoring_alerts IS
  'Item 3 (detection-only, no delivery yet): rows written by whatsapp-agent/monitoringAlerts.ts in-turn checks (detected_by=in_turn), the class-1 pg_cron sweep (detected_by=pg_cron), or a mechanism-level test (detected_by=mechanism_test). Item 4 reads unnotified rows and stamps notified_at; this table never itself triggers delivery.';

-- No authenticated/anon surface exists for this yet (no dashboard UI in this round's scope);
-- writes come only from the edge function's service_role client and the pg_cron function below.
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monitoring_alerts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.monitoring_alerts TO service_role;

-- 2. monitoring_alert_config: destination is DATA, not code (design section 4), so it can change
-- without a redeploy. Item 2's human-gate is CLOSED: Mathew confirmed business01003@gmail.com as
-- the destination. `enabled` stays false here on purpose: Item 4 (delivery, out of scope this
-- round) is the one that wires an actual send and flips it on once that path is built and proven,
-- per the run-spec's decouple-detection-from-delivery rule.
CREATE TABLE public.monitoring_alert_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_email text,
  enabled     boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_alert_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monitoring_alert_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.monitoring_alert_config TO service_role;

INSERT INTO public.monitoring_alert_config (alert_email, enabled)
VALUES ('business01003@gmail.com', false);

-- 3. monitoring_alert_hints: the small side table design section 3 flagged as an open choice for
-- Item 3 to decide (side table vs a new column on bookings). Decided here: a side table, since
-- the established_iso value is purely detection-support, never read by any customer-facing path,
-- and a side table needs no change to the live bookings schema at all. Populated opportunistically
-- by index.ts's monitoring block alongside the in-turn check, whenever a deterministic date hint
-- fired for a committed mutation this turn; the cron sweep below only compares rows that have one,
-- so it is a pure defense-in-depth layer, never a replacement for the in-turn check.
CREATE TABLE public.monitoring_alert_hints (
  booking_id      uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  established_iso date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_alert_hints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monitoring_alert_hints FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.monitoring_alert_hints TO service_role;

-- 4. Class-1 pg_cron sweep (design section 3), mirroring cancel_overdue_unpaid_bookings's own
-- function-then-cron.schedule shape. Purely a read of bookings/monitoring_alert_hints plus an
-- INSERT into monitoring_alerts; never touches a bookings row.
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
  WHERE b.created_at > now() - interval '20 minutes'
    AND (b.start_time AT TIME ZONE 'Europe/Amsterdam')::date <> h.established_iso
    AND NOT EXISTS (
      SELECT 1 FROM public.monitoring_alerts a
      WHERE a.details ->> 'booking_id' = b.id::text
        AND a.failure_class IN ('date_mismatch', 'date_mismatch_cron_sweep')
    );
END;
$function$;

-- Same explicit-grant discipline as every other new function in this project (R46's own note:
-- REVOKE FROM PUBLIC alone can still leave a stray default-privilege grant to anon/authenticated
-- on a brand-new function; both must be revoked explicitly).
REVOKE ALL ON FUNCTION public.scan_recent_booking_date_drift() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_recent_booking_date_drift() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- cron.schedule upserts by jobname, safe to re-run. Every 15 minutes, matching
-- cancel-overdue-unpaid-bookings's own cadence.
SELECT cron.schedule(
  'scan-recent-booking-date-drift',
  '*/15 * * * *',
  $$SELECT public.scan_recent_booking_date_drift();$$
);
