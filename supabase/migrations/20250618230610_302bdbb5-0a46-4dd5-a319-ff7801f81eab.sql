
-- Helper functie voor user registratie met automatische kalender setup
CREATE OR REPLACE FUNCTION public.create_user_with_calendar(
  p_email text,
  p_full_name text,
  p_business_name text DEFAULT NULL,
  p_business_type text DEFAULT NULL
) RETURNS json AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper functie voor complete kalender setup met standaard configuratie
CREATE OR REPLACE FUNCTION public.setup_calendar_defaults(
  p_calendar_id uuid,
  p_business_type text DEFAULT NULL
) RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper functie om beschikbare tijdslots op te halen voor een datum range
CREATE OR REPLACE FUNCTION public.get_calendar_availability(
  p_calendar_slug text,
  p_start_date date DEFAULT CURRENT_DATE,
  p_days integer DEFAULT 14
) RETURNS json AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper functie voor het maken van een booking
CREATE OR REPLACE FUNCTION public.create_booking(
  p_calendar_slug text,
  p_service_type_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_start_time timestamp with time zone,
  p_notes text DEFAULT NULL
) RETURNS json AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
