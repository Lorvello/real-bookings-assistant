
-- Fix Function Search Path Mutable Security Issue
-- Add explicit search_path = '' to all SECURITY DEFINER functions for security

-- 1. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
  -- Voeg user toe aan public.users tabel
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  
  RETURN new;
END;
$function$;

-- 2. Fix handle_new_calendar_settings function
CREATE OR REPLACE FUNCTION public.handle_new_calendar_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
  -- Maak automatisch standaard instellingen aan voor de nieuwe kalender
  INSERT INTO public.calendar_settings (calendar_id)
  VALUES (new.id);
  
  RETURN new;
END;
$function$;

-- 3. Fix handle_new_calendar_availability function
CREATE OR REPLACE FUNCTION public.handle_new_calendar_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
DECLARE
  schedule_id uuid;
BEGIN
  -- Maak automatisch een standaard beschikbaarheidsschema aan voor de nieuwe kalender
  INSERT INTO public.availability_schedules (calendar_id, name, is_default)
  VALUES (new.id, 'Standaard Schema', true)
  RETURNING id INTO schedule_id;
  
  -- Voeg standaard werkuren toe (ma-vr 9:00-17:00)
  INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
  VALUES 
    (schedule_id, 1, '09:00'::time, '17:00'::time, true), -- Maandag
    (schedule_id, 2, '09:00'::time, '17:00'::time, true), -- Dinsdag
    (schedule_id, 3, '09:00'::time, '17:00'::time, true), -- Woensdag
    (schedule_id, 4, '09:00'::time, '17:00'::time, true), -- Donderdag
    (schedule_id, 5, '09:00'::time, '17:00'::time, true), -- Vrijdag
    (schedule_id, 6, '09:00'::time, '17:00'::time, false), -- Zaterdag (niet beschikbaar)
    (schedule_id, 0, '09:00'::time, '17:00'::time, false); -- Zondag (niet beschikbaar)
  
  RETURN new;
END;
$function$;

-- 4. Fix handle_new_user_calendar function
CREATE OR REPLACE FUNCTION public.handle_new_user_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
DECLARE
  calendar_slug text;
  new_calendar_id uuid;
BEGIN
  -- Genereer een unieke slug voor de kalender
  calendar_slug := 'cal-' || substr(new.id::text, 1, 8);
  
  -- Maak automatisch een kalender aan voor de nieuwe user
  INSERT INTO public.calendars (user_id, name, slug, is_default)
  VALUES (
    new.id,
    'Mijn Kalender',
    calendar_slug,
    true
  )
  RETURNING id INTO new_calendar_id;
  
  -- Add the user as owner of their calendar
  INSERT INTO public.calendar_members (calendar_id, user_id, role, accepted_at)
  VALUES (new_calendar_id, new.id, 'owner', now());
  
  RETURN new;
END;
$function$;

-- 5. Fix handle_new_booking function
CREATE OR REPLACE FUNCTION public.handle_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $function$
BEGIN
  -- Genereer confirmation token als deze niet is opgegeven
  IF NEW.confirmation_token IS NULL THEN
    NEW.confirmation_token := public.generate_confirmation_token();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 6. Fix check_availability function
CREATE OR REPLACE FUNCTION public.check_availability(p_calendar_id uuid, p_datetime timestamp with time zone, p_duration_minutes integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  slot_date date;
  slot_time time;
  slot_end_time time;
  day_of_week integer;
  schedule_record record;
  rule_record record;
  override_record record;
BEGIN
  -- Converteer datetime naar datum en tijd
  slot_date := p_datetime::date;
  slot_time := p_datetime::time;
  slot_end_time := (p_datetime + (p_duration_minutes || ' minutes')::interval)::time;
  day_of_week := EXTRACT(DOW FROM p_datetime)::integer;
  
  -- Controleer eerst of er een override is voor deze datum
  SELECT * INTO override_record
  FROM public.availability_overrides
  WHERE calendar_id = p_calendar_id 
    AND date = slot_date;
  
  IF FOUND THEN
    -- Als er een override is en deze is niet beschikbaar, return false
    IF NOT override_record.is_available THEN
      RETURN false;
    END IF;
    
    -- Als er een override is met specifieke tijden, controleer die
    IF override_record.start_time IS NOT NULL AND override_record.end_time IS NOT NULL THEN
      IF slot_time >= override_record.start_time AND slot_end_time <= override_record.end_time THEN
        RETURN true;
      ELSE
        RETURN false;
      END IF;
    END IF;
    
    -- Als override beschikbaar is zonder specifieke tijden, ga door naar normale regels
  END IF;
  
  -- Haal het standaard schema op voor deze kalender
  SELECT * INTO schedule_record
  FROM public.availability_schedules
  WHERE calendar_id = p_calendar_id 
    AND is_default = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Controleer de beschikbaarheidsregel voor deze dag
  SELECT * INTO rule_record
  FROM public.availability_rules
  WHERE schedule_id = schedule_record.id 
    AND day_of_week = day_of_week;
  
  IF NOT FOUND OR NOT rule_record.is_available THEN
    RETURN false;
  END IF;
  
  -- Controleer of het tijdslot binnen de werkuren valt
  IF slot_time >= rule_record.start_time AND slot_end_time <= rule_record.end_time THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$function$;

-- 7. Fix check_booking_conflicts function
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(p_calendar_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_booking_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  conflict_count integer;
BEGIN
  -- Tel het aantal conflicterende boekingen
  SELECT COUNT(*) INTO conflict_count
  FROM public.bookings
  WHERE calendar_id = p_calendar_id
    AND status NOT IN ('cancelled', 'no-show')
    AND (
      -- Nieuwe booking start tijdens bestaande booking
      (p_start_time >= start_time AND p_start_time < end_time)
      OR
      -- Nieuwe booking eindigt tijdens bestaande booking
      (p_end_time > start_time AND p_end_time <= end_time)
      OR
      -- Nieuwe booking omvat bestaande booking volledig
      (p_start_time <= start_time AND p_end_time >= end_time)
    )
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
  
  -- Return true als er conflicten zijn
  RETURN conflict_count > 0;
END;
$function$;

-- 8. Fix get_available_slots function
CREATE OR REPLACE FUNCTION public.get_available_slots(p_calendar_id uuid, p_service_type_id uuid, p_date date, p_timezone text DEFAULT 'Europe/Amsterdam'::text)
RETURNS TABLE(slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
  v_rule_record record;
  v_override_record record;
  v_current_slot timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_day_start timestamp with time zone;
  v_day_end timestamp with time zone;
  v_day_of_week integer;
  v_min_booking_time timestamp with time zone;
  v_max_booking_date date;
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
  SELECT slot_duration, buffer_time, booking_window_days, minimum_notice_hours
  INTO v_slot_duration, v_buffer_time, v_booking_window_days, v_minimum_notice_hours
  FROM public.calendar_settings
  WHERE calendar_id = p_calendar_id;
  
  -- Gebruik standaard waarden als settings niet gevonden
  v_slot_duration := COALESCE(v_slot_duration, 30);
  v_buffer_time := COALESCE(v_buffer_time, 0);
  v_booking_window_days := COALESCE(v_booking_window_days, 60);
  v_minimum_notice_hours := COALESCE(v_minimum_notice_hours, 24);
  
  -- Controleer booking window
  v_max_booking_date := CURRENT_DATE + (v_booking_window_days || ' days')::interval;
  IF p_date > v_max_booking_date THEN
    RETURN;
  END IF;
  
  -- Controleer minimum notice tijd
  v_min_booking_time := NOW() + (v_minimum_notice_hours || ' hours')::interval;
  
  -- Bereken dag van de week (0 = zondag, 1 = maandag, etc.)
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;
  
  -- Controleer eerst voor availability overrides
  SELECT * INTO v_override_record
  FROM public.availability_overrides
  WHERE calendar_id = p_calendar_id AND date = p_date;
  
  IF FOUND THEN
    -- Als er een override is en deze is niet beschikbaar, return geen slots
    IF NOT v_override_record.is_available THEN
      RETURN;
    END IF;
    
    -- Als override specifieke tijden heeft, gebruik die
    IF v_override_record.start_time IS NOT NULL AND v_override_record.end_time IS NOT NULL THEN
      v_day_start := (p_date + v_override_record.start_time)::timestamp with time zone AT TIME ZONE p_timezone;
      v_day_end := (p_date + v_override_record.end_time)::timestamp with time zone AT TIME ZONE p_timezone;
    ELSE
      -- Gebruik normale availability rules
      SELECT * INTO v_schedule_record
      FROM public.availability_schedules
      WHERE calendar_id = p_calendar_id AND is_default = true
      LIMIT 1;
      
      IF NOT FOUND THEN
        RETURN;
      END IF;
      
      SELECT * INTO v_rule_record
      FROM public.availability_rules
      WHERE schedule_id = v_schedule_record.id AND day_of_week = v_day_of_week;
      
      IF NOT FOUND OR NOT v_rule_record.is_available THEN
        RETURN;
      END IF;
      
      v_day_start := (p_date + v_rule_record.start_time)::timestamp with time zone AT TIME ZONE p_timezone;
      v_day_end := (p_date + v_rule_record.end_time)::timestamp with time zone AT TIME ZONE p_timezone;
    END IF;
  ELSE
    -- Geen override, gebruik normale availability rules
    SELECT * INTO v_schedule_record
    FROM public.availability_schedules
    WHERE calendar_id = p_calendar_id AND is_default = true
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN;
    END IF;
    
    SELECT * INTO v_rule_record
    FROM public.availability_rules
    WHERE schedule_id = v_schedule_record.id AND day_of_week = v_day_of_week;
    
    IF NOT FOUND OR NOT v_rule_record.is_available THEN
      RETURN;
    END IF;
    
    v_day_start := (p_date + v_rule_record.start_time)::timestamp with time zone AT TIME ZONE p_timezone;
    v_day_end := (p_date + v_rule_record.end_time)::timestamp with time zone AT TIME ZONE p_timezone;
  END IF;
  
  -- Genereer tijdslots
  v_current_slot := v_day_start;
  
  WHILE v_current_slot < v_day_end LOOP
    v_slot_end := v_current_slot + (v_service_duration || ' minutes')::interval;
    
    -- Controleer of slot binnen werkuren valt
    IF v_slot_end <= v_day_end THEN
      -- Controleer minimum notice tijd
      IF v_current_slot >= v_min_booking_time THEN
        -- Controleer voor booking conflicten (inclusief preparation en cleanup tijd)
        RETURN QUERY
        SELECT 
          v_current_slot,
          v_slot_end,
          NOT public.check_booking_conflicts(
            p_calendar_id,
            v_current_slot - (v_preparation_time || ' minutes')::interval,
            v_slot_end + (v_cleanup_time || ' minutes')::interval,
            NULL
          );
      ELSE
        -- Slot is te vroeg (binnen minimum notice tijd)
        RETURN QUERY
        SELECT v_current_slot, v_slot_end, false;
      END IF;
    END IF;
    
    -- Ga naar volgende slot
    v_current_slot := v_current_slot + (v_slot_duration || ' minutes')::interval;
  END LOOP;
  
  RETURN;
END;
$function$;

-- 9. Fix get_available_slots_range function
CREATE OR REPLACE FUNCTION public.get_available_slots_range(p_calendar_id uuid, p_service_type_id uuid, p_start_date date, p_end_date date, p_timezone text DEFAULT 'Europe/Amsterdam'::text)
RETURNS TABLE(slot_date date, slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_current_date date;
BEGIN
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    RETURN QUERY
    SELECT 
      v_current_date,
      slots.slot_start,
      slots.slot_end,
      slots.is_available
    FROM public.get_available_slots(
      p_calendar_id,
      p_service_type_id,
      v_current_date,
      p_timezone
    ) as slots;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN;
END;
$function$;

-- 10. Fix create_user_with_calendar function
CREATE OR REPLACE FUNCTION public.create_user_with_calendar(p_email text, p_full_name text, p_business_name text DEFAULT NULL::text, p_business_type text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
  v_calendar_id uuid;
  v_calendar_slug text;
BEGIN
  -- Controleer of gebruiker geauthenticeerd is
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  v_user_id := auth.uid();
  
  -- Update user profile (user record bestaat al via trigger)
  UPDATE public.users 
  SET 
    full_name = COALESCE(p_full_name, full_name),
    business_name = p_business_name,
    business_type = p_business_type,
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Haal calendar op die automatisch is aangemaakt
  SELECT id, slug INTO v_calendar_id, v_calendar_slug
  FROM public.calendars 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  -- Als geen kalender bestaat, maak er een aan
  IF v_calendar_id IS NULL THEN
    v_calendar_slug := 'cal-' || substr(v_user_id::text, 1, 8);
    
    INSERT INTO public.calendars (user_id, name, slug)
    VALUES (v_user_id, 'Mijn Kalender', v_calendar_slug)
    RETURNING id INTO v_calendar_id;
  END IF;
  
  -- Setup standaard configuratie voor de kalender
  PERFORM public.setup_calendar_defaults(v_calendar_id, p_business_type);
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'calendar_id', v_calendar_id,
    'calendar_slug', v_calendar_slug
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 11. Fix setup_calendar_defaults function
CREATE OR REPLACE FUNCTION public.setup_calendar_defaults(p_calendar_id uuid, p_business_type text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_schedule_id uuid;
  v_service_name text;
  v_service_duration integer;
  v_service_price decimal(10,2);
BEGIN
  -- Controleer of kalender bestaat en gebruiker eigenaar is
  IF NOT EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE id = p_calendar_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Calendar not found or access denied';
  END IF;
  
  -- Standaard service types toevoegen gebaseerd op business type
  CASE p_business_type
    WHEN 'salon' THEN
      v_service_name := 'Knipbeurt';
      v_service_duration := 45;
      v_service_price := 35.00;
    WHEN 'clinic' THEN
      v_service_name := 'Consultatie';
      v_service_duration := 30;
      v_service_price := 75.00;
    WHEN 'consultant' THEN
      v_service_name := 'Adviesgesprek';
      v_service_duration := 60;
      v_service_price := 125.00;
    WHEN 'trainer' THEN
      v_service_name := 'Training Sessie';
      v_service_duration := 60;
      v_service_price := 50.00;
    ELSE
      v_service_name := 'Afspraak';
      v_service_duration := 30;
      v_service_price := 50.00;
  END CASE;
  
  -- Voeg standaard service type toe als deze nog niet bestaat
  INSERT INTO public.service_types (
    calendar_id, 
    name, 
    duration, 
    price, 
    description,
    color
  )
  SELECT 
    p_calendar_id,
    v_service_name,
    v_service_duration,
    v_service_price,
    'Standaard service type',
    '#3B82F6'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.service_types 
    WHERE calendar_id = p_calendar_id
  );
  
  -- Update calendar settings voor business type
  UPDATE public.calendar_settings
  SET
    slot_duration = v_service_duration,
    minimum_notice_hours = CASE 
      WHEN p_business_type IN ('clinic', 'consultant') THEN 48
      ELSE 24
    END,
    booking_window_days = CASE
      WHEN p_business_type = 'consultant' THEN 90
      ELSE 60
    END,
    confirmation_required = CASE
      WHEN p_business_type IN ('clinic', 'consultant') THEN true
      ELSE false
    END
  WHERE calendar_id = p_calendar_id;
  
END;
$function$;

-- 12. Fix get_calendar_availability function
CREATE OR REPLACE FUNCTION public.get_calendar_availability(p_calendar_slug text, p_start_date date DEFAULT CURRENT_DATE, p_days integer DEFAULT 14)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_end_date date;
  v_result json;
BEGIN
  -- Haal calendar ID op via slug
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE slug = p_calendar_slug 
    AND is_active = true;
    
  IF v_calendar_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Calendar not found'
    );
  END IF;
  
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Haal beschikbare slots op voor alle actieve service types
  SELECT json_agg(
    json_build_object(
      'date', slot_date,
      'service_type_id', service_type_id,
      'service_name', service_name,
      'duration', service_duration,
      'price', service_price,
      'slots', slots_array
    )
  ) INTO v_result
  FROM (
    SELECT 
      slots.slot_date,
      st.id as service_type_id,
      st.name as service_name,
      st.duration as service_duration,
      st.price as service_price,
      json_agg(
        json_build_object(
          'start_time', slots.slot_start,
          'end_time', slots.slot_end,
          'available', slots.is_available
        ) ORDER BY slots.slot_start
      ) as slots_array
    FROM public.service_types st
    CROSS JOIN LATERAL public.get_available_slots_range(
      v_calendar_id,
      st.id,
      p_start_date,
      v_end_date
    ) as slots
    WHERE st.calendar_id = v_calendar_id 
      AND st.is_active = true
    GROUP BY slots.slot_date, st.id, st.name, st.duration, st.price
    ORDER BY slots.slot_date, st.name
  ) availability_data;
  
  RETURN json_build_object(
    'success', true,
    'calendar_id', v_calendar_id,
    'availability', COALESCE(v_result, '[]'::json)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 13. Fix create_booking function
CREATE OR REPLACE FUNCTION public.create_booking(p_calendar_slug text, p_service_type_id uuid, p_customer_name text, p_customer_email text, p_customer_phone text, p_start_time timestamp with time zone, p_notes text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_service_duration integer;
  v_end_time timestamp with time zone;
  v_booking_id uuid;
  v_confirmation_token text;
BEGIN
  -- Haal calendar en service info op
  SELECT c.id, st.duration 
  INTO v_calendar_id, v_service_duration
  FROM public.calendars c
  JOIN public.service_types st ON st.calendar_id = c.id
  WHERE c.slug = p_calendar_slug 
    AND c.is_active = true
    AND st.id = p_service_type_id
    AND st.is_active = true;
    
  IF v_calendar_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Calendar or service type not found'
    );
  END IF;
  
  -- Bereken eind tijd
  v_end_time := p_start_time + (v_service_duration || ' minutes')::interval;
  
  -- Controleer voor conflicten
  IF public.check_booking_conflicts(v_calendar_id, p_start_time, v_end_time) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Time slot is no longer available'
    );
  END IF;
  
  -- Maak booking aan
  INSERT INTO public.bookings (
    calendar_id,
    service_type_id,
    customer_name,
    customer_email,
    customer_phone,
    start_time,
    end_time,
    notes,
    status
  ) VALUES (
    v_calendar_id,
    p_service_type_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_start_time,
    v_end_time,
    p_notes,
    'confirmed'
  ) RETURNING id, confirmation_token INTO v_booking_id, v_confirmation_token;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'confirmation_token', v_confirmation_token,
    'start_time', p_start_time,
    'end_time', v_end_time
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 14. Fix resolve_recurring_availability function
CREATE OR REPLACE FUNCTION public.resolve_recurring_availability(p_calendar_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(resolved_date date, pattern_id uuid, availability_rules jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  pattern_record record;
  processing_date date;
  week_offset integer;
  day_of_month integer;
  week_of_month integer;
BEGIN
  -- Loop through all active recurring patterns for this calendar
  FOR pattern_record IN 
    SELECT * FROM public.recurring_availability 
    WHERE calendar_id = p_calendar_id 
      AND is_active = true 
      AND start_date <= p_end_date 
      AND (end_date IS NULL OR end_date >= p_start_date)
  LOOP
    processing_date := GREATEST(pattern_record.start_date, p_start_date);
    
    WHILE processing_date <= p_end_date AND 
          (pattern_record.end_date IS NULL OR processing_date <= pattern_record.end_date) 
    LOOP
      CASE pattern_record.pattern_type
        WHEN 'weekly' THEN
          -- Weekly pattern: check if current day matches
          IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'biweekly' THEN
          -- Biweekly pattern: alternate weeks
          week_offset := FLOOR(EXTRACT(EPOCH FROM (processing_date - pattern_record.start_date)) / (7 * 24 * 3600))::integer;
          IF week_offset % 2 = 0 AND 
             (pattern_record.schedule_data->>'week1_days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'week1_availability';
          ELSIF week_offset % 2 = 1 AND 
                (pattern_record.schedule_data->>'week2_days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'week2_availability';
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'monthly' THEN
          -- Monthly pattern: specific weeks of month
          week_of_month := CEIL(EXTRACT(DAY FROM processing_date) / 7.0)::integer;
          day_of_month := EXTRACT(DAY FROM processing_date)::integer;
          
          -- Check for "first/last" patterns
          IF (pattern_record.schedule_data->>'occurrence' = 'first' AND week_of_month = 1) OR
             (pattern_record.schedule_data->>'occurrence' = 'last' AND 
              processing_date + 7 > (date_trunc('month', processing_date) + interval '1 month - 1 day')::date) THEN
            IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
              RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
            END IF;
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'seasonal' THEN
          -- Seasonal pattern: date ranges within year
          IF (EXTRACT(MONTH FROM processing_date) >= (pattern_record.schedule_data->>'start_month')::integer AND
              EXTRACT(MONTH FROM processing_date) <= (pattern_record.schedule_data->>'end_month')::integer) THEN
            IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
              RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
            END IF;
          END IF;
          processing_date := processing_date + 1;
          
        ELSE
          processing_date := processing_date + 1;
      END CASE;
    END LOOP;
  END LOOP;
END;
$function$;

-- 15. Fix process_waitlist_for_cancelled_booking function
CREATE OR REPLACE FUNCTION public.process_waitlist_for_cancelled_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  waitlist_entry record;
  service_duration integer;
  booking_start_time timestamp with time zone;
  booking_end_time timestamp with time zone;
BEGIN
  -- Only process when a booking is cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    
    -- Get service duration
    SELECT duration INTO service_duration
    FROM public.service_types
    WHERE id = NEW.service_type_id;
    
    booking_start_time := NEW.start_time;
    booking_end_time := NEW.end_time;
    
    -- Find matching waitlist entries
    FOR waitlist_entry IN 
      SELECT * FROM public.waitlist
      WHERE calendar_id = NEW.calendar_id
        AND service_type_id = NEW.service_type_id
        AND status = 'waiting'
        AND preferred_date = booking_start_time::date
        AND (
          flexibility = 'anytime' OR
          (flexibility = 'morning' AND EXTRACT(HOUR FROM booking_start_time) < 12) OR
          (flexibility = 'afternoon' AND EXTRACT(HOUR FROM booking_start_time) >= 12) OR
          (flexibility = 'specific' AND 
           booking_start_time::time >= COALESCE(preferred_time_start, '00:00'::time) AND
           booking_start_time::time <= COALESCE(preferred_time_end, '23:59'::time))
        )
      ORDER BY created_at ASC
      LIMIT 1
    LOOP
      -- Create booking for waitlist entry
      INSERT INTO public.bookings (
        calendar_id,
        service_type_id,
        customer_name,
        customer_email,
        start_time,
        end_time,
        status,
        notes
      ) VALUES (
        waitlist_entry.calendar_id,
        waitlist_entry.service_type_id,
        waitlist_entry.customer_name,
        waitlist_entry.customer_email,
        booking_start_time,
        booking_end_time,
        'confirmed',
        'Converted from waitlist'
      );
      
      -- Update waitlist entry status
      UPDATE public.waitlist
      SET status = 'converted',
          notified_at = now()
      WHERE id = waitlist_entry.id;
      
      -- Exit after converting first match
      EXIT;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 16. Fix add_to_waitlist function
CREATE OR REPLACE FUNCTION public.add_to_waitlist(p_calendar_slug text, p_service_type_id uuid, p_customer_name text, p_customer_email text, p_preferred_date date, p_preferred_time_start time without time zone DEFAULT NULL::time without time zone, p_preferred_time_end time without time zone DEFAULT NULL::time without time zone, p_flexibility text DEFAULT 'anytime'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_waitlist_id uuid;
BEGIN
  -- Get calendar ID
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE slug = p_calendar_slug 
    AND is_active = true;
    
  IF v_calendar_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Calendar not found'
    );
  END IF;
  
  -- Check if service type exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.service_types
    WHERE id = p_service_type_id 
      AND calendar_id = v_calendar_id
      AND is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Service type not found'
    );
  END IF;
  
  -- Add to waitlist
  INSERT INTO public.waitlist (
    calendar_id,
    service_type_id,
    customer_name,
    customer_email,
    preferred_date,
    preferred_time_start,
    preferred_time_end,
    flexibility
  ) VALUES (
    v_calendar_id,
    p_service_type_id,
    p_customer_name,
    p_customer_email,
    p_preferred_date,
    p_preferred_time_start,
    p_preferred_time_end,
    p_flexibility
  ) RETURNING id INTO v_waitlist_id;
  
  RETURN json_build_object(
    'success', true,
    'waitlist_id', v_waitlist_id,
    'message', 'Successfully added to waitlist'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 17. Fix cleanup_expired_waitlist function
CREATE OR REPLACE FUNCTION public.cleanup_expired_waitlist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.waitlist
  SET status = 'expired'
  WHERE status = 'waiting'
    AND preferred_date < CURRENT_DATE;
END;
$function$;

-- 18. Fix refresh_analytics_views function
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.calendar_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.service_type_stats;
END;
$function$;

-- 19. Fix process_webhook_queue function
CREATE OR REPLACE FUNCTION public.process_webhook_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  webhook_record record;
  max_attempts integer := 5;
  retry_delays integer[] := ARRAY[60, 300, 900, 3600, 7200]; -- 1min, 5min, 15min, 1h, 2h
BEGIN
  -- Verwerk webhook events die opnieuw geprobeerd moeten worden
  FOR webhook_record IN 
    SELECT * FROM public.webhook_events 
    WHERE status IN ('pending', 'failed') 
      AND attempts < max_attempts
      AND (last_attempt_at IS NULL OR 
           last_attempt_at < NOW() - (retry_delays[LEAST(attempts + 1, array_length(retry_delays, 1))] || ' seconds')::interval)
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    -- Update attempt count
    UPDATE public.webhook_events 
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
$function$;

-- 20. Fix log_error function
CREATE OR REPLACE FUNCTION public.log_error(p_calendar_id uuid, p_error_type text, p_error_message text, p_error_context jsonb DEFAULT NULL::jsonb, p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.error_logs (calendar_id, error_type, error_message, error_context, user_id)
  VALUES (p_calendar_id, p_error_type, p_error_message, p_error_context, p_user_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;

-- 21. Fix get_conversation_context function
CREATE OR REPLACE FUNCTION public.get_conversation_context(p_phone_number text, p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Haal alle relevante context op voor een gesprek
  SELECT jsonb_build_object(
    'contact', row_to_json(wc.*),
    'conversation', row_to_json(conv.*),
    'recent_messages', (
      SELECT jsonb_agg(row_to_json(m.*) ORDER BY m.created_at DESC)
      FROM public.whatsapp_messages m
      WHERE m.conversation_id = conv.id
      LIMIT 10
    ),
    'active_booking_intent', (
      SELECT row_to_json(bi.*)
      FROM public.booking_intents bi
      WHERE bi.conversation_id = conv.id
      AND bi.status = 'collecting_info'
      ORDER BY bi.created_at DESC
      LIMIT 1
    ),
    'context_history', (
      SELECT jsonb_agg(row_to_json(cc.*) ORDER BY cc.created_at DESC)
      FROM public.conversation_context cc
      WHERE cc.conversation_id = conv.id
      AND (cc.expires_at IS NULL OR cc.expires_at > NOW())
      LIMIT 20
    ),
    'previous_bookings', (
      SELECT jsonb_agg(row_to_json(b.*))
      FROM public.bookings b
      WHERE b.customer_phone = p_phone_number
      AND b.calendar_id = p_calendar_id
      ORDER BY b.created_at DESC
      LIMIT 5
    )
  ) INTO v_result
  FROM public.whatsapp_contacts wc
  LEFT JOIN public.whatsapp_conversations conv ON conv.contact_id = wc.id AND conv.calendar_id = p_calendar_id
  WHERE wc.phone_number = p_phone_number;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

-- 22. Fix cleanup_expired_context function
CREATE OR REPLACE FUNCTION public.cleanup_expired_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.conversation_context
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$function$;

-- 23. Fix cleanup_duplicate_availability_rules function
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_availability_rules(p_schedule_id uuid, p_day_of_week integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Verwijder duplicaten, behoud alleen de nieuwste
  DELETE FROM public.availability_rules 
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (
               PARTITION BY schedule_id, day_of_week, start_time, end_time 
               ORDER BY created_at DESC
             ) as rn
      FROM public.availability_rules
      WHERE schedule_id = p_schedule_id 
        AND day_of_week = p_day_of_week
    ) t
    WHERE t.rn > 1
  );
END;
$function$;

-- 24. Fix get_dashboard_metrics function
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
  v_today_bookings integer;
  v_pending_bookings integer;
  v_total_revenue numeric;
  v_week_bookings integer;
  v_month_bookings integer;
  v_conversion_rate numeric;
  v_avg_response_time numeric;
BEGIN
  -- Today's bookings
  SELECT COUNT(*) INTO v_today_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND DATE(start_time) = CURRENT_DATE
    AND status != 'cancelled';

  -- Pending confirmations
  SELECT COUNT(*) INTO v_pending_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND status = 'pending';

  -- This week's bookings
  SELECT COUNT(*) INTO v_week_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND start_time >= date_trunc('week', CURRENT_DATE)
    AND start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
    AND status != 'cancelled';

  -- This month's bookings  
  SELECT COUNT(*) INTO v_month_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND start_time >= date_trunc('month', CURRENT_DATE)
    AND start_time < date_trunc('month', CURRENT_DATE) + interval '1 month'
    AND status != 'cancelled';

  -- Total revenue this month
  SELECT COALESCE(SUM(COALESCE(b.total_price, st.price, 0)), 0) INTO v_total_revenue
  FROM public.bookings b
  LEFT JOIN public.service_types st ON b.service_type_id = st.id
  WHERE b.calendar_id = p_calendar_id 
    AND b.start_time >= date_trunc('month', CURRENT_DATE)
    AND b.status != 'cancelled';

  -- WhatsApp conversion rate (if WhatsApp data exists)
  SELECT COALESCE(
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100)
      ELSE 0 
    END, 0
  ) INTO v_conversion_rate
  FROM public.booking_intents bi
  JOIN public.whatsapp_conversations wc ON bi.conversation_id = wc.id
  WHERE wc.calendar_id = p_calendar_id
    AND bi.created_at >= CURRENT_DATE - interval '30 days';

  -- Average WhatsApp response time (in minutes)
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      SELECT MIN(m2.created_at) 
      FROM public.whatsapp_messages m2 
      WHERE m2.conversation_id = m1.conversation_id 
        AND m2.direction = 'outbound' 
        AND m2.created_at > m1.created_at
    ) - m1.created_at) / 60
  ), 0) INTO v_avg_response_time
  FROM public.whatsapp_messages m1
  JOIN public.whatsapp_conversations wc ON m1.conversation_id = wc.id
  WHERE wc.calendar_id = p_calendar_id
    AND m1.direction = 'inbound'
    AND m1.created_at >= CURRENT_DATE - interval '7 days';

  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'conversion_rate', ROUND(v_conversion_rate, 1),
    'avg_response_time', ROUND(v_avg_response_time, 1),
    'last_updated', now()
  );

  RETURN v_result;
END;
$function$;

-- 25. Fix get_dashboard_metrics_safe function
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_safe(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
  v_today_bookings integer := 0;
  v_pending_bookings integer := 0;
  v_total_revenue numeric := 0;
  v_week_bookings integer := 0;
  v_month_bookings integer := 0;
BEGIN
  -- Veilige queries met COALESCE voor null handling
  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_today_bookings
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id 
      AND DATE(start_time) = CURRENT_DATE
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_today_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_pending_bookings
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id 
      AND status = 'pending';
  EXCEPTION WHEN OTHERS THEN
    v_pending_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_week_bookings
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id 
      AND start_time >= date_trunc('week', CURRENT_DATE)
      AND start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_week_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_month_bookings
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id 
      AND start_time >= date_trunc('month', CURRENT_DATE)
      AND start_time < date_trunc('month', CURRENT_DATE) + interval '1 month'
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_month_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(SUM(COALESCE(b.total_price, st.price, 0)), 0) INTO v_total_revenue
    FROM public.bookings b
    LEFT JOIN public.service_types st ON b.service_type_id = st.id
    WHERE b.calendar_id = p_calendar_id 
      AND b.start_time >= date_trunc('month', CURRENT_DATE)
      AND b.status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_total_revenue := 0;
  END;

  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'conversion_rate', 0,
    'avg_response_time', 0,
    'last_updated', now()
  );

  RETURN v_result;
END;
$function$;

-- 26. Fix get_todays_schedule function
CREATE OR REPLACE FUNCTION public.get_todays_schedule(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'customer_name', b.customer_name,
      'service_name', COALESCE(b.service_name, st.name),
      'start_time', b.start_time,
      'end_time', b.end_time,
      'status', b.status,
      'customer_phone', b.customer_phone,
      'customer_email', b.customer_email,
      'notes', b.notes
    ) ORDER BY b.start_time
  ) INTO v_result
  FROM public.bookings b
  LEFT JOIN public.service_types st ON b.service_type_id = st.id
  WHERE b.calendar_id = p_calendar_id
    AND DATE(b.start_time) = CURRENT_DATE
    AND b.status != 'cancelled';

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

-- 27. Fix get_booking_trends function
CREATE OR REPLACE FUNCTION public.get_booking_trends(p_calendar_id uuid, p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', booking_date,
      'bookings', booking_count,
      'revenue', revenue
    ) ORDER BY booking_date
  ) INTO v_result
  FROM (
    SELECT 
      DATE(b.start_time) as booking_date,
      COUNT(*) as booking_count,
      SUM(COALESCE(b.total_price, st.price, 0)) as revenue
    FROM public.bookings b
    LEFT JOIN public.service_types st ON b.service_type_id = st.id
    WHERE b.calendar_id = p_calendar_id
      AND b.start_time >= CURRENT_DATE - (p_days || ' days')::interval
      AND b.status != 'cancelled'
    GROUP BY DATE(b.start_time)
    ORDER BY DATE(b.start_time)
  ) trends;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

-- 28. Fix refresh_dashboard_metrics function
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_metrics_mv;
END;
$function$;

-- 29. Fix ensure_default_service_types function
CREATE OR REPLACE FUNCTION public.ensure_default_service_types()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  calendar_record RECORD;
BEGIN
  -- Loop door alle kalenders die geen service types hebben
  FOR calendar_record IN 
    SELECT c.* FROM public.calendars c
    LEFT JOIN public.service_types st ON c.id = st.calendar_id
    WHERE st.id IS NULL AND c.is_active = true
  LOOP
    -- Voeg standaard service type toe
    INSERT INTO public.service_types (
      calendar_id, 
      name, 
      duration, 
      price, 
      description,
      color,
      is_active
    ) VALUES (
      calendar_record.id,
      'Standaard Afspraak',
      30,
      50.00,
      'Standaard service type',
      '#3B82F6',
      true
    );
  END LOOP;
END;
$function$;
