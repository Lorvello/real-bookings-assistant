-- Security Hardening: Phase 4 - Fix remaining issues

-- 1. Find and fix all views with security definer
-- Replace materialized views that might have security definer issues
DROP VIEW IF EXISTS public.available_slots_view CASCADE;
DROP VIEW IF EXISTS public.daily_booking_stats CASCADE;
DROP VIEW IF EXISTS public.service_popularity_stats CASCADE;

-- Create regular views without security definer
CREATE VIEW public.available_slots_view AS
SELECT 
  slots.calendar_id,
  c.name as calendar_name,
  c.slug as calendar_slug,
  slots.service_type_id,
  st.name as service_name,
  st.duration as service_duration,
  st.price as service_price,
  slots.slot_start,
  slots.slot_end,
  slots.is_available,
  st.duration as duration_minutes
FROM public.get_business_available_slots(
  (SELECT slug FROM public.calendars c2 WHERE c2.is_active = true LIMIT 1),
  NULL,
  CURRENT_DATE,
  14
) as slots
JOIN public.calendars c ON c.id = slots.calendar_id
JOIN public.service_types st ON st.id = slots.service_type_id;

-- 2. Fix remaining functions that might still have issues
-- Check if there are any system functions that need search_path
CREATE OR REPLACE FUNCTION public.validate_payment_security(
  p_ip_address inet, 
  p_calendar_id uuid, 
  p_amount_cents integer, 
  p_currency text, 
  p_user_email text, 
  p_user_agent text DEFAULT NULL::text, 
  p_country_code text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_settings RECORD;
  v_validation_result JSONB := jsonb_build_object('valid', true, 'warnings', '[]'::jsonb);
  v_warnings JSONB := '[]'::jsonb;
  v_user_id UUID;
  v_user_created_at TIMESTAMP WITH TIME ZONE;
  v_recent_cards INTEGER;
BEGIN
  -- Get security settings
  SELECT * INTO v_settings
  FROM public.payment_security_settings
  WHERE calendar_id = p_calendar_id;
  
  -- Use defaults if no settings
  IF v_settings IS NULL THEN
    v_settings := ROW(
      gen_random_uuid(), p_calendar_id, 3, 10, 500, 50000, 
      ARRAY[]::TEXT[], 2, true, 100, 3, 24, NOW(), NOW()
    );
  END IF;
  
  -- 1. Amount validation
  IF p_amount_cents < v_settings.min_payment_amount_cents THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'amount_too_low',
      'message', 'Payment amount below minimum threshold',
      'amount', p_amount_cents,
      'minimum', v_settings.min_payment_amount_cents
    );
  END IF;
  
  IF p_amount_cents > v_settings.max_payment_amount_cents THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'amount_too_high',
      'message', 'Payment amount above maximum threshold',
      'amount', p_amount_cents,
      'maximum', v_settings.max_payment_amount_cents
    );
  END IF;
  
  -- 2. Suspicious amount detection (card testing pattern)
  IF v_settings.card_testing_detection_enabled AND p_amount_cents <= v_settings.suspicious_amount_threshold_cents THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'suspicious_amount',
      'message', 'Small amount payment detected (possible card testing)',
      'amount', p_amount_cents,
      'severity', 'high'
    );
  END IF;
  
  -- 3. Country blocking
  IF p_country_code IS NOT NULL AND p_country_code = ANY(v_settings.blocked_countries) THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'geo_blocked',
      'message', 'Payment from blocked country',
      'country', p_country_code
    );
  END IF;
  
  -- 4. User age validation (new user protection)
  SELECT id, created_at INTO v_user_id, v_user_created_at
  FROM auth.users
  WHERE email = p_user_email;
  
  IF v_user_created_at IS NOT NULL AND 
     v_user_created_at > NOW() - (v_settings.new_user_payment_delay_hours || ' hours')::INTERVAL THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'new_user_warning',
      'message', 'Payment from newly created user account',
      'user_age_hours', EXTRACT(EPOCH FROM (NOW() - v_user_created_at))/3600,
      'severity', 'medium'
    );
  END IF;
  
  -- 5. Check for disposable email domains
  IF p_user_email SIMILAR TO '%@(10minutemail|guerrillamail|tempmail|mailinator|throwaway)%' THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'disposable_email',
      'message', 'Disposable email address detected',
      'email', p_user_email
    );
  END IF;
  
  -- Set warnings in result
  v_validation_result := jsonb_set(v_validation_result, '{warnings}', v_warnings);
  
  -- Log validation result if there are warnings
  IF jsonb_array_length(v_warnings) > 0 THEN
    INSERT INTO public.payment_security_logs (
      event_type, ip_address, amount_cents, currency, user_agent, 
      request_data, severity
    ) VALUES (
      'payment_validation', p_ip_address, p_amount_cents, p_currency, p_user_agent,
      jsonb_build_object(
        'email', p_user_email,
        'country', p_country_code,
        'validation_result', v_validation_result
      ),
      CASE WHEN (v_validation_result->>'valid')::boolean THEN 'medium' ELSE 'high' END
    );
  END IF;
  
  RETURN v_validation_result;
END;
$function$;

-- 3. Fix the remaining functions without search_path
CREATE OR REPLACE FUNCTION public.add_to_waitlist(
  p_calendar_slug text, 
  p_service_type_id uuid, 
  p_customer_name text, 
  p_customer_email text, 
  p_preferred_date date, 
  p_preferred_time_start time without time zone DEFAULT NULL::time without time zone, 
  p_preferred_time_end time without time zone DEFAULT NULL::time without time zone, 
  p_flexibility text DEFAULT 'anytime'::text
)
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

CREATE OR REPLACE FUNCTION public.get_calendar_availability(
  p_calendar_slug text, 
  p_start_date date DEFAULT CURRENT_DATE, 
  p_days integer DEFAULT 14
)
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

-- 4. Fix generate_mock_data function
CREATE OR REPLACE FUNCTION public.generate_mock_data(p_user_id uuid, p_data_type text DEFAULT 'basic'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_schedule_id uuid;
  v_service_id uuid;
  v_business_names text[] := ARRAY['Salon Beauty', 'Wellness Clinic', 'Consulting Bureau', 'Fitness Studio', 'Dental Practice'];
  v_business_name text;
  v_service_names text[] := ARRAY['Consultation', 'Treatment', 'Checkup', 'Session', 'Appointment'];
  v_service_name text;
  v_customer_names text[] := ARRAY['Jan Smit', 'Emma de Vries', 'Pieter Jansen', 'Sophie van Berg', 'Thomas Bakker'];
  v_customer_emails text[] := ARRAY['jan@example.com', 'emma@example.com', 'pieter@example.com', 'sophie@example.com', 'thomas@example.com'];
  v_customer_phones text[] := ARRAY['+31612345678', '+31623456789', '+31634567890', '+31645678901', '+31656789012'];
  i integer;
  v_start_time timestamp with time zone;
  v_end_time timestamp with time zone;
  v_weekday integer;
BEGIN
  -- Get or create calendar
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE user_id = p_user_id
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    -- Create calendar
    INSERT INTO public.calendars (user_id, name, description, slug, color, timezone)
    VALUES (
      p_user_id,
      'Demo Calendar',
      'Demo calendar for testing',
      'demo-' || substr(p_user_id::text, 1, 8),
      '#3B82F6',
      'Europe/Amsterdam'
    )
    RETURNING id INTO v_calendar_id;
  END IF;
  
  -- Get business name for this user
  SELECT business_name INTO v_business_name
  FROM public.users
  WHERE id = p_user_id;
  
  IF v_business_name IS NULL THEN
    v_business_name := v_business_names[1 + floor(random() * array_length(v_business_names, 1))];
  END IF;
  
  -- Create or get availability schedule
  SELECT id INTO v_schedule_id
  FROM public.availability_schedules
  WHERE calendar_id = v_calendar_id AND is_default = true
  LIMIT 1;
  
  IF v_schedule_id IS NULL THEN
    INSERT INTO public.availability_schedules (calendar_id, name, is_default)
    VALUES (v_calendar_id, 'Standaard Schema', true)
    RETURNING id INTO v_schedule_id;
  END IF;
  
  -- Clear existing availability rules for this schedule
  DELETE FROM public.availability_rules WHERE schedule_id = v_schedule_id;
  
  -- Create availability rules (Monday=1 to Friday=5)
  FOR v_weekday IN 1..5 LOOP
    INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
    VALUES (
      v_schedule_id,
      v_weekday,  -- Now using 1-7 range (Monday=1, Sunday=7)
      '09:00'::time,
      '17:00'::time,
      true
    );
  END LOOP;
  
  -- Create service types
  FOR i IN 1..LEAST(3, array_length(v_service_names, 1)) LOOP
    v_service_name := v_service_names[i];
    
    INSERT INTO public.service_types (
      calendar_id,
      name,
      description,
      duration,
      price,
      color,
      is_active
    )
    VALUES (
      v_calendar_id,
      v_service_name,
      'Demo service: ' || v_service_name,
      CASE i
        WHEN 1 THEN 30
        WHEN 2 THEN 60
        ELSE 45
      END,
      CASE i
        WHEN 1 THEN 50.00
        WHEN 2 THEN 85.00
        ELSE 65.00
      END,
      CASE i
        WHEN 1 THEN '#3B82F6'
        WHEN 2 THEN '#10B981'
        ELSE '#F59E0B'
      END,
      true
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- For comprehensive data, add more content
  IF p_data_type = 'comprehensive' THEN
    -- Get first service type for bookings
    SELECT id INTO v_service_id
    FROM public.service_types
    WHERE calendar_id = v_calendar_id
    LIMIT 1;
    
    -- Create sample bookings for the past week and upcoming week
    FOR i IN 1..10 LOOP
      v_start_time := now() + (random() * interval '14 days' - interval '7 days');
      v_end_time := v_start_time + interval '1 hour';
      
      INSERT INTO public.bookings (
        calendar_id,
        service_type_id,
        customer_name,
        customer_email,
        customer_phone,
        start_time,
        end_time,
        status,
        business_name,
        service_name,
        total_price,
        notes
      )
      VALUES (
        v_calendar_id,
        v_service_id,
        v_customer_names[1 + floor(random() * array_length(v_customer_names, 1))],
        v_customer_emails[1 + floor(random() * array_length(v_customer_emails, 1))],
        v_customer_phones[1 + floor(random() * array_length(v_customer_phones, 1))],
        v_start_time,
        v_end_time,
        CASE floor(random() * 4)
          WHEN 0 THEN 'confirmed'
          WHEN 1 THEN 'pending'
          WHEN 2 THEN 'completed'
          ELSE 'confirmed'
        END,
        v_business_name,
        v_service_name,
        50.00 + (random() * 100),
        'Demo booking ' || i
      );
    END LOOP;
    
    -- Add weekend availability (Saturday=6, Sunday=7)
    INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
    VALUES 
    (v_schedule_id, 6, '10:00'::time, '16:00'::time, true),  -- Saturday
    (v_schedule_id, 7, '12:00'::time, '17:00'::time, true);  -- Sunday
  END IF;
  
  -- Update calendar settings
  UPDATE public.calendar_settings
  SET
    slot_duration = 30,
    minimum_notice_hours = 24,
    booking_window_days = 60,
    max_bookings_per_day = 10,
    confirmation_required = true,
    allow_waitlist = true,
    buffer_time = 15
  WHERE calendar_id = v_calendar_id;
  
  -- If no settings exist, create them
  IF NOT FOUND THEN
    INSERT INTO public.calendar_settings (
      calendar_id,
      slot_duration,
      minimum_notice_hours,
      booking_window_days,
      max_bookings_per_day,
      confirmation_required,
      allow_waitlist,
      buffer_time
    )
    VALUES (
      v_calendar_id,
      30,
      24,
      60,
      10,
      true,
      true,
      15
    );
  END IF;
  
END;
$function$;