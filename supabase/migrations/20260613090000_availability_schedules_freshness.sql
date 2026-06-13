-- LR-R53: business_overview-freshness gap dichten voor availability_schedules.
-- De agent leest business_overview (o.a. opening_hours, dat availability_schedules
-- JOIN availability_rules WHERE is_default leest). Er stond een refresh-trigger op
-- availability_rules maar NIET op availability_schedules, dus een schedule-wijziging
-- (bv. een ander schema als default zetten, of is_default/active togglen) ververste
-- de agent-kennis niet -> stale opening_hours mogelijk.
--
-- Fix: voeg availability_schedules toe aan de generieke row-refresh-functie
-- (calendar_id staat direct op de row) en maak de bijbehorende trigger.

CREATE OR REPLACE FUNCTION public.refresh_v1_business_overview_for_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_calendar_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('service_types', 'calendar_settings', 'bookings', 'payment_settings', 'availability_schedules') THEN
    v_calendar_id := COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'calendars' THEN
    v_calendar_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'availability_rules' THEN
    SELECT s.calendar_id INTO v_calendar_id
    FROM availability_schedules s
    WHERE s.id = COALESCE(NEW.schedule_id, OLD.schedule_id);
  END IF;

  IF v_calendar_id IS NOT NULL THEN
    BEGIN
      PERFORM refresh_business_overview(v_calendar_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'refresh_business_overview failed for calendar %: %', v_calendar_id, SQLERRM;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_availability_schedules_refresh_bo_v1 ON availability_schedules;
CREATE TRIGGER trg_availability_schedules_refresh_bo_v1
  AFTER INSERT OR UPDATE OR DELETE ON availability_schedules
  FOR EACH ROW EXECUTE FUNCTION refresh_v1_business_overview_for_row();
