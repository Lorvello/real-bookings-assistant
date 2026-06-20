-- R42: public web booking availability — real slot grid + operations settings (DoD round-4 HIGH)
--
-- get_business_available_slots (the public /book/:slug availability RPC) emitted exactly ONE
-- slot per (date × availability window) at the window's start_time, and read NO calendar_settings.
-- So a 09:00–17:00 day with a 30-min service showed only a 09:00 slot, and minimum_notice_hours /
-- buffer_time / max_bookings_per_day / slot_duration / booking_window_days were all unenforced on
-- the web path (the WhatsApp agent's get_available_slots enforces every one).
--
-- Fix: REUSE the proven get_available_slots (duration-stepped grid + prep/cleanup/buffer conflicts +
-- min-notice + booking-window + max/day + availability overrides) per (date, service) via a LATERAL
-- join, and keep the slug resolution, input validation, security log, and the richer output columns.
-- No grid/settings logic is duplicated, so the two booking surfaces can't drift again.
CREATE OR REPLACE FUNCTION public.get_business_available_slots(p_calendar_slug text, p_service_type_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT CURRENT_DATE, p_days integer DEFAULT 14)
 RETURNS TABLE(calendar_id uuid, calendar_name text, service_type_id uuid, service_name text, service_duration integer, service_price numeric, slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean, duration_minutes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_calendar_name text;
BEGIN
  IF p_calendar_slug IS NULL OR trim(p_calendar_slug) = '' THEN
    RAISE EXCEPTION 'Invalid calendar_slug';
  END IF;

  IF p_days < 1 OR p_days > 90 THEN
    RAISE EXCEPTION 'Days must be between 1 and 90';
  END IF;

  IF p_start_date > CURRENT_DATE + interval '1 year' OR p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Invalid start_date';
  END IF;

  SELECT c.id, c.name INTO v_calendar_id, v_calendar_name
  FROM public.calendars c
  WHERE c.slug = p_calendar_slug AND c.is_active = true AND COALESCE(c.is_deleted, false) = false;

  IF v_calendar_id IS NULL THEN
    RAISE EXCEPTION 'Calendar not found';
  END IF;

  INSERT INTO public.security_events_log (event_type, calendar_id, event_data, severity)
  VALUES ('public_availability_query', v_calendar_id, jsonb_build_object('days', p_days), 'info');

  -- One row per real, duration-stepped slot, for each active service and each day in the
  -- window. get_available_slots applies slot_duration, buffer/prep/cleanup conflict checks,
  -- minimum_notice_hours, booking_window_days, max_bookings_per_day and availability overrides.
  RETURN QUERY
  SELECT
    v_calendar_id,
    v_calendar_name,
    st.id,
    st.name,
    st.duration,
    st.price,
    s.slot_start,
    s.slot_end,
    s.is_available,
    st.duration
  FROM generate_series(p_start_date, p_start_date + (p_days - 1), interval '1 day') AS ds(d)
  CROSS JOIN public.service_types st
  CROSS JOIN LATERAL public.get_available_slots(v_calendar_id, st.id, ds.d::date) AS s
  WHERE st.calendar_id = v_calendar_id
    AND st.is_active = true
    AND COALESCE(st.is_deleted, false) = false
    AND (p_service_type_id IS NULL OR st.id = p_service_type_id)
  ORDER BY s.slot_start, st.name;
END;
$function$;
