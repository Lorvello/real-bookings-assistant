
-- Functie om beschikbare tijdslots te genereren
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_calendar_id uuid,
  p_service_type_id uuid,
  p_date date,
  p_timezone text DEFAULT 'Europe/Amsterdam'
)
RETURNS TABLE (
  slot_start timestamp with time zone,
  slot_end timestamp with time zone,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
        -- Controleer voor booking conflicten (inclusief preparation en cleanup tijd)
        RETURN QUERY
        SELECT 
          v_current_slot,
          v_slot_end,
          NOT public.check_booking_conflicts(
            p_calendar_id,
            v_current_slot - (v_preparation_time || ' minutes')::interval,
            v_slot_end + (v_cleanup_time || ' minutes')::interval,
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
$$;

-- View voor eenvoudige slot queries
CREATE OR REPLACE VIEW public.available_slots_view AS
SELECT 
  c.id as calendar_id,
  c.name as calendar_name,
  c.slug as calendar_slug,
  st.id as service_type_id,
  st.name as service_name,
  st.duration as service_duration,
  st.price as service_price,
  slots.slot_start,
  slots.slot_end,
  slots.is_available,
  EXTRACT(EPOCH FROM (slots.slot_end - slots.slot_start)) / 60 as duration_minutes
FROM public.calendars c
CROSS JOIN public.service_types st
CROSS JOIN LATERAL public.get_available_slots(
  c.id, 
  st.id, 
  CURRENT_DATE,
  COALESCE(c.timezone, 'Europe/Amsterdam')
) as slots
WHERE st.calendar_id = c.id 
  AND st.is_active = true 
  AND c.is_active = true;

-- Hulpfunctie om slots voor meerdere dagen op te halen
CREATE OR REPLACE FUNCTION public.get_available_slots_range(
  p_calendar_id uuid,
  p_service_type_id uuid,
  p_start_date date,
  p_end_date date,
  p_timezone text DEFAULT 'Europe/Amsterdam'
)
RETURNS TABLE (
  slot_date date,
  slot_start timestamp with time zone,
  slot_end timestamp with time zone,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_current_date date;
BEGIN
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    RETURN QUERY
    SELECT 
      v_current_date,
      slots.slot_start,
      slots.slot_end,
      slots.is_available
    FROM public.get_available_slots(
      p_calendar_id,
      p_service_type_id,
      v_current_date,
      p_timezone
    ) as slots;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN;
END;
$$;

-- Index voor betere performance bij slot queries
CREATE INDEX IF NOT EXISTS idx_availability_rules_schedule_day 
ON public.availability_rules(schedule_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_availability_overrides_calendar_date 
ON public.availability_overrides(calendar_id, date);

CREATE INDEX IF NOT EXISTS idx_bookings_calendar_time_status 
ON public.bookings(calendar_id, start_time, end_time, status);
