-- Complete remaining database function security fixes
-- Add SET search_path = '' to remaining functions

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.team_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at <= now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_webhook_queue()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  PERFORM process_booking_webhook_events();
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.get_formatted_business_hours(p_calendar_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_result text := '';
  v_rule record;
  v_day_name text;
BEGIN
  -- Haal alle availability rules op voor de standaard schedule
  FOR v_rule IN 
    SELECT ar.day_of_week, ar.start_time, ar.end_time, ar.is_available
    FROM public.availability_rules ar
    JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
    WHERE sch.calendar_id = p_calendar_id
      AND sch.is_default = true
    ORDER BY ar.day_of_week
  LOOP
    -- Simple day name mapping to avoid dependency on external functions
    v_day_name := CASE v_rule.day_of_week
      WHEN 1 THEN 'Maandag'
      WHEN 2 THEN 'Dinsdag'
      WHEN 3 THEN 'Woensdag'
      WHEN 4 THEN 'Donderdag'
      WHEN 5 THEN 'Vrijdag'
      WHEN 6 THEN 'Zaterdag'
      WHEN 7 THEN 'Zondag'
      ELSE 'Onbekend'
    END;
    
    IF v_rule.is_available THEN
      v_result := v_result || v_day_name || ': ' || 
                  v_rule.start_time::text || ' - ' || 
                  v_rule.end_time::text || E'\n';
    ELSE
      v_result := v_result || v_day_name || ': Gesloten' || E'\n';
    END IF;
  END LOOP;
  
  RETURN TRIM(v_result);
END;
$function$;