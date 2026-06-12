-- Keep the AGENT's knowledge table (business_overview, v1 — read by the n8n
-- WhatsApp agent's "get business data" node) reliably fresh.
--
-- Problem: the existing v1 refresh triggers on service_types / calendar_settings /
-- calendars / bookings call trigger_business_overview_refresh(), which only does
-- pg_notify('refresh_business_overview', ...). NOTHING in the app LISTENs to that
-- channel (the only realtime listener, useWebhookAutoProcessor, is for the
-- 'process_webhooks' broadcast — unrelated). So those triggers are no-ops: the
-- agent's business_overview row is only rebuilt when a `users` field changes
-- (the direct users trigger) or on a manual refresh_business_overview() call.
-- => A business that adds a service, changes a booking policy, edits availability,
--    or renames a calendar — without touching their profile — leaves the agent
--    reading STALE data (wrong services, wrong rules, wrong hours).
--
-- Fix: replace the no-op pg_notify triggers with DIRECT, single-calendar refreshes
-- (refresh_business_overview(calendar_id)). The refresh is wrapped in an exception
-- block so a refresh failure can NEVER roll back the underlying booking/settings
-- write (same safety principle as users_refresh_business_overview from LR-R16).
-- business_overview_v2 (separate table, separate v2 triggers) is left untouched.

CREATE OR REPLACE FUNCTION public.refresh_v1_business_overview_for_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_calendar_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('service_types', 'calendar_settings', 'bookings') THEN
    v_calendar_id := COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'calendars' THEN
    v_calendar_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'availability_rules' THEN
    SELECT s.calendar_id INTO v_calendar_id
    FROM availability_schedules s
    WHERE s.id = COALESCE(NEW.schedule_id, OLD.schedule_id);
  END IF;

  IF v_calendar_id IS NOT NULL THEN
    -- Exception-safe: a refresh error must never block the actual write.
    BEGIN
      PERFORM refresh_business_overview(v_calendar_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'refresh_business_overview failed for calendar %: %', v_calendar_id, SQLERRM;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Drop the defunct pg_notify-based v1 triggers (no consumer → no-ops).
DROP TRIGGER IF EXISTS trigger_service_types_business_overview_refresh ON public.service_types;
DROP TRIGGER IF EXISTS trigger_refresh_on_calendar_settings_update ON public.calendar_settings;
DROP TRIGGER IF EXISTS trigger_refresh_on_calendar_update ON public.calendars;
DROP TRIGGER IF EXISTS trigger_bookings_business_overview_refresh ON public.bookings;

-- Direct, exception-safe refresh on every change that the agent must see.
CREATE TRIGGER trg_service_types_refresh_bo_v1
  AFTER INSERT OR UPDATE OR DELETE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION refresh_v1_business_overview_for_row();

CREATE TRIGGER trg_calendar_settings_refresh_bo_v1
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_settings
  FOR EACH ROW EXECUTE FUNCTION refresh_v1_business_overview_for_row();

CREATE TRIGGER trg_calendars_refresh_bo_v1
  AFTER INSERT OR UPDATE OR DELETE ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION refresh_v1_business_overview_for_row();

CREATE TRIGGER trg_availability_rules_refresh_bo_v1
  AFTER INSERT OR UPDATE OR DELETE ON public.availability_rules
  FOR EACH ROW EXECUTE FUNCTION refresh_v1_business_overview_for_row();

CREATE TRIGGER trg_bookings_refresh_bo_v1
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION refresh_v1_business_overview_for_row();
