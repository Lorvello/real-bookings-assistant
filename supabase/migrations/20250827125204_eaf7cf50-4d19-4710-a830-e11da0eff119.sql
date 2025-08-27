-- Phase 2: Update time slot engine with double booking and daily limit support
-- Update check_booking_conflicts to support allow_double_bookings
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(
  p_calendar_id uuid, 
  p_start_time timestamp with time zone, 
  p_end_time timestamp with time zone, 
  p_exclude_booking_id uuid DEFAULT NULL,
  p_allow_double_bookings boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  conflict_count integer;
BEGIN
  -- If double bookings are allowed, return false (no conflicts)
  IF p_allow_double_bookings THEN
    RETURN false;
  END IF;
  
  -- Count conflicting bookings
  SELECT COUNT(*) INTO conflict_count
  FROM public.bookings
  WHERE calendar_id = p_calendar_id
    AND status NOT IN ('cancelled', 'no-show')
    AND (
      (p_start_time >= start_time AND p_start_time < end_time)
      OR
      (p_end_time > start_time AND p_end_time <= end_time)
      OR
      (p_start_time <= start_time AND p_end_time >= end_time)
    )
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
  
  RETURN conflict_count > 0;
END;
$function$;

-- Update get_business_available_slots to include double booking and daily limits
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
  
  -- Get double booking setting from calendar metadata (add this column if needed)
  -- For now, default to false
  v_max_daily_bookings := v_settings.max_bookings_per_day;
  
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Loop through service types
  FOR v_service IN 
    SELECT st.id, st.name, st.duration, st.price, st.preparation_time, st.cleanup_time
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
          AND ar.day_of_week = EXTRACT(DOW FROM v_current_date)::integer + 1
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
              v_current_slot - (COALESCE(v_service.preparation_time, 0) || ' minutes')::interval,
              v_slot_end + (COALESCE(v_service.cleanup_time, 0) || ' minutes')::interval,
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

-- Phase 3: Update webhook trigger for correct payload structure
CREATE OR REPLACE FUNCTION public.process_booking_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_webhook record;
  v_booking record;
  v_service record;
  v_payload jsonb;
BEGIN
  -- Process pending webhook events
  FOR v_webhook IN
    SELECT * FROM public.webhook_events 
    WHERE status = 'pending' 
      AND attempts < 3
    ORDER BY created_at
    LIMIT 50
  LOOP
    -- Get booking details
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = v_webhook.booking_id;
    
    -- Get service details
    SELECT * INTO v_service
    FROM public.service_types
    WHERE id = v_booking.service_type_id;
    
    -- Build standardized payload
    v_payload := jsonb_build_object(
      'company_id', v_booking.calendar_id,
      'appointment_type_id', v_booking.service_type_id,
      'booked_by', jsonb_build_object(
        'name', v_booking.customer_name,
        'email', v_booking.customer_email
      ),
      'start_time', to_char(v_booking.start_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'end_time', to_char(v_booking.end_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'status', v_booking.status,
      'service_name', COALESCE(v_booking.service_name, v_service.name),
      'total_price', v_booking.total_price,
      'booking_id', v_booking.id
    );
    
    -- Update webhook event with payload
    UPDATE public.webhook_events
    SET 
      payload = v_payload,
      attempts = attempts + 1,
      last_attempt_at = NOW(),
      status = 'processing'
    WHERE id = v_webhook.id;
  END LOOP;
END;
$function$;

-- Create webhook trigger for bookings
CREATE OR REPLACE FUNCTION public.trigger_booking_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Insert webhook event for new bookings
  INSERT INTO public.webhook_events (
    calendar_id,
    booking_id,
    event_type,
    status
  ) VALUES (
    NEW.calendar_id,
    NEW.id,
    'booking_created',
    'pending'
  );
  
  RETURN NEW;
END;
$function$;

-- Ensure webhook trigger exists
DROP TRIGGER IF EXISTS booking_webhook_trigger ON public.bookings;
CREATE TRIGGER booking_webhook_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_booking_webhook();