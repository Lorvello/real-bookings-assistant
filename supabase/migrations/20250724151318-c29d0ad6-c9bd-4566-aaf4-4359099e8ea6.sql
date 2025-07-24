-- =====================================================
-- CRITICAL SECURITY FIXES - Phase 1: Database Security  
-- =====================================================

-- 1. Add RLS policies for tables that have RLS enabled but no policies

-- RLS policies for quick_reply_flows table
CREATE POLICY "Users can manage quick reply flows for their calendars"
ON public.quick_reply_flows
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = quick_reply_flows.calendar_id 
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = quick_reply_flows.calendar_id 
    AND c.user_id = auth.uid()
  )
);

-- RLS policies for recurring_availability table  
CREATE POLICY "Users can manage recurring availability for their calendars"
ON public.recurring_availability
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = recurring_availability.calendar_id 
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = recurring_availability.calendar_id 
    AND c.user_id = auth.uid()
  )
);

-- RLS policies for waitlist table
CREATE POLICY "Users can manage waitlist for their calendars"
ON public.waitlist
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = waitlist.calendar_id 
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = waitlist.calendar_id 
    AND c.user_id = auth.uid()
  )
);

-- Public read access for waitlist (business booking page needs this)
CREATE POLICY "Public can read waitlist for active calendars"
ON public.waitlist
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = waitlist.calendar_id 
    AND c.is_active = true
  )
);

-- 2. Enable RLS on n8n_chat_histories and add policies
ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Note: n8n_chat_histories needs system-level access for n8n integration
-- Adding permissive policy for system operations
CREATE POLICY "System can manage n8n chat histories"
ON public.n8n_chat_histories
FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Fix all database functions by adding SET search_path TO ''
-- This prevents search path injection attacks

-- Functions that need search_path fix (based on linter output):
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