
-- Fix de trigger functie - het probleem was dat NEW niet bestaat bij DELETE
CREATE OR REPLACE FUNCTION public.trigger_dashboard_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_calendar_id uuid;
BEGIN
  -- Bepaal calendar_id afhankelijk van operatie
  IF TG_OP = 'DELETE' THEN
    target_calendar_id := OLD.calendar_id;
  ELSE
    target_calendar_id := NEW.calendar_id;
  END IF;
  
  -- Refresh in background (non-blocking)
  PERFORM pg_notify('dashboard_refresh', target_calendar_id::text);
  
  -- Return juiste record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop en recreate de trigger om zeker te zijn
DROP TRIGGER IF EXISTS booking_dashboard_refresh ON public.bookings;
CREATE TRIGGER booking_dashboard_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_dashboard_refresh();

-- Refresh de materialized view met initiële data
REFRESH MATERIALIZED VIEW public.dashboard_metrics_mv;
