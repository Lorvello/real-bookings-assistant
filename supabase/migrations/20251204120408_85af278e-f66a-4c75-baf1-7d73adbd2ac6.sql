-- Update validate_booking_insert trigger function to make email optional
CREATE OR REPLACE FUNCTION public.validate_booking_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate required fields
  IF NEW.customer_name IS NULL OR trim(NEW.customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  
  -- Email is optional, but validate format if provided
  IF NEW.customer_email IS NOT NULL AND NEW.customer_email <> '' THEN
    IF NEW.customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    NEW.customer_email := lower(trim(NEW.customer_email));
  END IF;
  
  IF NEW.start_time <= now() THEN
    RAISE EXCEPTION 'Cannot book appointments in the past';
  END IF;
  
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  -- Sanitize input data
  NEW.customer_name := trim(NEW.customer_name);
  
  -- Generate confirmation token if not provided
  IF NEW.confirmation_token IS NULL OR NEW.confirmation_token = '' THEN
    NEW.confirmation_token := public.generate_confirmation_token();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop and recreate RLS policy to make email optional
DROP POLICY IF EXISTS "bookings_public_create" ON public.bookings;

CREATE POLICY "bookings_public_create" ON public.bookings
FOR INSERT
WITH CHECK (
  validate_booking_calendar_and_service(calendar_id, service_type_id) 
  AND (start_time > now()) 
  AND (end_time > start_time) 
  AND (customer_name IS NOT NULL) 
  AND (customer_name <> ''::text)
  AND (customer_email IS NULL OR customer_email = '' OR customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)
);

-- Update validate_booking_security function to make email optional
CREATE OR REPLACE FUNCTION public.validate_booking_security(p_calendar_slug text, p_service_type_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_customer_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  
  -- Email is optional, but validate format if provided
  IF p_customer_email IS NOT NULL AND p_customer_email <> '' THEN
    IF p_customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      v_errors := v_errors || jsonb_build_object('field', 'customer_email', 'message', 'Invalid email format');
    END IF;
  END IF;
  
  -- Get calendar
  SELECT id INTO v_calendar_id
  FROM calendars
  WHERE slug = p_calendar_slug AND is_active = true;
  
  IF v_calendar_id IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'calendar', 'message', 'Calendar not found or inactive');
  END IF;
  
  -- Validate service type
  SELECT * INTO v_service_type
  FROM service_types
  WHERE id = p_service_type_id 
    AND calendar_id = v_calendar_id 
    AND is_active = true;
  
  IF v_service_type IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'service_type', 'message', 'Service type not found or inactive');
  END IF;
  
  -- Check for conflicts
  IF v_calendar_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_bookings
    FROM bookings
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