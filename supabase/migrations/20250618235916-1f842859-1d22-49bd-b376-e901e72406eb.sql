
-- Robuuste error handling database constraints en validaties

-- Check constraints voor booking validaties
ALTER TABLE bookings ADD CONSTRAINT valid_booking_times 
  CHECK (end_time > start_time);

ALTER TABLE bookings ADD CONSTRAINT valid_booking_status
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show'));

ALTER TABLE service_types ADD CONSTRAINT valid_duration
  CHECK (duration > 0 AND duration <= 480); -- Max 8 uur

ALTER TABLE service_types ADD CONSTRAINT valid_preparation_cleanup
  CHECK (preparation_time >= 0 AND cleanup_time >= 0);

ALTER TABLE calendar_settings ADD CONSTRAINT valid_booking_window
  CHECK (booking_window_days > 0 AND booking_window_days <= 365);

ALTER TABLE calendar_settings ADD CONSTRAINT valid_notice_hours
  CHECK (minimum_notice_hours >= 0 AND minimum_notice_hours <= 168); -- Max 1 week

-- Verbeterde business rules validatie functie
CREATE OR REPLACE FUNCTION validate_booking_rules()
RETURNS TRIGGER AS $$
DECLARE
  v_calendar_settings record;
  v_booking_count integer;
  v_min_booking_time timestamp with time zone;
  v_max_booking_date date;
BEGIN
  -- Haal calendar settings op
  SELECT * INTO v_calendar_settings
  FROM calendar_settings
  WHERE calendar_id = NEW.calendar_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calendar settings not found for calendar_id: %', NEW.calendar_id;
  END IF;
  
  -- Check minimum notice tijd
  v_min_booking_time := NOW() + (v_calendar_settings.minimum_notice_hours || ' hours')::interval;
  IF NEW.start_time < v_min_booking_time THEN
    RAISE EXCEPTION 'Booking must be made at least % hours in advance', v_calendar_settings.minimum_notice_hours;
  END IF;
  
  -- Check booking window (niet te ver in de toekomst)
  v_max_booking_date := CURRENT_DATE + (v_calendar_settings.booking_window_days || ' days')::interval;
  IF NEW.start_time::date > v_max_booking_date THEN
    RAISE EXCEPTION 'Booking cannot be made more than % days in advance', v_calendar_settings.booking_window_days;
  END IF;
  
  -- Check max bookings per dag (als ingesteld)
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
  
  -- Valideer customer gegevens
  IF LENGTH(TRIM(NEW.customer_name)) < 2 THEN
    RAISE EXCEPTION 'Customer name must be at least 2 characters long';
  END IF;
  
  IF NEW.customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.customer_email;
  END IF;
  
  -- Valideer dat service type bij calendar hoort
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

-- Trigger voor booking validatie
DROP TRIGGER IF EXISTS trigger_validate_booking_rules ON bookings;
CREATE TRIGGER trigger_validate_booking_rules
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION validate_booking_rules();

-- Validatie functie voor availability rules
CREATE OR REPLACE FUNCTION validate_availability_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Check dat start_time voor end_time ligt
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  -- Check geldige dag van de week (0-6)
  IF NEW.day_of_week < 0 OR NEW.day_of_week > 6 THEN
    RAISE EXCEPTION 'Day of week must be between 0 (Sunday) and 6 (Saturday)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger voor availability rules validatie
DROP TRIGGER IF EXISTS trigger_validate_availability_rules ON availability_rules;
CREATE TRIGGER trigger_validate_availability_rules
  BEFORE INSERT OR UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION validate_availability_rules();

-- Verbeterde webhook retry mechanisme
CREATE OR REPLACE FUNCTION process_webhook_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_record record;
  max_attempts integer := 5;
  retry_delays integer[] := ARRAY[60, 300, 900, 3600, 7200]; -- 1min, 5min, 15min, 1h, 2h
BEGIN
  -- Verwerk webhook events die opnieuw geprobeerd moeten worden
  FOR webhook_record IN 
    SELECT * FROM webhook_events 
    WHERE status IN ('pending', 'failed') 
      AND attempts < max_attempts
      AND (last_attempt_at IS NULL OR 
           last_attempt_at < NOW() - (retry_delays[LEAST(attempts + 1, array_length(retry_delays, 1))] || ' seconds')::interval)
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    -- Update attempt count
    UPDATE webhook_events 
    SET attempts = attempts + 1,
        last_attempt_at = NOW()
    WHERE id = webhook_record.id;
    
    -- Hier zou de webhook call gemaakt worden
    -- Voor nu markeren we het als geprobeerd
    PERFORM pg_notify('webhook_retry', 
      json_build_object(
        'event_id', webhook_record.id,
        'calendar_id', webhook_record.calendar_id,
        'event_type', webhook_record.event_type,
        'attempt', webhook_record.attempts + 1
      )::text
    );
  END LOOP;
END;
$$;

-- Error logging tabel
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id uuid,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_context jsonb,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Index voor error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_calendar_created ON error_logs(calendar_id, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_type_created ON error_logs(error_type, created_at);

-- Functie om errors te loggen
CREATE OR REPLACE FUNCTION log_error(
  p_calendar_id uuid,
  p_error_type text,
  p_error_message text,
  p_error_context jsonb DEFAULT NULL,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO error_logs (calendar_id, error_type, error_message, error_context, user_id)
  VALUES (p_calendar_id, p_error_type, p_error_message, p_error_context, p_user_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
