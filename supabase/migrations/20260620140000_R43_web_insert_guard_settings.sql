-- R43: public web booking INSERT guard enforces operations settings (DoD round-4 HIGH, part 2)
--
-- validate_booking_security(slug,...) — the guard the public create-booking edge fn runs before
-- inserting — checked past-time + raw overlap but NOT calendar_settings. After R42 the availability
-- page only OFFERS valid slots, but a stale or crafted request could still insert a slot inside the
-- minimum-notice window, beyond the booking window, or over the daily cap. Mirror the SAME settings
-- and defaults get_available_slots uses (min-notice 24h, window 60d, max/day from settings) so the
-- web insert guard and the web availability can't disagree.
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
  v_min_notice_hours integer;
  v_booking_window_days integer;
  v_max_per_day integer;
  v_day_count integer;
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

  -- Check for conflicts + enforce operations settings (same source/defaults as get_available_slots)
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

    SELECT
      COALESCE(minimum_notice_hours, 24),
      COALESCE(booking_window_days, 60),
      max_bookings_per_day
    INTO v_min_notice_hours, v_booking_window_days, v_max_per_day
    FROM calendar_settings
    WHERE calendar_id = v_calendar_id;
    v_min_notice_hours := COALESCE(v_min_notice_hours, 24);
    v_booking_window_days := COALESCE(v_booking_window_days, 60);

    -- Minimum notice
    IF p_start_time IS NOT NULL AND p_start_time < v_now + (v_min_notice_hours || ' hours')::interval THEN
      v_errors := v_errors || jsonb_build_object('field', 'minimum_notice', 'message', 'This time is within the minimum notice period');
    END IF;

    -- Booking window
    IF p_start_time IS NOT NULL AND p_start_time::date > (CURRENT_DATE + (v_booking_window_days || ' days')::interval) THEN
      v_errors := v_errors || jsonb_build_object('field', 'booking_window', 'message', 'This date is beyond the booking window');
    END IF;

    -- Max bookings per day
    IF v_max_per_day IS NOT NULL AND p_start_time IS NOT NULL THEN
      SELECT COUNT(*) INTO v_day_count
      FROM bookings
      WHERE calendar_id = v_calendar_id
        AND status = 'confirmed'
        AND COALESCE(is_deleted, false) = false
        AND start_time::date = p_start_time::date;
      IF v_day_count >= v_max_per_day THEN
        v_errors := v_errors || jsonb_build_object('field', 'max_per_day', 'message', 'This day is fully booked');
      END IF;
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
