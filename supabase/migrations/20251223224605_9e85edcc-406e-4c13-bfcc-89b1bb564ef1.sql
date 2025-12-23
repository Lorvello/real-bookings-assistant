-- Update the validate_booking_insert trigger to allow time_period updates
CREATE OR REPLACE FUNCTION public.validate_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip validation for time_period-only updates (allow past booking updates)
  IF TG_OP = 'UPDATE' AND 
     OLD.start_time = NEW.start_time AND 
     OLD.end_time = NEW.end_time AND
     OLD.customer_name = NEW.customer_name THEN
    RETURN NEW;
  END IF;

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
  
  -- Only check past dates for NEW bookings (INSERT), not updates
  IF TG_OP = 'INSERT' AND NEW.start_time <= now() THEN
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
$$;

-- Create function to refresh time_period values
CREATE OR REPLACE FUNCTION public.refresh_booking_time_periods()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE bookings 
  SET time_period = 
    CASE 
      WHEN DATE(start_time AT TIME ZONE COALESCE(
        (SELECT timezone FROM calendars WHERE id = bookings.calendar_id), 
        'Europe/Amsterdam'
      )) < CURRENT_DATE THEN 'past'
      WHEN DATE(start_time AT TIME ZONE COALESCE(
        (SELECT timezone FROM calendars WHERE id = bookings.calendar_id), 
        'Europe/Amsterdam'
      )) = CURRENT_DATE THEN 'today'
      ELSE 'future'
    END
  WHERE time_period IS DISTINCT FROM 
    CASE 
      WHEN DATE(start_time AT TIME ZONE COALESCE(
        (SELECT timezone FROM calendars WHERE id = bookings.calendar_id), 
        'Europe/Amsterdam'
      )) < CURRENT_DATE THEN 'past'
      WHEN DATE(start_time AT TIME ZONE COALESCE(
        (SELECT timezone FROM calendars WHERE id = bookings.calendar_id), 
        'Europe/Amsterdam'
      )) = CURRENT_DATE THEN 'today'
      ELSE 'future'
    END;
END;
$$;

-- Run the function immediately to fix all existing bookings
SELECT public.refresh_booking_time_periods();