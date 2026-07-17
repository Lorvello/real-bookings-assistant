-- R30: repair and quarantine legacy availability RPCs.
--
-- The live public booking journey uses the canonical single-day get_available_slots RPC.
-- These older helpers had no active rendered caller, were SECURITY DEFINER with default
-- PUBLIC execute, and contained multiple schema/runtime errors. Keep their identities for
-- controlled compatibility, but make them SECURITY INVOKER + service-role-only until a
-- future product surface deliberately adopts and tests them.

CREATE OR REPLACE FUNCTION public.check_availability(
  p_calendar_id uuid,
  p_datetime timestamptz,
  p_duration_minutes integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_slot_date date;
  v_slot_time time;
  v_slot_end_time time;
  v_day_of_week integer;
  v_schedule_id uuid;
  v_override public.availability_overrides%ROWTYPE;
BEGIN
  IF p_calendar_id IS NULL
     OR p_datetime IS NULL
     OR p_duration_minutes NOT BETWEEN 1 AND 1440 THEN
    RETURN false;
  END IF;

  v_slot_date := p_datetime::date;
  IF (p_datetime + make_interval(mins => p_duration_minutes))::date
     <> v_slot_date THEN
    RETURN false;
  END IF;
  v_slot_time := p_datetime::time;
  v_slot_end_time := (
    p_datetime + make_interval(mins => p_duration_minutes)
  )::time;
  v_day_of_week := extract(isodow FROM p_datetime)::integer;

  SELECT override.* INTO v_override
  FROM public.availability_overrides AS override
  WHERE override.calendar_id = p_calendar_id
    AND override.date = v_slot_date;

  IF FOUND THEN
    IF NOT COALESCE(v_override.is_available, false) THEN
      RETURN false;
    END IF;
    IF v_override.start_time IS NULL OR v_override.end_time IS NULL THEN
      RETURN true;
    END IF;
    RETURN v_slot_time >= v_override.start_time
      AND v_slot_end_time <= v_override.end_time;
  END IF;

  SELECT schedule.id INTO v_schedule_id
  FROM public.availability_schedules AS schedule
  WHERE schedule.calendar_id = p_calendar_id
    AND schedule.is_default = true
  ORDER BY schedule.created_at, schedule.id
  LIMIT 1;

  IF v_schedule_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.availability_rules AS rule
    WHERE rule.schedule_id = v_schedule_id
      AND rule.day_of_week = v_day_of_week
      AND COALESCE(rule.is_available, false)
      AND v_slot_time >= rule.start_time
      AND v_slot_end_time <= rule.end_time
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_recurring_availability(
  p_calendar_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  resolved_date date,
  pattern_id uuid,
  availability_rules jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_pattern record;
  v_processing_date date;
  v_week_offset integer;
  v_week_of_month integer;
  v_dow_key text;
BEGIN
  IF p_calendar_id IS NULL
     OR p_start_date IS NULL
     OR p_end_date IS NULL
     OR p_start_date > p_end_date
     OR p_end_date - p_start_date > 366 THEN
    RETURN;
  END IF;

  FOR v_pattern IN
    SELECT recurring.*
    FROM public.recurring_availability AS recurring
    WHERE recurring.calendar_id = p_calendar_id
      AND recurring.is_active = true
      AND recurring.start_date <= p_end_date
      AND (recurring.end_date IS NULL OR recurring.end_date >= p_start_date)
  LOOP
    v_processing_date := greatest(v_pattern.start_date, p_start_date);

    WHILE v_processing_date <= p_end_date
      AND (v_pattern.end_date IS NULL OR v_processing_date <= v_pattern.end_date)
    LOOP
      v_dow_key := extract(dow FROM v_processing_date)::integer::text;

      CASE v_pattern.pattern_type
        WHEN 'weekly' THEN
          IF (v_pattern.schedule_data->'days') ? v_dow_key THEN
            RETURN QUERY SELECT
              v_processing_date,
              v_pattern.id,
              v_pattern.schedule_data->'availability';
          END IF;
        WHEN 'biweekly' THEN
          v_week_offset := floor(
            (v_processing_date - v_pattern.start_date)::numeric / 7
          )::integer;
          IF v_week_offset % 2 = 0
             AND (v_pattern.schedule_data->'week1_days') ? v_dow_key THEN
            RETURN QUERY SELECT
              v_processing_date,
              v_pattern.id,
              v_pattern.schedule_data->'week1_availability';
          ELSIF v_week_offset % 2 = 1
             AND (v_pattern.schedule_data->'week2_days') ? v_dow_key THEN
            RETURN QUERY SELECT
              v_processing_date,
              v_pattern.id,
              v_pattern.schedule_data->'week2_availability';
          END IF;
        WHEN 'monthly' THEN
          v_week_of_month := ceil(
            extract(day FROM v_processing_date) / 7.0
          )::integer;
          IF (
            v_pattern.schedule_data->>'occurrence' = 'first'
            AND v_week_of_month = 1
          ) OR (
            v_pattern.schedule_data->>'occurrence' = 'last'
            AND v_processing_date + 7 > (
              date_trunc('month', v_processing_date)
              + interval '1 month - 1 day'
            )::date
          ) THEN
            IF (v_pattern.schedule_data->'days') ? v_dow_key THEN
              RETURN QUERY SELECT
                v_processing_date,
                v_pattern.id,
                v_pattern.schedule_data->'availability';
            END IF;
          END IF;
        WHEN 'seasonal' THEN
          IF extract(month FROM v_processing_date) BETWEEN
               (v_pattern.schedule_data->>'start_month')::integer
               AND (v_pattern.schedule_data->>'end_month')::integer
             AND (v_pattern.schedule_data->'days') ? v_dow_key THEN
            RETURN QUERY SELECT
              v_processing_date,
              v_pattern.id,
              v_pattern.schedule_data->'availability';
          END IF;
      END CASE;

      v_processing_date := v_processing_date + 1;
    END LOOP;
  END LOOP;
END;
$function$;

-- Remove the default from the five-argument overload. The previous default made every
-- four-argument call ambiguous with the explicit four-argument compatibility wrapper.
-- PostgreSQL cannot remove an argument default through CREATE OR REPLACE. Drop the only
-- dependent wrapper first, then recreate both identities explicitly (no CASCADE).
DROP FUNCTION public.get_calendar_availability(text, date, integer);
DROP FUNCTION public.get_available_slots_range(uuid, uuid, date, date, text);

CREATE FUNCTION public.get_available_slots_range(
  p_calendar_id uuid,
  p_service_type_id uuid,
  p_start_date date,
  p_end_date date,
  p_timezone text
)
RETURNS TABLE(
  slot_date date,
  slot_start timestamptz,
  slot_end timestamptz,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_current_date date;
BEGIN
  IF p_calendar_id IS NULL
     OR p_service_type_id IS NULL
     OR p_start_date IS NULL
     OR p_end_date IS NULL
     OR NULLIF(trim(p_timezone), '') IS NULL
     OR p_start_date > p_end_date
     OR p_end_date - p_start_date > 31 THEN
    RETURN;
  END IF;

  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    RETURN QUERY
    SELECT
      v_current_date,
      slot.slot_start,
      slot.slot_end,
      slot.is_available
    FROM public.get_available_slots(
      p_calendar_id,
      p_service_type_id,
      v_current_date,
      p_timezone
    ) AS slot;
    v_current_date := v_current_date + 1;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_available_slots_range(
  p_calendar_id uuid,
  p_service_type_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  slot_date date,
  slot_start timestamptz,
  slot_end timestamptz,
  is_available boolean
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT ranged.*
  FROM public.get_available_slots_range(
    p_calendar_id,
    p_service_type_id,
    p_start_date,
    p_end_date,
    COALESCE(
      (
        SELECT NULLIF(trim(calendar.timezone), '')
        FROM public.calendars AS calendar
        WHERE calendar.id = p_calendar_id
      ),
      'Europe/Amsterdam'
    )
  ) AS ranged;
$function$;

CREATE OR REPLACE FUNCTION public.get_calendar_availability(
  p_calendar_slug text,
  p_start_date date DEFAULT current_date,
  p_days integer DEFAULT 14
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_timezone text;
  v_end_date date;
  v_result json;
BEGIN
  IF NULLIF(trim(p_calendar_slug), '') IS NULL
     OR p_start_date IS NULL
     OR p_days NOT BETWEEN 1 AND 31 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid request');
  END IF;

  SELECT calendar.id, COALESCE(NULLIF(trim(calendar.timezone), ''), 'Europe/Amsterdam')
  INTO v_calendar_id, v_timezone
  FROM public.calendars AS calendar
  WHERE calendar.slug = p_calendar_slug
    AND calendar.is_active = true;

  IF v_calendar_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Calendar not found');
  END IF;

  v_end_date := p_start_date + (p_days - 1);

  SELECT json_agg(
    json_build_object(
      'date', availability.slot_date,
      'service_type_id', availability.service_type_id,
      'service_name', availability.service_name,
      'duration', availability.service_duration,
      'price', availability.service_price,
      'slots', availability.slots_array
    ) ORDER BY availability.slot_date, availability.service_name
  )
  INTO v_result
  FROM (
    SELECT
      slots.slot_date,
      service.id AS service_type_id,
      service.name AS service_name,
      service.duration AS service_duration,
      service.price AS service_price,
      json_agg(
        json_build_object(
          'start_time', slots.slot_start,
          'end_time', slots.slot_end,
          'available', slots.is_available
        ) ORDER BY slots.slot_start
      ) AS slots_array
    FROM public.service_types AS service
    CROSS JOIN LATERAL public.get_available_slots_range(
      v_calendar_id,
      service.id,
      p_start_date,
      v_end_date,
      v_timezone
    ) AS slots
    WHERE service.calendar_id = v_calendar_id
      AND service.is_active = true
    GROUP BY
      slots.slot_date,
      service.id,
      service.name,
      service.duration,
      service.price
  ) AS availability;

  RETURN json_build_object(
    'success', true,
    'calendar_id', v_calendar_id,
    'availability', COALESCE(v_result, '[]'::json)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.check_availability(uuid, timestamptz, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_availability(uuid, timestamptz, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.resolve_recurring_availability(uuid, date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_recurring_availability(uuid, date, date)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_available_slots_range(uuid, uuid, date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_slots_range(uuid, uuid, date, date)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_available_slots_range(uuid, uuid, date, date, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_slots_range(uuid, uuid, date, date, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_calendar_availability(text, date, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_calendar_availability(text, date, integer)
  TO service_role;
