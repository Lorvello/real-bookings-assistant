-- Update get_available_slots function to correctly apply buffer_time in conflict check
CREATE OR REPLACE FUNCTION public.get_available_slots(p_calendar_id uuid, p_service_type_id uuid, p_date date, p_timezone text DEFAULT 'Europe/Amsterdam'::text)
RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_service_duration integer;
  v_preparation_time integer;
  v_cleanup_time integer;
  v_slot_duration integer;
  v_buffer_time integer;
  v_booking_window_days integer;
  v_minimum_notice_hours integer;
  v_schedule_record record;
  v_rule_record record;
  v_override_record record;
  v_current_slot timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_day_start timestamp with time zone;
  v_day_end timestamp with time zone;
  v_day_of_week integer;
  v_min_booking_time timestamp with time zone;
  v_max_booking_date date;
BEGIN
  -- Haal service type informatie op
  SELECT duration, preparation_time, cleanup_time
  INTO v_service_duration, v_preparation_time, v_cleanup_time
  FROM public.service_types
  WHERE id = p_service_type_id AND calendar_id = p_calendar_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Haal calendar settings op
  SELECT slot_duration, buffer_time, booking_window_days, minimum_notice_hours
  INTO v_slot_duration, v_buffer_time, v_booking_window_days, v_minimum_notice_hours
  FROM public.calendar_settings
  WHERE calendar_id = p_calendar_id;
  
  -- Gebruik standaard waarden als settings niet gevonden
  v_slot_duration := COALESCE(v_slot_duration, 30);
  v_buffer_time := COALESCE(v_buffer_time, 0);
  v_booking_window_days := COALESCE(v_booking_window_days, 60);
  v_minimum_notice_hours := COALESCE(v_minimum_notice_hours, 24);
  v_preparation_time := COALESCE(v_preparation_time, 0);
  v_cleanup_time := COALESCE(v_cleanup_time, 0);
  
  -- Controleer booking window
  v_max_booking_date := CURRENT_DATE + (v_booking_window_days || ' days')::interval;
  IF p_date > v_max_booking_date THEN
    RETURN;
  END IF;
  
  -- Controleer minimum notice tijd
  v_min_booking_time := NOW() + (v_minimum_notice_hours || ' hours')::interval;
  
  -- Bereken dag van de week (0 = zondag, 1 = maandag, etc.)
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;
  
  -- Controleer eerst voor availability overrides
  SELECT * INTO v_override_record
  FROM public.availability_overrides
  WHERE calendar_id = p_calendar_id AND date = p_date;
  
  IF FOUND THEN
    -- Als er een override is en deze is niet beschikbaar, return geen slots
    IF NOT v_override_record.is_available THEN
      RETURN;
    END IF;
    
    -- Als override specifieke tijden heeft, gebruik die
    IF v_override_record.start_time IS NOT NULL AND v_override_record.end_time IS NOT NULL THEN
      v_day_start := (p_date + v_override_record.start_time)::timestamp with time zone AT TIME ZONE p_timezone;
      v_day_end := (p_date + v_override_record.end_time)::timestamp with time zone AT TIME ZONE p_timezone;
    ELSE
      -- Gebruik normale availability rules
      SELECT * INTO v_schedule_record
      FROM public.availability_schedules
      WHERE calendar_id = p_calendar_id AND is_default = true
      LIMIT 1;
      
      IF NOT FOUND THEN
        RETURN;
      END IF;
      
      SELECT * INTO v_rule_record
      FROM public.availability_rules
      WHERE schedule_id = v_schedule_record.id AND day_of_week = v_day_of_week;
      
      IF NOT FOUND OR NOT v_rule_record.is_available THEN
        RETURN;
      END IF;
      
      v_day_start := (p_date + v_rule_record.start_time)::timestamp with time zone AT TIME ZONE p_timezone;
      v_day_end := (p_date + v_rule_record.end_time)::timestamp with time zone AT TIME ZONE p_timezone;
    END IF;
  ELSE
    -- Geen override, gebruik normale availability rules
    SELECT * INTO v_schedule_record
    FROM public.availability_schedules
    WHERE calendar_id = p_calendar_id AND is_default = true
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN;
    END IF;
    
    SELECT * INTO v_rule_record
    FROM public.availability_rules
    WHERE schedule_id = v_schedule_record.id AND day_of_week = v_day_of_week;
    
    IF NOT FOUND OR NOT v_rule_record.is_available THEN
      RETURN;
    END IF;
    
    v_day_start := (p_date + v_rule_record.start_time)::timestamp with time zone AT TIME ZONE p_timezone;
    v_day_end := (p_date + v_rule_record.end_time)::timestamp with time zone AT TIME ZONE p_timezone;
  END IF;
  
  -- Genereer tijdslots
  v_current_slot := v_day_start;
  
  WHILE v_current_slot < v_day_end LOOP
    v_slot_end := v_current_slot + (v_service_duration || ' minutes')::interval;
    
    -- Controleer of slot binnen werkuren valt
    IF v_slot_end <= v_day_end THEN
      -- Controleer minimum notice tijd
      IF v_current_slot >= v_min_booking_time THEN
        -- Controleer voor booking conflicten (inclusief preparation, cleanup EN buffer tijd)
        -- Buffer time wordt aan beide kanten toegevoegd voor correcte spacing tussen boekingen
        RETURN QUERY
        SELECT 
          v_current_slot,
          v_slot_end,
          NOT public.check_booking_conflicts(
            p_calendar_id,
            v_current_slot - ((v_preparation_time + v_buffer_time) || ' minutes')::interval,
            v_slot_end + ((v_cleanup_time + v_buffer_time) || ' minutes')::interval,
            NULL
          );
      ELSE
        -- Slot is te vroeg (binnen minimum notice tijd)
        RETURN QUERY
        SELECT v_current_slot, v_slot_end, false;
      END IF;
    END IF;
    
    -- Ga naar volgende slot
    v_current_slot := v_current_slot + (v_slot_duration || ' minutes')::interval;
  END LOOP;
  
  RETURN;
END;
$function$;