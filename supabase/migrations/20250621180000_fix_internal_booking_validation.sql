
-- Update the booking validation function to handle internal appointments
CREATE OR REPLACE FUNCTION public.validate_booking_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_calendar_settings record;
  v_booking_count integer;
  v_min_booking_time timestamp with time zone;
  v_max_booking_date date;
  v_is_internal boolean;
BEGIN
  -- Check if this is an internal appointment
  v_is_internal := (NEW.customer_email = 'internal@calendar.app' OR 
                   NEW.internal_notes LIKE '%Interne afspraak%');
  
  -- Haal calendar settings op
  SELECT * INTO v_calendar_settings
  FROM calendar_settings
  WHERE calendar_id = NEW.calendar_id;
  
  -- If no calendar settings found, create default ones
  IF NOT FOUND THEN
    INSERT INTO calendar_settings (calendar_id) VALUES (NEW.calendar_id);
    SELECT * INTO v_calendar_settings
    FROM calendar_settings
    WHERE calendar_id = NEW.calendar_id;
  END IF;
  
  -- For internal appointments, apply relaxed validation
  IF NOT v_is_internal THEN
    -- Check minimum notice tijd (only for external bookings)
    v_min_booking_time := NOW() + (v_calendar_settings.minimum_notice_hours || ' hours')::interval;
    IF NEW.start_time < v_min_booking_time THEN
      RAISE EXCEPTION 'Booking must be made at least % hours in advance', v_calendar_settings.minimum_notice_hours;
    END IF;
    
    -- Check booking window (niet te ver in de toekomst)
    v_max_booking_date := CURRENT_DATE + (v_calendar_settings.booking_window_days || ' days')::interval;
    IF NEW.start_time::date > v_max_booking_date THEN
      RAISE EXCEPTION 'Booking cannot be made more than % days in advance', v_calendar_settings.booking_window_days;
    END IF;
  END IF;
  
  -- Check max bookings per dag (applies to all bookings)
  IF v_calendar_settings.max_bookings_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_booking_count
    FROM bookings
    WHERE calendar_id = NEW.calendar_id
      AND DATE(start_time) = DATE(NEW.start_time)
      AND status NOT IN ('cancelled', 'no-show')
      AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND id != NEW.id));
    
    IF v_booking_count >= v_calendar_settings.max_bookings_per_day THEN
      RAISE EXCEPTION 'Maximum number of bookings per day (%) exceeded', v_calendar_settings.max_bookings_per_day;
    END IF;
  END IF;
  
  -- Valideer customer gegevens (relaxed for internal)
  IF LENGTH(TRIM(NEW.customer_name)) < 2 THEN
    RAISE EXCEPTION 'Customer name must be at least 2 characters long';
  END IF;
  
  -- Relaxed email validation for internal appointments
  IF NOT v_is_internal THEN
    IF NEW.customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format: %', NEW.customer_email;
    END IF;
  END IF;
  
  -- Valideer dat service type bij calendar hoort (if provided)
  IF NEW.service_type_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM service_types 
      WHERE id = NEW.service_type_id 
        AND calendar_id = NEW.calendar_id 
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Invalid or inactive service type for this calendar';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
