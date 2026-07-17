\set ON_ERROR_STOP on

BEGIN;
SET LOCAL TIME ZONE 'Europe/Amsterdam';

INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
  '72000000-0000-0000-0000-000000000001',
  'availability-contract@example.invalid',
  'authenticated', 'authenticated', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}', now(), now()
);

INSERT INTO public.calendars (
  id, user_id, name, slug, is_active, timezone
)
VALUES (
  '72000000-0000-0000-0000-000000000010',
  '72000000-0000-0000-0000-000000000001',
  'Legacy Availability Contract',
  'legacy-availability-contract',
  true,
  'Europe/Amsterdam'
);

INSERT INTO public.service_types (
  id, calendar_id, name, duration, price, is_active
)
VALUES (
  '72000000-0000-0000-0000-000000000020',
  '72000000-0000-0000-0000-000000000010',
  'Availability Contract Service',
  30,
  25,
  true
);

DO $test$
DECLARE
  v_date date := current_date
    + (8 - extract(isodow FROM current_date)::integer);
  v_schedule_id uuid;
  v_dow integer;
BEGIN
  SELECT schedule.id INTO v_schedule_id
  FROM public.availability_schedules AS schedule
  WHERE schedule.calendar_id = '72000000-0000-0000-0000-000000000010'
    AND schedule.is_default = true
  ORDER BY schedule.created_at, schedule.id
  LIMIT 1;

  IF v_schedule_id IS NULL THEN
    INSERT INTO public.availability_schedules (
      calendar_id, name, is_default
    ) VALUES (
      '72000000-0000-0000-0000-000000000010',
      'Contract schedule',
      true
    ) RETURNING id INTO v_schedule_id;
  END IF;

  v_dow := extract(isodow FROM v_date)::integer;
  UPDATE public.availability_rules
  SET start_time = time '09:00', end_time = time '17:00', is_available = true
  WHERE schedule_id = v_schedule_id AND day_of_week = v_dow;
  IF NOT FOUND THEN
    INSERT INTO public.availability_rules (
      schedule_id, day_of_week, start_time, end_time, is_available
    ) VALUES (
      v_schedule_id, v_dow, time '09:00', time '17:00', true
    );
  END IF;

  INSERT INTO public.recurring_availability (
    id, calendar_id, pattern_type, pattern_name, start_date,
    schedule_data, is_active
  ) VALUES (
    '72000000-0000-0000-0000-000000000030',
    '72000000-0000-0000-0000-000000000010',
    'biweekly',
    'Biweekly contract',
    v_date,
    jsonb_build_object(
      'week1_days', jsonb_build_array(extract(dow FROM v_date)::integer::text),
      'week2_days', '[]'::jsonb,
      'week1_availability', jsonb_build_object('start', '09:00', 'end', '17:00'),
      'week2_availability', '[]'::jsonb
    ),
    true
  );
END;
$test$;

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_date date := current_date
    + (8 - extract(isodow FROM current_date)::integer);
  v_four_count integer;
  v_five_count integer;
  v_result json;
  v_recurring_count integer;
BEGIN
  IF NOT public.check_availability(
    '72000000-0000-0000-0000-000000000010',
    (v_date + time '12:00') AT TIME ZONE 'Europe/Amsterdam',
    30
  ) THEN
    RAISE EXCEPTION 'qualified check_availability rejected an in-window slot';
  END IF;
  IF public.check_availability(
    '72000000-0000-0000-0000-000000000010',
    (v_date + time '20:00') AT TIME ZONE 'Europe/Amsterdam',
    30
  ) THEN
    RAISE EXCEPTION 'check_availability accepted an out-of-window slot';
  END IF;

  SELECT count(*) INTO v_four_count
  FROM public.get_available_slots_range(
    '72000000-0000-0000-0000-000000000010',
    '72000000-0000-0000-0000-000000000020',
    v_date,
    v_date
  );
  SELECT count(*) INTO v_five_count
  FROM public.get_available_slots_range(
    '72000000-0000-0000-0000-000000000010',
    '72000000-0000-0000-0000-000000000020',
    v_date,
    v_date,
    'Europe/Amsterdam'
  );
  IF v_four_count = 0 OR v_four_count <> v_five_count THEN
    RAISE EXCEPTION 'range wrappers disagree or returned no slots: four %, five %',
      v_four_count, v_five_count;
  END IF;

  v_result := public.get_calendar_availability(
    'legacy-availability-contract', v_date, 1
  );
  IF v_result->>'success' <> 'true'
     OR json_array_length(v_result->'availability') = 0 THEN
    RAISE EXCEPTION 'calendar availability wrapper failed: %', v_result;
  END IF;

  SELECT count(*) INTO v_recurring_count
  FROM public.resolve_recurring_availability(
    '72000000-0000-0000-0000-000000000010', v_date, v_date
  );
  IF v_recurring_count <> 1 THEN
    RAISE EXCEPTION 'biweekly recurring resolver returned % rows',
      v_recurring_count;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_identity text;
BEGIN
  FOREACH v_identity IN ARRAY ARRAY[
    'public.check_availability(uuid,timestamp with time zone,integer)',
    'public.resolve_recurring_availability(uuid,date,date)',
    'public.get_available_slots_range(uuid,uuid,date,date)',
    'public.get_available_slots_range(uuid,uuid,date,date,text)',
    'public.get_calendar_availability(text,date,integer)'
  ] LOOP
    IF has_function_privilege('anon', v_identity, 'EXECUTE')
       OR has_function_privilege('authenticated', v_identity, 'EXECUTE')
       OR NOT has_function_privilege('service_role', v_identity, 'EXECUTE') THEN
      RAISE EXCEPTION 'unsafe availability RPC grants: %', v_identity;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_proc AS function
    JOIN pg_namespace AS namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'public'
      AND function.proname IN (
        'check_availability',
        'resolve_recurring_availability',
        'get_available_slots_range',
        'get_calendar_availability'
      )
      AND function.prosecdef
  ) THEN
    RAISE EXCEPTION 'legacy availability RPC remained SECURITY DEFINER';
  END IF;

  IF (
    SELECT function.pronargdefaults
    FROM pg_proc AS function
    JOIN pg_namespace AS namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'public'
      AND function.proname = 'get_available_slots_range'
      AND function.pronargs = 5
  ) <> 0 THEN
    RAISE EXCEPTION 'five-argument range overload still has an ambiguous default';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'LEGACY_AVAILABILITY_QUARANTINE_CONTRACT_PASS';
