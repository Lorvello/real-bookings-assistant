-- Fix trigger to actually refresh the business_overview_v2 instead of just sending a notification
CREATE OR REPLACE FUNCTION public.trigger_business_overview_v2_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Determine the user_id based on the table and operation
  IF TG_TABLE_NAME = 'calendars' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'bookings' THEN
    SELECT c.user_id INTO v_user_id
    FROM calendars c
    WHERE c.id = COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'service_types' THEN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_TABLE_NAME = 'calendar_settings' THEN
    SELECT c.user_id INTO v_user_id
    FROM calendars c
    WHERE c.id = COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'availability_rules' THEN
    SELECT c.user_id INTO v_user_id
    FROM availability_schedules s
    JOIN calendars c ON c.id = s.calendar_id
    WHERE s.id = COALESCE(NEW.schedule_id, OLD.schedule_id);
  ELSIF TG_TABLE_NAME = 'users' THEN
    v_user_id := COALESCE(NEW.id, OLD.id);
  END IF;

  -- Refresh only for the affected user (more efficient)
  IF v_user_id IS NOT NULL THEN
    PERFORM refresh_business_overview_v2(v_user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;