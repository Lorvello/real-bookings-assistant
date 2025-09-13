-- Security Hardening: Phase 1 - Critical Data Exposure Fixes

-- 1. Create secure views for public booking that don't expose sensitive business data
CREATE OR REPLACE VIEW public.public_calendar_view AS
SELECT 
  id,
  slug,
  name,
  timezone,
  is_active
FROM public.calendars
WHERE is_active = true;

-- 2. Create secure service types view for public booking
CREATE OR REPLACE VIEW public.public_service_types_view AS
SELECT 
  st.id,
  st.calendar_id,
  st.name,
  st.duration,
  st.price,
  st.description,
  st.color,
  st.is_active
FROM public.service_types st
JOIN public.calendars c ON c.id = st.calendar_id
WHERE st.is_active = true AND c.is_active = true;

-- 3. Harden database functions with proper security settings
CREATE OR REPLACE FUNCTION public.get_business_available_slots(
  p_calendar_slug text, 
  p_service_type_id uuid DEFAULT NULL::uuid, 
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
SET search_path = ''
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
  -- Validate input parameters
  IF p_calendar_slug IS NULL OR p_calendar_slug = '' THEN
    RETURN;
  END IF;
  
  IF p_days > 90 OR p_days < 1 THEN
    RETURN;
  END IF;

  -- Get calendar info with explicit schema reference
  SELECT c.id, c.name INTO v_calendar_id, v_calendar_name
  FROM public.calendars c
  WHERE c.slug = p_calendar_slug AND c.is_active = true;
  
  IF v_calendar_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get calendar settings with explicit schema reference
  SELECT * INTO v_settings
  FROM public.calendar_settings
  WHERE calendar_id = v_calendar_id;
  
  IF v_settings IS NULL THEN
    v_settings := ROW(null, v_calendar_id, 30, 1, 60, 0, null, false, true, null, null, null, null, null, null, null, null, null);
  END IF;
  
  v_max_daily_bookings := v_settings.max_bookings_per_day;
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Loop through service types with explicit schema reference
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
      
      -- Get availability rules for this day with explicit schema reference
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
          
          -- Check availability with explicit schema reference
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

-- 4. Create secure booking validation function
CREATE OR REPLACE FUNCTION public.validate_booking_security(
  p_calendar_slug text,
  p_service_type_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_customer_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_service_type record;
  v_existing_bookings integer;
  v_validation_result jsonb := jsonb_build_object('valid', true, 'errors', '[]'::jsonb);
  v_errors jsonb := '[]'::jsonb;
  v_now timestamp with time zone := now();
BEGIN
  -- Validate input parameters
  IF p_calendar_slug IS NULL OR p_calendar_slug = '' THEN
    v_errors := v_errors || jsonb_build_object('field', 'calendar_slug', 'message', 'Calendar slug is required');
  END IF;
  
  IF p_service_type_id IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'service_type_id', 'message', 'Service type is required');
  END IF;
  
  IF p_start_time IS NULL OR p_end_time IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'time', 'message', 'Start and end times are required');
  END IF;
  
  IF p_start_time <= v_now THEN
    v_errors := v_errors || jsonb_build_object('field', 'start_time', 'message', 'Cannot book in the past');
  END IF;
  
  IF p_start_time >= p_end_time THEN
    v_errors := v_errors || jsonb_build_object('field', 'time', 'message', 'End time must be after start time');
  END IF;
  
  -- Validate email format
  IF p_customer_email IS NULL OR p_customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    v_errors := v_errors || jsonb_build_object('field', 'customer_email', 'message', 'Valid email address is required');
  END IF;
  
  -- Get calendar with explicit schema reference
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE slug = p_calendar_slug AND is_active = true;
  
  IF v_calendar_id IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'calendar', 'message', 'Calendar not found or inactive');
  END IF;
  
  -- Validate service type with explicit schema reference
  SELECT * INTO v_service_type
  FROM public.service_types
  WHERE id = p_service_type_id 
    AND calendar_id = v_calendar_id 
    AND is_active = true;
  
  IF v_service_type IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'service_type', 'message', 'Service type not found or inactive');
  END IF;
  
  -- Check for conflicts with explicit schema reference
  IF v_calendar_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_bookings
    FROM public.bookings
    WHERE calendar_id = v_calendar_id
      AND status NOT IN ('cancelled', 'no-show')
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      );
    
    IF v_existing_bookings > 0 THEN
      v_errors := v_errors || jsonb_build_object('field', 'time_conflict', 'message', 'Time slot is already booked');
    END IF;
  END IF;
  
  -- Set validation result
  IF jsonb_array_length(v_errors) > 0 THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
  END IF;
  
  v_validation_result := jsonb_set(v_validation_result, '{errors}', v_errors);
  
  RETURN v_validation_result;
END;
$function$;

-- 5. Tighten RLS policies - Remove overly permissive public access
DROP POLICY IF EXISTS "calendars_public_view" ON public.calendars;
DROP POLICY IF EXISTS "service_types_public_view" ON public.service_types;
DROP POLICY IF EXISTS "availability_schedules_public_view" ON public.availability_schedules;
DROP POLICY IF EXISTS "availability_rules_public_view" ON public.availability_rules;

-- 6. Create more restrictive policies for public booking access only
CREATE POLICY "calendars_public_booking_access" ON public.calendars
FOR SELECT TO anon, authenticated
USING (
  is_active = true AND 
  id IN (
    SELECT DISTINCT b.calendar_id 
    FROM public.bookings b 
    WHERE b.calendar_id = calendars.id
    LIMIT 1
  )
);

-- Allow access to service types only for booking purposes
CREATE POLICY "service_types_public_booking_access" ON public.service_types
FOR SELECT TO anon, authenticated
USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = service_types.calendar_id 
    AND c.is_active = true
  )
);

-- 7. Add input validation trigger for bookings
CREATE OR REPLACE FUNCTION public.validate_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Validate required fields
  IF NEW.customer_name IS NULL OR trim(NEW.customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  
  IF NEW.customer_email IS NULL OR NEW.customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Valid customer email is required';
  END IF;
  
  IF NEW.start_time <= now() THEN
    RAISE EXCEPTION 'Cannot book appointments in the past';
  END IF;
  
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  -- Sanitize input data
  NEW.customer_name := trim(NEW.customer_name);
  NEW.customer_email := lower(trim(NEW.customer_email));
  
  -- Generate confirmation token if not provided
  IF NEW.confirmation_token IS NULL THEN
    NEW.confirmation_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for booking validation
DROP TRIGGER IF EXISTS booking_validation_trigger ON public.bookings;
CREATE TRIGGER booking_validation_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_insert();

-- 8. Add security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_severity text DEFAULT 'medium'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.security_events_log (
    event_type,
    user_id,
    ip_address,
    user_agent,
    event_data,
    severity,
    created_at
  ) VALUES (
    p_event_type,
    p_user_id,
    p_ip_address,
    p_user_agent,
    p_event_data,
    p_severity,
    now()
  );
END;
$function$;