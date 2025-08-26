-- Fix database function parameter name conflict

DROP FUNCTION IF EXISTS public.get_day_name_dutch(integer);

CREATE OR REPLACE FUNCTION public.get_day_name_dutch(p_day_of_week integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN CASE p_day_of_week
    WHEN 1 THEN 'Maandag'
    WHEN 2 THEN 'Dinsdag'
    WHEN 3 THEN 'Woensdag'
    WHEN 4 THEN 'Donderdag'
    WHEN 5 THEN 'Vrijdag'
    WHEN 6 THEN 'Zaterdag'
    WHEN 7 THEN 'Zondag'
    ELSE 'Onbekend'
  END;
END;
$function$;

-- Fix remaining function security paths
CREATE OR REPLACE FUNCTION public.get_available_slots_range(
  p_calendar_id uuid,
  p_service_type_id uuid,
  p_start_date date,
  p_end_date date
)
 RETURNS TABLE(
  slot_date date,
  slot_start timestamp with time zone,
  slot_end timestamp with time zone,
  is_available boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_duration integer;
  v_timezone text;
  v_current_date date;
  v_current_time time;
  v_slot_time time;
  v_slot_start timestamp with time zone;
  v_slot_end timestamp with time zone;
BEGIN
  -- Get service duration and calendar timezone
  SELECT st.duration, c.timezone
  INTO v_duration, v_timezone
  FROM public.service_types st
  JOIN public.calendars c ON c.id = st.calendar_id
  WHERE st.id = p_service_type_id AND c.id = p_calendar_id;
  
  IF v_duration IS NULL THEN
    RETURN;
  END IF;
  
  -- Loop through each date in range
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    -- Generate slots for this date based on availability rules
    FOR v_current_time IN 
      SELECT ar.start_time
      FROM public.availability_rules ar
      JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
      WHERE sch.calendar_id = p_calendar_id
        AND sch.is_default = true
        AND ar.day_of_week = EXTRACT(DOW FROM v_current_date)
        AND ar.is_available = true
    LOOP
      -- Generate slots from start_time to end_time
      v_slot_time := v_current_time;
      
      -- Create timestamp with timezone
      v_slot_start := (v_current_date || ' ' || v_slot_time)::timestamp AT TIME ZONE v_timezone;
      v_slot_end := v_slot_start + (v_duration || ' minutes')::interval;
      
      slot_date := v_current_date;
      slot_start := v_slot_start;
      slot_end := v_slot_end;
      is_available := NOT EXISTS (
        SELECT 1 FROM public.bookings
        WHERE calendar_id = p_calendar_id
          AND start_time <= v_slot_start
          AND end_time > v_slot_start
          AND status NOT IN ('cancelled', 'no-show')
      );
      
      RETURN NEXT;
      
      -- Move to next slot
      v_slot_time := v_slot_time + (30 || ' minutes')::interval;
    END LOOP;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN;
END;
$function$;