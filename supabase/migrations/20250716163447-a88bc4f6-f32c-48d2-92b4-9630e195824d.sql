-- Create admin_clear_user_data function to clear all user data for fresh start
CREATE OR REPLACE FUNCTION public.admin_clear_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Clear all user-related data
  DELETE FROM public.bookings 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.availability_overrides 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.availability_rules 
  WHERE schedule_id IN (
    SELECT id FROM public.availability_schedules 
    WHERE calendar_id IN (
      SELECT id FROM public.calendars WHERE user_id = p_user_id
    )
  );
  
  DELETE FROM public.availability_schedules 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.service_types 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.calendar_settings 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.whatsapp_conversations 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.calendars WHERE user_id = p_user_id;
  
  -- Clear user business data
  UPDATE public.users 
  SET 
    business_name = NULL,
    business_type = NULL,
    business_phone = NULL,
    business_email = NULL,
    business_whatsapp = NULL,
    business_street = NULL,
    business_number = NULL,
    business_postal = NULL,
    business_city = NULL,
    business_country = NULL,
    business_description = NULL,
    parking_info = NULL,
    public_transport_info = NULL,
    accessibility_info = NULL,
    other_info = NULL,
    opening_hours_note = NULL,
    business_type_other = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User data cleared successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to clear user data: ' || SQLERRM
    );
END;
$$;

-- Create admin_generate_mock_data function to generate appropriate mock data per status
CREATE OR REPLACE FUNCTION public.admin_generate_mock_data(p_user_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_calendar_id uuid;
  v_schedule_id uuid;
  v_service_id uuid;
  v_business_name text;
  v_business_type text;
  v_calendar_name text;
  v_service_count integer;
  v_is_professional boolean;
BEGIN
  -- Determine mock data characteristics based on status
  CASE p_status
    WHEN 'active_trial', 'expired_trial' THEN
      v_business_name := 'Demo Business';
      v_business_type := 'salon';
      v_calendar_name := 'Demo Salon';
      v_service_count := 3;
      v_is_professional := false;
    WHEN 'paid_subscriber', 'canceled_but_active', 'canceled_and_inactive' THEN
      v_business_name := 'Professional Business';
      v_business_type := 'clinic';
      v_calendar_name := 'Professional Clinic';
      v_service_count := 5;
      v_is_professional := true;
    ELSE
      -- Skip mock data generation for setup_incomplete
      RETURN jsonb_build_object(
        'success', true,
        'message', 'No mock data generated for ' || p_status
      );
  END CASE;
  
  -- Update user with comprehensive business information
  UPDATE public.users 
  SET 
    business_phone = CASE 
      WHEN v_is_professional THEN '+31 20 123 4567'
      ELSE '+31 6 12345678'
    END,
    business_email = CASE 
      WHEN v_is_professional THEN 'info@professionalbusiness.nl'
      ELSE 'demo@demobusiness.nl'
    END,
    business_whatsapp = CASE 
      WHEN v_is_professional THEN '+31 20 123 4567'
      ELSE '+31 6 12345678'
    END,
    business_street = CASE 
      WHEN v_is_professional THEN 'Hoofdstraat'
      ELSE 'Kerkstraat'
    END,
    business_number = CASE 
      WHEN v_is_professional THEN '123'
      ELSE '45'
    END,
    business_postal = CASE 
      WHEN v_is_professional THEN '1000 AB'
      ELSE '1234 CD'
    END,
    business_city = CASE 
      WHEN v_is_professional THEN 'Amsterdam'
      ELSE 'Utrecht'
    END,
    business_country = 'Nederland',
    business_description = CASE 
      WHEN v_is_professional THEN 'Professionele zorgverlening met jarenlange ervaring'
      ELSE 'Uw vertrouwde salon voor alle behandelingen'
    END,
    parking_info = 'Gratis parkeren voor de deur',
    public_transport_info = 'Bushalte op 2 minuten loopafstand',
    accessibility_info = 'Toegankelijk voor rolstoelgebruikers',
    other_info = 'Contactloos betalen mogelijk',
    opening_hours_note = 'Geopend van maandag tot zaterdag',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Create main calendar
  INSERT INTO public.calendars (user_id, name, slug, description, color, timezone, is_active, is_default)
  VALUES (
    p_user_id, 
    v_calendar_name, 
    'cal-' || substr(p_user_id::text, 1, 8),
    CASE 
      WHEN v_is_professional THEN 'Professionele afsprakenkalender'
      ELSE 'Demo afsprakenkalender'
    END,
    CASE 
      WHEN v_is_professional THEN '#059669'
      ELSE '#3B82F6'
    END,
    'Europe/Amsterdam',
    true,
    true
  )
  RETURNING id INTO v_calendar_id;
  
  -- Create availability schedule
  INSERT INTO public.availability_schedules (calendar_id, name, is_default)
  VALUES (v_calendar_id, 'Standaard Schema', true)
  RETURNING id INTO v_schedule_id;
  
  -- Create availability rules (Monday to Friday 9-17, Saturday 9-15)
  INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
  VALUES 
    (v_schedule_id, 1, '09:00', '17:00', true), -- Monday
    (v_schedule_id, 2, '09:00', '17:00', true), -- Tuesday
    (v_schedule_id, 3, '09:00', '17:00', true), -- Wednesday
    (v_schedule_id, 4, '09:00', '17:00', true), -- Thursday
    (v_schedule_id, 5, '09:00', '17:00', true), -- Friday
    (v_schedule_id, 6, '09:00', '15:00', true), -- Saturday
    (v_schedule_id, 0, '00:00', '00:00', false); -- Sunday (closed)
  
  -- Create service types based on business type
  IF v_business_type = 'salon' THEN
    INSERT INTO public.service_types (calendar_id, name, duration, price, description, color, is_active)
    VALUES 
      (v_calendar_id, 'Knipbeurt', 45, 35.00, 'Professionele knipbeurt', '#3B82F6', true),
      (v_calendar_id, 'Kleuren', 90, 75.00, 'Haarkleuring', '#10B981', true),
      (v_calendar_id, 'Styling', 30, 25.00, 'Haarstyling', '#F59E0B', true);
    
    IF v_is_professional THEN
      INSERT INTO public.service_types (calendar_id, name, duration, price, description, color, is_active)
      VALUES 
        (v_calendar_id, 'Bruidsstyling', 120, 150.00, 'Complete bruidsstyling', '#EC4899', true),
        (v_calendar_id, 'Highlights', 75, 65.00, 'Professionele highlights', '#8B5CF6', true);
    END IF;
  ELSIF v_business_type = 'clinic' THEN
    INSERT INTO public.service_types (calendar_id, name, duration, price, description, color, is_active)
    VALUES 
      (v_calendar_id, 'Intake Consult', 60, 125.00, 'Uitgebreide intake', '#3B82F6', true),
      (v_calendar_id, 'Behandeling', 45, 85.00, 'Standaard behandeling', '#10B981', true),
      (v_calendar_id, 'Controle', 30, 65.00, 'Controle afspraak', '#F59E0B', true);
    
    IF v_is_professional THEN
      INSERT INTO public.service_types (calendar_id, name, duration, price, description, color, is_active)
      VALUES 
        (v_calendar_id, 'Specialistische Behandeling', 90, 175.00, 'Gespecialiseerde behandeling', '#EC4899', true),
        (v_calendar_id, 'Nazorg', 30, 45.00, 'Nazorg behandeling', '#8B5CF6', true);
    END IF;
  END IF;
  
  -- Create calendar settings
  INSERT INTO public.calendar_settings (
    calendar_id, 
    slot_duration, 
    minimum_notice_hours, 
    booking_window_days, 
    max_bookings_per_day,
    buffer_time,
    confirmation_required,
    allow_waitlist,
    whatsapp_bot_active
  )
  VALUES (
    v_calendar_id, 
    CASE WHEN v_is_professional THEN 30 ELSE 45 END,
    CASE WHEN v_is_professional THEN 48 ELSE 24 END,
    CASE WHEN v_is_professional THEN 90 ELSE 60 END,
    CASE WHEN v_is_professional THEN 12 ELSE 8 END,
    CASE WHEN v_is_professional THEN 15 ELSE 10 END,
    v_is_professional,
    true,
    false
  );
  
  -- Generate sample bookings for active statuses (not for setup_incomplete)
  IF p_status IN ('active_trial', 'paid_subscriber', 'canceled_but_active') THEN
    -- Get first service type for bookings
    SELECT id INTO v_service_id 
    FROM public.service_types 
    WHERE calendar_id = v_calendar_id 
    ORDER BY created_at 
    LIMIT 1;
    
    -- Create some sample bookings
    INSERT INTO public.bookings (
      calendar_id, 
      service_type_id, 
      customer_name, 
      customer_email, 
      customer_phone,
      start_time, 
      end_time, 
      status,
      notes,
      service_name,
      business_name,
      calender_name
    )
    VALUES 
      (
        v_calendar_id, v_service_id, 'Jan Jansen', 'jan@email.com', '+31 6 12345678',
        NOW() + interval '2 days' + time '10:00', 
        NOW() + interval '2 days' + time '10:45',
        'confirmed', 'Eerste afspraak', 
        CASE WHEN v_business_type = 'salon' THEN 'Knipbeurt' ELSE 'Intake Consult' END,
        v_business_name, v_calendar_name
      ),
      (
        v_calendar_id, v_service_id, 'Marie Smit', 'marie@email.com', '+31 6 87654321',
        NOW() + interval '3 days' + time '14:00', 
        NOW() + interval '3 days' + time '14:45',
        'confirmed', 'Reguliere klant',
        CASE WHEN v_business_type = 'salon' THEN 'Knipbeurt' ELSE 'Intake Consult' END,
        v_business_name, v_calendar_name
      );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Mock data generated successfully',
    'calendar_id', v_calendar_id,
    'services_created', v_service_count,
    'business_type', v_business_type,
    'is_professional', v_is_professional
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to generate mock data: ' || SQLERRM
    );
END;
$$;