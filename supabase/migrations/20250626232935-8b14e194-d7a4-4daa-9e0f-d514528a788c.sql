
-- Stap 1: Verwijder eerst ALLE triggers die afhankelijk zijn van de oude functies
DROP TRIGGER IF EXISTS validate_availability_rules_trigger ON public.availability_rules;
DROP TRIGGER IF EXISTS trigger_validate_availability_rules ON public.availability_rules;

-- Verwijder nu alle oude validatie functies
DROP FUNCTION IF EXISTS public.validate_availability_rules() CASCADE;
DROP FUNCTION IF EXISTS public.validate_availability_times() CASCADE;

-- Verwijder alle oude check constraints
ALTER TABLE public.availability_rules 
DROP CONSTRAINT IF EXISTS check_day_of_week;

ALTER TABLE public.availability_rules 
DROP CONSTRAINT IF EXISTS availability_rules_day_of_week_check;

-- Update alle bestaande records van zondag (0) naar zondag (7)
UPDATE public.availability_rules 
SET day_of_week = 7
WHERE day_of_week = 0;

-- Voeg nieuwe constraint toe voor het nieuwe systeem (1-7)
ALTER TABLE public.availability_rules 
ADD CONSTRAINT availability_rules_day_of_week_check 
CHECK (day_of_week >= 1 AND day_of_week <= 7);

-- Herdefinieer alle functies met het nieuwe systeem
CREATE OR REPLACE FUNCTION public.get_day_name_dutch(day_num integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE day_num
    WHEN 1 THEN RETURN 'Maandag';
    WHEN 2 THEN RETURN 'Dinsdag';
    WHEN 3 THEN RETURN 'Woensdag';
    WHEN 4 THEN RETURN 'Donderdag';
    WHEN 5 THEN RETURN 'Vrijdag';
    WHEN 6 THEN RETURN 'Zaterdag';
    WHEN 7 THEN RETURN 'Zondag';
    ELSE RETURN 'Onbekend';
  END CASE;
END;
$$;

-- Update N8N helper function
CREATE OR REPLACE FUNCTION public.get_n8n_day_mapping()
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN jsonb_build_object(
    'day_mapping', jsonb_build_object(
      '1', 'Maandag', 
      '2', 'Dinsdag',
      '3', 'Woensdag',
      '4', 'Donderdag',
      '5', 'Vrijdag',
      '6', 'Zaterdag',
      '7', 'Zondag'
    ),
    'instructions', 'day_of_week in availability_rules uses 1=Monday, 2=Tuesday, ..., 7=Sunday format. Use formatted_opening_hours for display or day_name_dutch from availability_rules JSON.'
  );
END;
$$;

-- Nieuwe validatie functie met het juiste systeem
CREATE OR REPLACE FUNCTION public.validate_availability_times()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate day_of_week is between 1 (Monday) and 7 (Sunday)
  IF NEW.day_of_week < 1 OR NEW.day_of_week > 7 THEN
    RAISE EXCEPTION 'Day of week must be between 1 (Monday) and 7 (Sunday)';
  END IF;
  
  -- Validate start_time is before end_time
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  -- Validate times are within reasonable range
  IF NEW.start_time < '00:00'::time OR NEW.start_time > '23:59'::time THEN
    RAISE EXCEPTION 'Start time must be between 00:00 and 23:59';
  END IF;
  
  IF NEW.end_time < '00:00'::time OR NEW.end_time > '23:59'::time THEN
    RAISE EXCEPTION 'End time must be between 00:00 and 23:59';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Voeg nieuwe trigger toe
CREATE TRIGGER validate_availability_rules_trigger
  BEFORE INSERT OR UPDATE ON public.availability_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_availability_times();

-- Update calendar creation function voor nieuwe kalenders
CREATE OR REPLACE FUNCTION public.handle_new_calendar_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  schedule_id uuid;
BEGIN
  -- Create default availability schedule for new calendar
  INSERT INTO public.availability_schedules (calendar_id, name, is_default)
  VALUES (new.id, 'Standaard Schema', true)
  RETURNING id INTO schedule_id;
  
  -- Add default working hours using Monday=1 to Sunday=7 system
  INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
  VALUES 
    (schedule_id, 1, '09:00'::time, '17:00'::time, true), -- Maandag
    (schedule_id, 2, '09:00'::time, '17:00'::time, true), -- Dinsdag
    (schedule_id, 3, '09:00'::time, '17:00'::time, true), -- Woensdag
    (schedule_id, 4, '09:00'::time, '17:00'::time, true), -- Donderdag
    (schedule_id, 5, '09:00'::time, '17:00'::time, true), -- Vrijdag
    (schedule_id, 6, '09:00'::time, '17:00'::time, false), -- Zaterdag (niet beschikbaar)
    (schedule_id, 7, '09:00'::time, '17:00'::time, false); -- Zondag (niet beschikbaar)
  
  RETURN new;
END;
$$;

-- Update availability check function
CREATE OR REPLACE FUNCTION public.check_availability(p_calendar_id uuid, p_datetime timestamp with time zone, p_duration_minutes integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  slot_date date;
  slot_time time;
  slot_end_time time;
  day_of_week integer;
  schedule_record record;
  rule_record record;
  override_record record;
BEGIN
  -- Convert datetime to date and time
  slot_date := p_datetime::date;
  slot_time := p_datetime::time;
  slot_end_time := (p_datetime + (p_duration_minutes || ' minutes')::interval)::time;
  
  -- Convert PostgreSQL DOW (0=Sunday) to our system (1=Monday to 7=Sunday)
  day_of_week := CASE EXTRACT(DOW FROM p_datetime)::integer
    WHEN 0 THEN 7  -- Sunday -> 7
    ELSE EXTRACT(DOW FROM p_datetime)::integer  -- Monday(1) to Saturday(6) stay same
  END;
  
  -- Check for date override first
  SELECT * INTO override_record
  FROM public.availability_overrides
  WHERE calendar_id = p_calendar_id 
    AND date = slot_date;
  
  IF FOUND THEN
    IF NOT override_record.is_available THEN
      RETURN false;
    END IF;
    
    IF override_record.start_time IS NOT NULL AND override_record.end_time IS NOT NULL THEN
      IF slot_time >= override_record.start_time AND slot_end_time <= override_record.end_time THEN
        RETURN true;
      ELSE
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  -- Get default schedule
  SELECT * INTO schedule_record
  FROM public.availability_schedules
  WHERE calendar_id = p_calendar_id 
    AND is_default = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check availability rule for this day
  SELECT * INTO rule_record
  FROM public.availability_rules
  WHERE schedule_id = schedule_record.id 
    AND day_of_week = day_of_week;
  
  IF NOT FOUND OR NOT rule_record.is_available THEN
    RETURN false;
  END IF;
  
  -- Check if time slot falls within working hours
  IF slot_time >= rule_record.start_time AND slot_end_time <= rule_record.end_time THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Force refresh materialized view
REFRESH MATERIALIZED VIEW public.business_availability_overview;

-- Verificatie dat alles correct is
SELECT 'Migratie succesvol voltooid!' as status;
SELECT day_of_week, COUNT(*) as count, public.get_day_name_dutch(day_of_week) as day_name
FROM public.availability_rules 
GROUP BY day_of_week 
ORDER BY day_of_week;
