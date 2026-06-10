-- Fix: trigger_business_overview_v2_refresh referenced NEW.user_id for service_types,
-- but that table has no user_id column -> EVERY service_types insert/update failed with
-- 42703 "record new has no field user_id" (broke all service creation). Derive user_id
-- from the calendar, like bookings/calendar_settings do.
CREATE OR REPLACE FUNCTION public.trigger_business_overview_v2_refresh()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'calendars' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    SELECT c.user_id INTO v_user_id FROM calendars c WHERE c.id = COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'service_types' THEN
    SELECT c.user_id INTO v_user_id FROM calendars c WHERE c.id = COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'calendar_settings' THEN
    SELECT c.user_id INTO v_user_id FROM calendars c WHERE c.id = COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'availability_rules' THEN
    SELECT c.user_id INTO v_user_id FROM availability_schedules s JOIN calendars c ON c.id = s.calendar_id WHERE s.id = COALESCE(NEW.schedule_id, OLD.schedule_id);
  ELSIF TG_TABLE_NAME = 'users' THEN
    v_user_id := COALESCE(NEW.id, OLD.id);
  END IF;
  IF v_user_id IS NOT NULL THEN
    PERFORM refresh_business_overview_v2(v_user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
