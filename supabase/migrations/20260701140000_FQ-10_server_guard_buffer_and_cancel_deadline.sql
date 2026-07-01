-- FQ-10: close two server-enforcement gaps in the booking guards.
--
-- Adversarial re-verify of the booking guards (calling the booking path DIRECTLY,
-- bypassing the chat agent) found that two constraints the offer layer / one cancel
-- path honor were NOT enforced on the authoritative server path:
--
--   GAP 1 (buffer): validate_booking_security (the create-booking gate) checked raw
--   start/end overlap but ignored calendar_settings.buffer_time (and the service
--   preparation_time / cleanup_time). get_available_slots NEVER offers a slot that
--   violates the buffer (it widens each candidate by prep+buffer / cleanup+buffer via
--   check_booking_conflicts), so a crafted create-booking POST could confirm a booking
--   that lands inside the buffer of an existing one -- an offer-vs-accept mismatch the
--   server must close. Proven: bufA 10:00-10:30 + bufB 10:40-11:10 both confirmed on
--   the same day with a 15-min buffer set.
--
--   GAP 2 (cancel-deadline): cancel_booking_for_agent (the WhatsApp cancel path)
--   enforces calendar_settings.cancellation_deadline_hours and allow_cancellations,
--   but cancel_booking_by_token (the public web / email-link cancel path, anon-
--   executable) enforced NEITHER. A customer holding the confirmation token could
--   cancel 5 minutes before the appointment, or cancel at all when the owner had
--   disabled customer cancellations. Proven: a booking starting in 2h was cancelled
--   via the token RPC under a 24h deadline.
--
-- Both fixes mirror the already-correct sibling exactly so the gate matches the offer
-- layer / the agent path, and legitimate bookings/cancellations are unaffected.

-- ---------------------------------------------------------------------------
-- GAP 1: buffer-aware conflict check in validate_booking_security
-- ---------------------------------------------------------------------------
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
  v_has_conflict boolean;
  v_validation_result jsonb := jsonb_build_object('valid', true, 'errors', '[]'::jsonb);
  v_errors jsonb := '[]'::jsonb;
  v_now timestamp with time zone := now();
  v_min_notice_hours integer;
  v_booking_window_days integer;
  v_max_per_day integer;
  v_buffer_time integer;
  v_prep_time integer;
  v_cleanup_time integer;
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
    SELECT
      COALESCE(minimum_notice_hours, 24),
      COALESCE(booking_window_days, 60),
      max_bookings_per_day,
      COALESCE(buffer_time, 0)
    INTO v_min_notice_hours, v_booking_window_days, v_max_per_day, v_buffer_time
    FROM calendar_settings
    WHERE calendar_id = v_calendar_id;
    v_min_notice_hours := COALESCE(v_min_notice_hours, 24);
    v_booking_window_days := COALESCE(v_booking_window_days, 60);
    v_buffer_time := COALESCE(v_buffer_time, 0);
    v_prep_time := COALESCE(v_service_type.preparation_time, 0);
    v_cleanup_time := COALESCE(v_service_type.cleanup_time, 0);

    -- Conflict / buffer check. Mirror get_available_slots EXACTLY: widen the
    -- candidate interval by (preparation_time + buffer_time) before start and
    -- (cleanup_time + buffer_time) after end, then check that widened window for
    -- any existing non-cancelled / non-no-show booking. This catches both a raw
    -- overlap AND a booking that lands inside the configured buffer, so the gate
    -- can no longer accept a slot the offer layer would never have shown.
    IF p_start_time IS NOT NULL AND p_end_time IS NOT NULL AND p_start_time < p_end_time THEN
      v_has_conflict := public.check_booking_conflicts(
        v_calendar_id,
        p_start_time - ((v_prep_time + v_buffer_time) || ' minutes')::interval,
        p_end_time + ((v_cleanup_time + v_buffer_time) || ' minutes')::interval,
        NULL
      );
      IF v_has_conflict THEN
        v_errors := v_errors || jsonb_build_object('field', 'time_conflict', 'message', 'Time slot is already booked');
      END IF;
    END IF;

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

-- ---------------------------------------------------------------------------
-- GAP 2: enforce allow_cancellations + cancellation_deadline_hours on the public
-- token cancel path, mirroring cancel_booking_for_agent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_booking_by_token(p_token text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id uuid;
  v_status text;
  v_calendar_id uuid;
  v_start_time timestamp with time zone;
  v_allow boolean;
  v_deadline numeric;
  v_hours numeric;
BEGIN
  -- Validate token format
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  -- Find and validate booking
  SELECT b.id, b.status, b.calendar_id, b.start_time
  INTO v_booking_id, v_status, v_calendar_id, v_start_time
  FROM bookings b
  JOIN calendars c ON b.calendar_id = c.id
  WHERE b.confirmation_token = p_token
    AND c.is_active = true
    AND COALESCE(b.is_deleted, false) = false;

  IF v_booking_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking already cancelled');
  END IF;

  -- Enforce the calendar's cancellation policy server-side (same source + semantics
  -- as cancel_booking_for_agent, the WhatsApp path). Without this the public
  -- token-cancel link bypassed both the owner's allow_cancellations switch and the
  -- cancellation_deadline_hours, letting a customer cancel arbitrarily close to the
  -- appointment. The deadline is measured from now() to the booking start.
  SELECT cs.allow_cancellations, cs.cancellation_deadline_hours
  INTO v_allow, v_deadline
  FROM calendar_settings cs
  WHERE cs.calendar_id = v_calendar_id;

  IF v_allow IS NOT NULL AND v_allow = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cancellations are not allowed for this calendar. Please contact the business.');
  END IF;

  v_hours := EXTRACT(EPOCH FROM (v_start_time - now())) / 3600;
  IF v_deadline IS NOT NULL AND v_hours < v_deadline THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Too late to cancel: this must be done at least %s hours in advance. Please contact the business.', v_deadline));
  END IF;

  -- Cancel the booking
  UPDATE bookings
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = COALESCE(p_reason, 'Cancelled by customer'),
    updated_at = NOW()
  WHERE id = v_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$function$;
