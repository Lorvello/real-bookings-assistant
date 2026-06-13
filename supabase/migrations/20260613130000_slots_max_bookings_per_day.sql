-- LR-R70 (agent-scope, website-audit high): max_bookings_per_day werd nergens afgedwongen.
-- De agent's slot-tool (get_available_slots_range) bood slots aan ongeacht de dag-limiet ->
-- overboeking mogelijk. Voeg een per-dag-count toe die de dag overslaat als de limiet bereikt is.
-- NULL-safe: businesses zonder limiet ongewijzigd.

CREATE OR REPLACE FUNCTION public.get_available_slots_range(p_calendar_id uuid, p_service_type_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(slot_date date, slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_service record;
  v_settings record;
  v_current_date date;
  v_rule record;
  v_current_slot timestamp with time zone;
  v_slot_end timestamp with time zone;
BEGIN
  -- Get service type info
  SELECT * INTO v_service
  FROM public.service_types
  WHERE id = p_service_type_id;
  
  IF v_service IS NULL THEN
    RETURN;
  END IF;
  
  -- Get calendar settings
  SELECT * INTO v_settings
  FROM public.calendar_settings
  WHERE calendar_id = p_calendar_id;
  
  IF v_settings IS NULL THEN
    v_settings := ROW(null, p_calendar_id, 30, 1, 60, 0, null, false, true, null, null, null, null, null, null, null, null, null);
  END IF;
  
  -- Loop through dates
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP

    -- max_bookings_per_day: als de dag z'n limiet al heeft, geen slots aanbieden
    IF v_settings.max_bookings_per_day IS NOT NULL
       AND (SELECT count(*) FROM public.bookings b
            WHERE b.calendar_id = p_calendar_id
              AND b.status = 'confirmed'
              AND COALESCE(b.is_deleted, false) = false
              AND b.start_time::date = v_current_date) >= v_settings.max_bookings_per_day THEN
      v_current_date := v_current_date + 1;
      CONTINUE;
    END IF;

    -- Get availability rules for this day
    FOR v_rule IN
      SELECT ar.start_time, ar.end_time, ar.is_available
      FROM public.availability_rules ar
      JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
      WHERE sch.calendar_id = p_calendar_id
        AND sch.is_default = true
        AND ar.day_of_week = CASE 
          WHEN EXTRACT(DOW FROM v_current_date) = 0 THEN 7 
          ELSE EXTRACT(DOW FROM v_current_date)::integer 
        END
        AND ar.is_available = true
    LOOP
      -- Generate time slots for this availability window
      v_current_slot := (v_current_date || ' ' || v_rule.start_time)::timestamp with time zone;
      
      WHILE v_current_slot + (v_service.duration || ' minutes')::interval <= 
            (v_current_date || ' ' || v_rule.end_time)::timestamp with time zone LOOP
        
        v_slot_end := v_current_slot + (v_service.duration || ' minutes')::interval;
        
        RETURN QUERY SELECT 
          v_current_date,
          v_current_slot,
          v_slot_end,
          NOT public.check_booking_conflicts(
            p_calendar_id,
            v_current_slot,
            v_slot_end,
            NULL,
            false
          );
        
        -- Move to next slot
        v_current_slot := v_current_slot + (v_settings.slot_duration || ' minutes')::interval;
      END LOOP;
    END LOOP;
    
    v_current_date := v_current_date + 1;
  END LOOP;
END;
$function$
;


-- get_available_slots (single-day; het pad dat de agent's 5-arg range gebruikt):
CREATE OR REPLACE FUNCTION public.get_available_slots(p_calendar_id uuid, p_service_type_id uuid, p_date date, p_timezone text DEFAULT 'Europe/Amsterdam'::text)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
  v_max_bookings_per_day integer;
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
  SELECT slot_duration, buffer_time, booking_window_days, minimum_notice_hours, max_bookings_per_day
  INTO v_slot_duration, v_buffer_time, v_booking_window_days, v_minimum_notice_hours, v_max_bookings_per_day
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

  -- max_bookings_per_day: dag al op limiet -> geen slots aanbieden
  IF v_max_bookings_per_day IS NOT NULL
     AND (SELECT count(*) FROM public.bookings b
          WHERE b.calendar_id = p_calendar_id AND b.status = 'confirmed'
            AND COALESCE(b.is_deleted, false) = false
            AND b.start_time::date = p_date) >= v_max_bookings_per_day THEN
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
      v_day_start := (p_date + v_override_record.start_time) AT TIME ZONE p_timezone;
      v_day_end := (p_date + v_override_record.end_time) AT TIME ZONE p_timezone;
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

      v_day_start := (p_date + v_rule_record.start_time) AT TIME ZONE p_timezone;
      v_day_end := (p_date + v_rule_record.end_time) AT TIME ZONE p_timezone;
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

    v_day_start := (p_date + v_rule_record.start_time) AT TIME ZONE p_timezone;
    v_day_end := (p_date + v_rule_record.end_time) AT TIME ZONE p_timezone;
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
$function$
;
