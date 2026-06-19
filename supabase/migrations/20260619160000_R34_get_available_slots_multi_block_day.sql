-- R34 (adversarial DoD-close, round 4) — BLOCKER fix: get_available_slots dropped
-- all but one availability block per day.
--
-- The single-day get_available_slots (the exact RPC the WhatsApp agent calls) read
-- the day's hours with `SELECT * INTO v_rule_record FROM availability_rules WHERE
-- day_of_week = X` — a single-row fetch, no loop, no ORDER BY. But the schema and
-- the owner UI allow MULTIPLE time blocks per day (the lunch-break / split-shift
-- pattern, e.g. 09:00-12:00 + 13:00-17:00 — the most common salon configuration).
-- One block was dropped arbitrarily: the agent offered slots for only half the day
-- and told customers the rest was "not available" on a genuinely open day.
--
-- Fix: resolve the day's open windows as a SET and loop over them, generating slots
-- per window (the sibling get_available_slots_range already does this). All other
-- logic (service/settings, booking window, per-day cap, minimum notice, override
-- handling, prep/cleanup/buffer conflict check) is preserved exactly.

CREATE OR REPLACE FUNCTION public.get_available_slots(p_calendar_id uuid, p_service_type_id uuid, p_date date, p_timezone text DEFAULT 'Europe/Amsterdam'::text)
 RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_service_duration integer;
  v_preparation_time integer;
  v_cleanup_time integer;
  v_slot_duration integer;
  v_buffer_time integer;
  v_booking_window_days integer;
  v_minimum_notice_hours integer;
  v_schedule_record record;
  v_window record;
  v_override_record record;
  v_current_slot timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_day_start timestamp with time zone;
  v_day_end timestamp with time zone;
  v_day_of_week integer;
  v_min_booking_time timestamp with time zone;
  v_max_booking_date date;
  v_max_bookings_per_day integer;
  v_has_override_window boolean;
BEGIN
  -- Haal service type informatie op
  SELECT duration, preparation_time, cleanup_time
  INTO v_service_duration, v_preparation_time, v_cleanup_time
  FROM public.service_types
  WHERE id = p_service_type_id AND calendar_id = p_calendar_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Haal calendar settings op
  SELECT slot_duration, buffer_time, booking_window_days, minimum_notice_hours, max_bookings_per_day
  INTO v_slot_duration, v_buffer_time, v_booking_window_days, v_minimum_notice_hours, v_max_bookings_per_day
  FROM public.calendar_settings
  WHERE calendar_id = p_calendar_id;

  -- Gebruik standaard waarden als settings niet gevonden
  v_slot_duration := COALESCE(v_slot_duration, 30);
  v_buffer_time := COALESCE(v_buffer_time, 0);
  v_booking_window_days := COALESCE(v_booking_window_days, 60);
  v_minimum_notice_hours := COALESCE(v_minimum_notice_hours, 24);
  v_preparation_time := COALESCE(v_preparation_time, 0);
  v_cleanup_time := COALESCE(v_cleanup_time, 0);

  -- Controleer booking window
  v_max_booking_date := CURRENT_DATE + (v_booking_window_days || ' days')::interval;
  IF p_date > v_max_booking_date THEN
    RETURN;
  END IF;

  -- max_bookings_per_day: dag al op limiet -> geen slots aanbieden
  IF v_max_bookings_per_day IS NOT NULL
     AND (SELECT count(*) FROM public.bookings b
          WHERE b.calendar_id = p_calendar_id AND b.status = 'confirmed'
            AND COALESCE(b.is_deleted, false) = false
            AND b.start_time::date = p_date) >= v_max_bookings_per_day THEN
    RETURN;
  END IF;

  -- Controleer minimum notice tijd
  v_min_booking_time := NOW() + (v_minimum_notice_hours || ' hours')::interval;

  -- Bereken dag van de week (ISO: 1 = maandag .. 7 = zondag)
  v_day_of_week := EXTRACT(ISODOW FROM p_date)::integer;

  -- Override voor deze specifieke dag (vakantie / afwijkende uren)
  SELECT * INTO v_override_record
  FROM public.availability_overrides
  WHERE calendar_id = p_calendar_id AND date = p_date;

  -- Override aanwezig en gemarkeerd als gesloten -> geen slots
  IF FOUND AND NOT v_override_record.is_available THEN
    RETURN;
  END IF;

  -- Heeft de override expliciete tijden? Dan vervangt die het normale schema (één venster).
  v_has_override_window := (FOUND
    AND v_override_record.is_available
    AND v_override_record.start_time IS NOT NULL
    AND v_override_record.end_time IS NOT NULL);

  -- Default schema (nodig wanneer we terugvallen op de availability_rules)
  SELECT * INTO v_schedule_record
  FROM public.availability_schedules
  WHERE calendar_id = p_calendar_id AND is_default = true
  LIMIT 1;

  -- Loop over ALLE open vensters van de dag (een dag kan meerdere blokken hebben,
  -- bv. een lunchpauze 09:00-12:00 + 13:00-17:00) en genereer per venster slots.
  FOR v_window IN
    -- Venster A: een beschikbare override MET expliciete tijden -> precies dat venster
    SELECT v_override_record.start_time AS start_time, v_override_record.end_time AS end_time
    WHERE v_has_override_window
    UNION ALL
    -- Venster(s) B: anders alle availability_rules-blokken voor deze weekdag
    SELECT r.start_time, r.end_time
    FROM public.availability_rules r
    WHERE r.schedule_id = v_schedule_record.id
      AND r.day_of_week = v_day_of_week
      AND r.is_available = true
      AND NOT v_has_override_window
    ORDER BY 1
  LOOP
    v_day_start := (p_date + v_window.start_time) AT TIME ZONE p_timezone;
    v_day_end   := (p_date + v_window.end_time) AT TIME ZONE p_timezone;

    v_current_slot := v_day_start;
    WHILE v_current_slot < v_day_end LOOP
      v_slot_end := v_current_slot + (v_service_duration || ' minutes')::interval;

      -- Controleer of slot binnen werkuren valt
      IF v_slot_end <= v_day_end THEN
        -- Controleer minimum notice tijd
        IF v_current_slot >= v_min_booking_time THEN
          -- Booking-conflicten (incl. preparation, cleanup EN buffer tijd)
          RETURN QUERY
          SELECT
            v_current_slot,
            v_slot_end,
            NOT public.check_booking_conflicts(
              p_calendar_id,
              v_current_slot - ((v_preparation_time + v_buffer_time) || ' minutes')::interval,
              v_slot_end + ((v_cleanup_time + v_buffer_time) || ' minutes')::interval,
              NULL
            );
        ELSE
          -- Slot is te vroeg (binnen minimum notice tijd)
          RETURN QUERY
          SELECT v_current_slot, v_slot_end, false;
        END IF;
      END IF;

      v_current_slot := v_current_slot + (v_slot_duration || ' minutes')::interval;
    END LOOP;
  END LOOP;

  RETURN;
END;
$function$;
