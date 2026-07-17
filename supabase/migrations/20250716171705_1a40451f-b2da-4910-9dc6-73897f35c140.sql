-- Fix start_time/end_time validation in admin_generate_mock_data function
-- Change Saturday/Sunday availability rules to use valid time range

CREATE OR REPLACE FUNCTION public.admin_generate_mock_data(p_user_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_calendar_id uuid;
  v_schedule_id uuid;
  v_service_id uuid;
  v_business_names text[] := ARRAY['Salon Beauty', 'Wellness Clinic', 'Consulting Bureau', 'Fitness Studio', 'Dental Practice'];
  v_business_name text;
  v_calendar_names text[] := ARRAY['Hoofdkalender', 'Afsprakenkalender', 'Consultatie Planning', 'Studio Boekingen', 'Praktijk Agenda'];
  v_calendar_name text;
  v_service_names text[] := ARRAY['Consultation', 'Treatment', 'Checkup', 'Session', 'Appointment'];
  v_service_name text;
  v_customer_names text[] := ARRAY['Jan Smit', 'Emma de Vries', 'Pieter Jansen', 'Sophie van Berg', 'Thomas Bakker'];
  v_customer_emails text[] := ARRAY['jan@example.com', 'emma@example.com', 'pieter@example.com', 'sophie@example.com', 'thomas@example.com'];
  v_customer_phones text[] := ARRAY['+31612345678', '+31623456789', '+31634567890', '+31645678901', '+31656789012'];
  i integer;
  v_start_time timestamp with time zone;
  v_end_time timestamp with time zone;
  v_weekday integer;
  v_service_count integer;
  v_is_professional boolean;
BEGIN
  -- Determine mock data characteristics based on status
  CASE p_status
    WHEN 'active_trial' THEN
      v_business_name := v_business_names[1];
      v_calendar_name := v_calendar_names[1];
      v_service_count := 2;
      v_is_professional := false;
    WHEN 'expired_trial' THEN
      v_business_name := v_business_names[2];
      v_calendar_name := v_calendar_names[2];
      v_service_count := 1;
      v_is_professional := false;
    WHEN 'paid_subscriber' THEN
      v_business_name := v_business_names[3];
      v_calendar_name := v_calendar_names[3];
      v_service_count := 4;
      v_is_professional := true;
    WHEN 'cancelled_but_active' THEN
      v_business_name := v_business_names[4];
      v_calendar_name := v_calendar_names[4];
      v_service_count := 3;
      v_is_professional := true;
    WHEN 'cancelled_and_inactive' THEN
      v_business_name := v_business_names[5];
      v_calendar_name := v_calendar_names[5];
      v_service_count := 2;
      v_is_professional := false;
    ELSE
      v_business_name := v_business_names[1];
      v_calendar_name := v_calendar_names[1];
      v_service_count := 2;
      v_is_professional := false;
  END CASE;

  -- Update user business information
  UPDATE public.users
  SET
    business_name = v_business_name,
    business_type = CASE 
      WHEN v_is_professional THEN 'healthcare'
      ELSE 'service'
    END,
    updated_at = now()
  WHERE id = p_user_id;

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
      v_calendar_name,
      'Demo calendar voor ' || v_business_name,
      'demo-' || substr(p_user_id::text, 1, 8),
      '#3B82F6',
      'Europe/Amsterdam'
    )
    RETURNING id INTO v_calendar_id;
  ELSE
    -- Update existing calendar
    UPDATE public.calendars
    SET
      name = v_calendar_name,
      description = 'Demo calendar voor ' || v_business_name,
      updated_at = now()
    WHERE id = v_calendar_id;
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

  -- Create availability rules for Monday (1) to Friday (5)
  FOR v_weekday IN 1..5 LOOP
    INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
    VALUES (
      v_schedule_id,
      v_weekday,
      '09:00'::time,
      '17:00'::time,
      true
    );
  END LOOP;

  -- Add Saturday (6) and Sunday (7) as unavailable but with valid time range
  INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
  VALUES 
    (v_schedule_id, 6, '09:00', '17:00', false),
    (v_schedule_id, 7, '09:00', '17:00', false);

  -- Create service types
  FOR i IN 1..v_service_count LOOP
    v_service_name := v_service_names[LEAST(i, array_length(v_service_names, 1))];
    
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
      v_service_name || ' ' || i,
      'Demo service: ' || v_service_name,
      CASE i
        WHEN 1 THEN 30
        WHEN 2 THEN 60
        WHEN 3 THEN 45
        ELSE 90
      END,
      CASE i
        WHEN 1 THEN 50.00
        WHEN 2 THEN 85.00
        WHEN 3 THEN 65.00
        ELSE 120.00
      END,
      CASE i % 4
        WHEN 1 THEN '#3B82F6'
        WHEN 2 THEN '#10B981'
        WHEN 3 THEN '#F59E0B'
        ELSE '#8B5CF6'
      END,
      true
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Create sample bookings for active statuses
  IF p_status IN ('active_trial', 'paid_subscriber', 'cancelled_but_active') THEN
    -- Get first service type for bookings
    SELECT id INTO v_service_id
    FROM public.service_types
    WHERE calendar_id = v_calendar_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Create sample bookings
    FOR i IN 1..LEAST(5, v_service_count * 2) LOOP
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
        v_customer_names[1 + (i % array_length(v_customer_names, 1))],
        v_customer_emails[1 + (i % array_length(v_customer_emails, 1))],
        v_customer_phones[1 + (i % array_length(v_customer_phones, 1))],
        v_start_time,
        v_end_time,
        CASE i % 4
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
  END IF;

  -- Update calendar settings
  UPDATE public.calendar_settings
  SET
    slot_duration = CASE 
      WHEN v_is_professional THEN 60
      ELSE 30
    END,
    minimum_notice_hours = CASE 
      WHEN v_is_professional THEN 48
      ELSE 24
    END,
    booking_window_days = CASE
      WHEN v_is_professional THEN 90
      ELSE 60
    END,
    max_bookings_per_day = CASE
      WHEN v_is_professional THEN 8
      ELSE 12
    END,
    confirmation_required = v_is_professional,
    allow_waitlist = v_is_professional,
    buffer_time = CASE
      WHEN v_is_professional THEN 15
      ELSE 0
    END
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
      CASE WHEN v_is_professional THEN 60 ELSE 30 END,
      CASE WHEN v_is_professional THEN 48 ELSE 24 END,
      CASE WHEN v_is_professional THEN 90 ELSE 60 END,
      CASE WHEN v_is_professional THEN 8 ELSE 12 END,
      v_is_professional,
      v_is_professional,
      CASE WHEN v_is_professional THEN 15 ELSE 0 END
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'calendar_id', v_calendar_id,
    'business_name', v_business_name,
    'service_count', v_service_count,
    'message', 'Mock data generated successfully for status: ' || p_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'details', 'Error in admin_generate_mock_data for status: ' || p_status
    );
END;
$function$;