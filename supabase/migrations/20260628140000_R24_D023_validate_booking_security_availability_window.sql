-- R24 / D-023: enforce the calendar's weekly availability SCHEDULE server-side in
-- validate_booking_security (the public create-booking gate).
--
-- BEFORE this migration validate_booking_security checked past-time, end>start,
-- email, calendar+service active, overlap, minimum-notice, booking-window and
-- max-per-day, but NEVER the weekly availability windows. A crafted direct POST to
-- the public create-booking edge fn (e.g. Sunday 03:00, 7+ days out so it clears
-- notice + window) was accepted as a confirmed off-hours row even though the tenant
-- is Mon-Fri 09:00-17:00. The public UI (CalendarPreview -> useAvailableSlots ->
-- get_available_slots) and the WhatsApp agent (get_available_slots) only ever OFFER
-- in-hours slots, so this is an offer-vs-accept mismatch the server should close.
--
-- This adds an availability-window check that mirrors get_available_slots EXACTLY
-- (same source: availability_overrides + the default availability_schedule's
-- availability_rules; same ISODOW weekday; same override semantics: a closed
-- override rejects the day, an available override WITH explicit start/end replaces
-- the rules with that single window, otherwise the weekday's availability_rules
-- blocks apply). Weekday + window bounds are computed in the calendar's own
-- timezone, which equals the 'Europe/Amsterdam' default that the UI hook and the
-- agent pass to get_available_slots, so the server gate and the offer layer agree.
--
-- The booking interval [p_start_time, p_end_time) must fall FULLY inside at least
-- one open window for that day; otherwise a clean 'outside_business_hours' error is
-- returned and create-booking surfaces a 400 "Outside business hours" instead of a
-- confirmed row. Legit in-hours bookings on open days are unaffected; override-open
-- days are allowed and override-closed days are rejected.

CREATE OR REPLACE FUNCTION public.validate_booking_security(p_calendar_slug text, p_service_type_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_customer_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_calendar_id uuid;
  v_calendar_tz text;
  v_service_type record;
  v_existing_bookings integer;
  v_validation_result jsonb := jsonb_build_object('valid', true, 'errors', '[]'::jsonb);
  v_errors jsonb := '[]'::jsonb;
  v_now timestamp with time zone := now();
  v_min_notice_hours integer;
  v_booking_window_days integer;
  v_max_per_day integer;
  v_day_count integer;
  -- D-023 availability-window vars (mirror get_available_slots)
  v_booking_date date;
  v_day_of_week integer;
  v_override_record record;
  v_has_override_window boolean;
  v_schedule_record record;
  v_window record;
  v_window_start timestamp with time zone;
  v_window_end timestamp with time zone;
  v_fits_window boolean := false;
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

  -- Get calendar (incl. its timezone so the availability check matches the offer layer)
  SELECT id, COALESCE(timezone, 'Europe/Amsterdam')
  INTO v_calendar_id, v_calendar_tz
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

    -- D-023: availability SCHEDULE / business-hours enforcement.
    -- Mirror get_available_slots exactly so the server gate matches the offer layer.
    IF p_start_time IS NOT NULL AND p_end_time IS NOT NULL AND p_start_time < p_end_time THEN
      -- The booking day + weekday are evaluated in the calendar's timezone, the
      -- same frame get_available_slots builds its windows in.
      v_booking_date := (p_start_time AT TIME ZONE v_calendar_tz)::date;
      v_day_of_week := EXTRACT(ISODOW FROM v_booking_date)::integer;

      -- Override for this specific day (holiday / different hours)
      SELECT * INTO v_override_record
      FROM availability_overrides
      WHERE calendar_id = v_calendar_id AND date = v_booking_date;

      IF FOUND AND NOT v_override_record.is_available THEN
        -- Override marks the day closed -> reject (mirrors get_available_slots RETURN)
        v_errors := v_errors || jsonb_build_object('field', 'availability', 'message', 'Outside business hours');
      ELSE
        v_has_override_window := (FOUND
          AND v_override_record.is_available
          AND v_override_record.start_time IS NOT NULL
          AND v_override_record.end_time IS NOT NULL);

        SELECT * INTO v_schedule_record
        FROM availability_schedules
        WHERE calendar_id = v_calendar_id AND is_default = true
        LIMIT 1;

        -- Does the booking interval fall FULLY inside any open window for the day?
        FOR v_window IN
          -- Window A: an available override WITH explicit times -> exactly that window
          SELECT v_override_record.start_time AS start_time, v_override_record.end_time AS end_time
          WHERE v_has_override_window
          UNION ALL
          -- Window(s) B: otherwise all availability_rules blocks for this weekday
          SELECT r.start_time, r.end_time
          FROM availability_rules r
          WHERE r.schedule_id = v_schedule_record.id
            AND r.day_of_week = v_day_of_week
            AND r.is_available = true
            AND NOT v_has_override_window
        LOOP
          v_window_start := (v_booking_date + v_window.start_time) AT TIME ZONE v_calendar_tz;
          v_window_end   := (v_booking_date + v_window.end_time) AT TIME ZONE v_calendar_tz;
          IF p_start_time >= v_window_start AND p_end_time <= v_window_end THEN
            v_fits_window := true;
            EXIT;
          END IF;
        END LOOP;

        IF NOT v_fits_window THEN
          v_errors := v_errors || jsonb_build_object('field', 'availability', 'message', 'Outside business hours');
        END IF;
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
