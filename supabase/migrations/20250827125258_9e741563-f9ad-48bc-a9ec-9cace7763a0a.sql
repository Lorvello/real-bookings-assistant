-- Phase 2: Fix time slot engine - drop and recreate function with new signature
DROP FUNCTION public.get_business_available_slots(text,uuid,date,integer);

CREATE OR REPLACE FUNCTION public.get_business_available_slots(
  p_calendar_slug text,
  p_service_type_id uuid DEFAULT NULL,
  p_start_date date DEFAULT CURRENT_DATE,
  p_days integer DEFAULT 14
)
RETURNS TABLE(
  calendar_id uuid,
  calendar_name text,
  service_type_id uuid,
  service_name text,
  service_duration integer,
  service_price numeric,
  slot_start timestamp with time zone,
  slot_end timestamp with time zone,
  is_available boolean,
  duration_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_calendar_name text;
  v_settings record;
  v_current_date date;
  v_end_date date;
  v_service record;
  v_rule record;
  v_current_slot timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_daily_bookings integer;
  v_allow_double_bookings boolean := false;
  v_max_daily_bookings integer;
BEGIN
  -- Get calendar info
  SELECT c.id, c.name INTO v_calendar_id, v_calendar_name
  FROM public.calendars c
  WHERE c.slug = p_calendar_slug AND c.is_active = true;
  
  IF v_calendar_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get calendar settings
  SELECT * INTO v_settings
  FROM public.calendar_settings
  WHERE calendar_id = v_calendar_id;
  
  IF v_settings IS NULL THEN
    v_settings := ROW(null, v_calendar_id, 30, 1, 60, 0, null, false, true, null, null, null, null, null, null, null, null, null);
  END IF;
  
  v_max_daily_bookings := v_settings.max_bookings_per_day;
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Loop through service types
  FOR v_service IN 
    SELECT st.id, st.name, st.duration, st.price, 
           COALESCE(st.preparation_time, 0) as preparation_time,
           COALESCE(st.cleanup_time, 0) as cleanup_time
    FROM public.service_types st
    WHERE st.calendar_id = v_calendar_id 
      AND st.is_active = true
      AND (p_service_type_id IS NULL OR st.id = p_service_type_id)
  LOOP
    -- Loop through dates
    v_current_date := p_start_date;
    WHILE v_current_date <= v_end_date LOOP
      
      -- Check daily booking limit if set
      IF v_max_daily_bookings IS NOT NULL THEN
        SELECT COUNT(*) INTO v_daily_bookings
        FROM public.bookings
        WHERE calendar_id = v_calendar_id
          AND DATE(start_time) = v_current_date
          AND status NOT IN ('cancelled', 'no-show');
          
        -- Skip this date if limit reached
        IF v_daily_bookings >= v_max_daily_bookings THEN
          v_current_date := v_current_date + 1;
          CONTINUE;
        END IF;
      END IF;
      
      -- Get availability rules for this day
      FOR v_rule IN
        SELECT ar.start_time, ar.end_time, ar.is_available
        FROM public.availability_rules ar
        JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
        WHERE sch.calendar_id = v_calendar_id
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
          
          -- Check availability (considering double bookings setting)
          RETURN QUERY SELECT 
            v_calendar_id,
            v_calendar_name,
            v_service.id,
            v_service.name,
            v_service.duration,
            v_service.price,
            v_current_slot,
            v_slot_end,
            NOT public.check_booking_conflicts(
              v_calendar_id,
              v_current_slot - (v_service.preparation_time || ' minutes')::interval,
              v_slot_end + (v_service.cleanup_time || ' minutes')::interval,
              NULL,
              v_allow_double_bookings
            ),
            v_service.duration;
          
          -- Move to next slot
          v_current_slot := v_current_slot + (v_settings.slot_duration || ' minutes')::interval;
        END LOOP;
      END LOOP;
      
      v_current_date := v_current_date + 1;
    END LOOP;
  END LOOP;
END;
$function$;