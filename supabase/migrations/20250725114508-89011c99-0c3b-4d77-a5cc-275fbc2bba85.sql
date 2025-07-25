-- Fix database functions missing SET search_path TO '' for security
-- This prevents function hijacking attacks

CREATE OR REPLACE FUNCTION public.admin_generate_comprehensive_mock_data(p_calendar_id uuid, p_data_type text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb := '{}';
  v_contact_id uuid;
  v_conversation_id uuid;
  v_intent_id uuid;
  i integer;
  j integer;
  v_phone_numbers text[] := ARRAY['+31612345678', '+31623456789', '+31634567890', '+31645678901', '+31656789012', '+31667890123', '+31678901234', '+31689012345'];
  v_names text[] := ARRAY['Emma van der Berg', 'Lars Janssen', 'Sophie de Vries', 'Daan Peters', 'Lisa van Dijk', 'Max Bakker', 'Nina Visser', 'Tom de Jong'];
  v_service_type_id uuid;
  v_start_time timestamp with time zone;
  v_booking_id uuid;
BEGIN
  -- Get first service type for bookings
  SELECT id INTO v_service_type_id 
  FROM public.service_types 
  WHERE calendar_id = p_calendar_id 
  LIMIT 1;

  -- Generate WhatsApp contacts and conversations
  IF p_data_type IN ('all', 'whatsapp') THEN
    FOR i IN 1..8 LOOP
      -- Create contact
      INSERT INTO public.whatsapp_contacts (
        phone_number, 
        display_name, 
        first_name, 
        last_name,
        linked_customer_email,
        last_seen_at
      ) VALUES (
        v_phone_numbers[i],
        v_names[i],
        split_part(v_names[i], ' ', 1),
        split_part(v_names[i], ' ', -1),
        lower(replace(v_names[i], ' ', '.')) || '@email.com',
        NOW() - (random() * interval '24 hours')
      ) 
      ON CONFLICT (phone_number) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        last_seen_at = EXCLUDED.last_seen_at
      RETURNING id INTO v_contact_id;

      -- Create conversation
      INSERT INTO public.whatsapp_conversations (
        calendar_id,
        contact_id,
        status,
        last_message_at
      ) VALUES (
        p_calendar_id,
        v_contact_id,
        CASE WHEN i <= 5 THEN 'active' ELSE 'closed' END,
        NOW() - (random() * interval '12 hours')
      )
      ON CONFLICT (calendar_id, contact_id) DO UPDATE SET
        last_message_at = EXCLUDED.last_message_at
      RETURNING id INTO v_conversation_id;

      -- Create messages for each conversation
      FOR j IN 1..(2 + floor(random() * 6)::int) LOOP
        INSERT INTO public.whatsapp_messages (
          conversation_id,
          direction,
          message_type,
          content,
          status,
          created_at
        ) VALUES (
          v_conversation_id,
          CASE WHEN j % 2 = 1 THEN 'inbound' ELSE 'outbound' END,
          'text',
          CASE 
            WHEN j = 1 THEN 'Hallo, ik wil graag een afspraak maken'
            WHEN j = 2 THEN 'Natuurlijk! Voor welke service heeft u interesse?'
            WHEN j % 2 = 1 THEN 'Dat klinkt goed, wanneer kan ik terecht?'
            ELSE 'Ik ga kijken naar beschikbare tijden voor u'
          END,
          'delivered',
          NOW() - (random() * interval '6 hours') - (j * interval '5 minutes')
        );
      END LOOP;

      -- Create booking intent for some conversations
      IF i <= 4 THEN
        INSERT INTO public.booking_intents (
          conversation_id,
          service_type_id,
          status,
          preferred_date,
          preferred_time_slot,
          collected_data
        ) VALUES (
          v_conversation_id,
          v_service_type_id,
          CASE 
            WHEN i <= 2 THEN 'ready_to_book'
            WHEN i = 3 THEN 'booked'
            ELSE 'collecting_info'
          END,
          CURRENT_DATE + (i || ' days')::interval,
          CASE WHEN i % 2 = 0 THEN 'morning' ELSE 'afternoon' END,
          jsonb_build_object('customer_name', v_names[i], 'customer_phone', v_phone_numbers[i])
        );
      END IF;
    END LOOP;
  END IF;

  -- Generate historical bookings for performance analysis
  IF p_data_type IN ('all', 'bookings', 'performance') THEN
    FOR i IN 1..25 LOOP
      v_start_time := NOW() - (random() * interval '60 days') + (random() * interval '14 hours' + interval '8 hours');
      
      INSERT INTO public.bookings (
        calendar_id,
        service_type_id,
        customer_name,
        customer_email,
        customer_phone,
        start_time,
        end_time,
        status,
        total_price,
        confirmed_at,
        cancelled_at
      ) VALUES (
        p_calendar_id,
        v_service_type_id,
        v_names[(i % 8) + 1],
        lower(replace(v_names[(i % 8) + 1], ' ', '.')) || '@email.com',
        v_phone_numbers[(i % 8) + 1],
        v_start_time,
        v_start_time + interval '60 minutes',
        CASE 
          WHEN random() < 0.85 THEN 'confirmed'
          WHEN random() < 0.95 THEN 'cancelled'
          ELSE 'no-show'
        END,
        45 + (random() * 50)::numeric(10,2),
        CASE WHEN random() < 0.9 THEN v_start_time - interval '2 hours' ELSE NULL END,
        CASE WHEN random() < 0.1 THEN v_start_time - interval '1 hour' ELSE NULL END
      );
    END LOOP;
  END IF;

  -- Generate waitlist entries
  IF p_data_type IN ('all', 'waitlist') THEN
    FOR i IN 1..8 LOOP
      INSERT INTO public.waitlist (
        calendar_id,
        service_type_id,
        customer_name,
        customer_email,
        preferred_date,
        flexibility,
        status
      ) VALUES (
        p_calendar_id,
        v_service_type_id,
        v_names[i],
        lower(replace(v_names[i], ' ', '.')) || '@email.com',
        CURRENT_DATE + ((i % 7) + 1 || ' days')::interval,
        CASE i % 3 
          WHEN 0 THEN 'morning'
          WHEN 1 THEN 'afternoon'
          ELSE 'anytime'
        END,
        'waiting'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Mock data generated successfully',
    'data_type', p_data_type,
    'calendar_id', p_calendar_id
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'calendar_id', p_calendar_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_calendar_availability(p_calendar_slug text, p_start_date date DEFAULT CURRENT_DATE, p_days integer DEFAULT 14)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.render_whatsapp_template(p_template_key text, p_calendar_id uuid, p_variables jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_template record;
  v_content text;
  v_key text;
  v_value text;
BEGIN
  -- Haal template op
  SELECT * INTO v_template
  FROM public.whatsapp_templates
  WHERE template_key = p_template_key 
    AND calendar_id = p_calendar_id
    AND is_active = true;
    
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Template not found');
  END IF;
  
  v_content := v_template.content;
  
  -- Replace variables
  FOR v_key IN SELECT jsonb_object_keys(p_variables)
  LOOP
    v_value := p_variables ->> v_key;
    v_content := replace(v_content, '{{' || v_key || '}}', v_value);
  END LOOP;
  
  RETURN jsonb_build_object(
    'content', v_content,
    'quick_replies', v_template.quick_replies
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_quick_reply_flow(p_message text, p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_flow record;
  v_keyword text;
BEGIN
  -- Zoek naar matching flow gebaseerd op keywords
  FOR v_flow IN 
    SELECT * FROM public.quick_reply_flows 
    WHERE calendar_id = p_calendar_id 
      AND is_active = true
  LOOP
    -- Check elk keyword
    IF v_flow.trigger_keywords IS NOT NULL THEN
      FOREACH v_keyword IN ARRAY v_flow.trigger_keywords
      LOOP
        IF LOWER(p_message) LIKE '%' || LOWER(v_keyword) || '%' THEN
          RETURN jsonb_build_object(
            'flow_id', v_flow.id,
            'flow_name', v_flow.flow_name,
            'flow_data', v_flow.flow_data
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_whatsapp_data()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  retention_days integer := 90;
  cutoff_date timestamp with time zone;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::interval;
  
  -- Cleanup old messages
  DELETE FROM public.whatsapp_messages 
  WHERE created_at < cutoff_date;
  
  -- Cleanup old conversation context
  DELETE FROM public.conversation_context 
  WHERE created_at < cutoff_date;
  
  -- Cleanup old webhook queue entries
  DELETE FROM public.whatsapp_webhook_queue 
  WHERE created_at < cutoff_date AND processed = true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_business_hours(p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'day_of_week', ar.day_of_week,
      'start_time', ar.start_time,
      'end_time', ar.end_time,
      'is_available', ar.is_available
    ) ORDER BY ar.day_of_week
  ) INTO v_result
  FROM public.availability_rules ar
  JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
  WHERE sch.calendar_id = p_calendar_id
    AND sch.is_default = true;
    
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.export_whatsapp_data(p_calendar_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
  v_result jsonb;
BEGIN
  -- Stel datumbereik in
  v_start_date := COALESCE(p_start_date::timestamp with time zone, NOW() - interval '30 days');
  v_end_date := COALESCE(p_end_date::timestamp with time zone, NOW());
  
  -- Export conversatie data
  SELECT jsonb_build_object(
    'conversations', jsonb_agg(
      jsonb_build_object(
        'conversation_id', wc.id,
        'contact_phone', wco.phone_number,
        'contact_name', wco.display_name,
        'messages', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'message_id', wm.message_id,
              'direction', wm.direction,
              'content', wm.content,
              'created_at', wm.created_at
            ) ORDER BY wm.created_at
          )
          FROM public.whatsapp_messages wm
          WHERE wm.conversation_id = wc.id
            AND wm.created_at BETWEEN v_start_date AND v_end_date
        )
      )
    )
  ) INTO v_result
  FROM public.whatsapp_conversations wc
  JOIN public.whatsapp_contacts wco ON wco.id = wc.contact_id
  WHERE wc.calendar_id = p_calendar_id
    AND wc.created_at BETWEEN v_start_date AND v_end_date;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_calendar_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Maak automatisch standaard instellingen aan voor de nieuwe kalender
  INSERT INTO public.calendar_settings (calendar_id)
  VALUES (new.id);
  
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_team_member_user(p_email text, p_full_name text, p_calendar_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_new_user_id uuid;
  v_calendar_owner uuid;
BEGIN
  -- Verify that the current user owns the calendar
  SELECT user_id INTO v_calendar_owner
  FROM public.calendars
  WHERE id = p_calendar_id;
  
  IF v_calendar_owner != auth.uid() THEN
    RAISE EXCEPTION 'Only calendar owners can create team members';
  END IF;
  
  -- Check if user already exists
  SELECT id INTO v_new_user_id
  FROM public.users
  WHERE email = p_email;
  
  IF v_new_user_id IS NOT NULL THEN
    RETURN v_new_user_id;
  END IF;
  
  -- Create new user with generated UUID
  v_new_user_id := gen_random_uuid();
  
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    v_new_user_id,
    p_email,
    p_full_name,
    now(),
    now()
  );
  
  RETURN v_new_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_booking_conflicts(p_calendar_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_booking_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.check_whatsapp_contact_limit(p_user_id uuid, p_calendar_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_count integer;
  v_max_contacts integer;
  v_subscription_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get max contacts based on subscription tier
  SELECT max_whatsapp_contacts INTO v_max_contacts
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::subscription_tier;
  
  -- If unlimited (null), return true
  IF v_max_contacts IS NULL THEN
    RETURN true;
  END IF;
  
  -- Count current WhatsApp contacts for this user's calendars
  SELECT COUNT(DISTINCT wc.id) INTO v_current_count
  FROM public.whatsapp_contacts wc
  JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
  JOIN public.calendars cal ON conv.calendar_id = cal.id
  WHERE cal.user_id = p_user_id;
  
  -- Return true if under limit
  RETURN v_current_count < v_max_contacts;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_team_member_limit(p_user_id uuid, p_calendar_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_count integer;
  v_max_members integer;
  v_subscription_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get max team members based on subscription tier
  SELECT max_team_members INTO v_max_members
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::subscription_tier;
  
  -- Count current team members for this calendar (including owner)
  SELECT COUNT(*) + 1 INTO v_current_count -- +1 for owner
  FROM public.calendar_members cm
  WHERE cm.calendar_id = p_calendar_id;
  
  -- Return true if under limit
  RETURN v_current_count < v_max_members;
END;
$function$;