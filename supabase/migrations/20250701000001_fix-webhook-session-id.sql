
-- Update de webhook trigger functie om session_id via telefoonnummer op te zoeken
-- en alle booking kolommen mee te sturen
CREATE OR REPLACE FUNCTION public.handle_booking_webhook_trigger()
RETURNS TRIGGER AS $$
DECLARE
  event_type_name text;
  webhook_payload jsonb;
  calendar_slug text;
  session_id_var text;
  service_type_data jsonb;
BEGIN
  -- Bepaal event type gebaseerd op trigger operatie
  IF TG_OP = 'INSERT' THEN
    event_type_name := 'booking.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'confirmed' THEN event_type_name := 'booking.confirmed';
        WHEN 'cancelled' THEN event_type_name := 'booking.cancelled';
        WHEN 'completed' THEN event_type_name := 'booking.completed';
        ELSE event_type_name := 'booking.updated';
      END CASE;
    ELSE
      event_type_name := 'booking.updated';
    END IF;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Haal calendar slug op voor webhook URL
  SELECT c.slug INTO calendar_slug
  FROM public.calendars c
  WHERE c.id = COALESCE(NEW.calendar_id, OLD.calendar_id);

  -- Probeer session_id op te halen via booking_intents → whatsapp_conversations relatie
  SELECT wc.session_id INTO session_id_var
  FROM public.booking_intents bi
  JOIN public.whatsapp_conversations wc ON bi.conversation_id = wc.id
  WHERE bi.booking_id = COALESCE(NEW.id, OLD.id)
  LIMIT 1;

  -- Als session_id nog steeds null is en er is een telefoonnummer, zoek dan direct
  IF session_id_var IS NULL AND COALESCE(NEW.customer_phone, OLD.customer_phone) IS NOT NULL THEN
    SELECT wc.session_id INTO session_id_var
    FROM public.whatsapp_contacts wco
    JOIN public.whatsapp_conversations wc ON wco.id = wc.contact_id
    WHERE wco.phone_number = COALESCE(NEW.customer_phone, OLD.customer_phone)
      AND wc.calendar_id = COALESCE(NEW.calendar_id, OLD.calendar_id)
    ORDER BY wc.created_at DESC
    LIMIT 1;
  END IF;

  -- Haal service type informatie op
  SELECT jsonb_build_object(
    'service_type_id', st.id,
    'service_type_name', st.name,
    'service_type_description', st.description,
    'service_type_duration', st.duration,
    'service_type_price', st.price,
    'service_type_color', st.color,
    'service_type_preparation_time', st.preparation_time,
    'service_type_cleanup_time', st.cleanup_time,
    'service_type_max_attendees', st.max_attendees
  ) INTO service_type_data
  FROM public.service_types st
  WHERE st.id = COALESCE(NEW.service_type_id, OLD.service_type_id);

  -- Maak complete webhook payload met ALLE booking kolommen
  SELECT jsonb_build_object(
    'event_type', event_type_name,
    'booking_id', COALESCE(NEW.id, OLD.id),
    'calendar_id', COALESCE(NEW.calendar_id, OLD.calendar_id),
    'calendar_slug', calendar_slug,
    'service_type_id', COALESCE(NEW.service_type_id, OLD.service_type_id),
    'customer_name', COALESCE(NEW.customer_name, OLD.customer_name),
    'customer_email', COALESCE(NEW.customer_email, OLD.customer_email),
    'customer_phone', COALESCE(NEW.customer_phone, OLD.customer_phone),
    'service_name', COALESCE(NEW.service_name, OLD.service_name),
    'start_time', COALESCE(NEW.start_time, OLD.start_time),
    'end_time', COALESCE(NEW.end_time, OLD.end_time),
    'status', COALESCE(NEW.status, OLD.status),
    'notes', COALESCE(NEW.notes, OLD.notes),
    'internal_notes', COALESCE(NEW.internal_notes, OLD.internal_notes),
    'total_price', COALESCE(NEW.total_price, OLD.total_price),
    'confirmation_token', COALESCE(NEW.confirmation_token, OLD.confirmation_token),
    'confirmed_at', COALESCE(NEW.confirmed_at, OLD.confirmed_at),
    'cancelled_at', COALESCE(NEW.cancelled_at, OLD.cancelled_at),
    'cancellation_reason', COALESCE(NEW.cancellation_reason, OLD.cancellation_reason),
    'booking_duration', COALESCE(NEW.booking_duration, OLD.booking_duration),
    'business_name', COALESCE(NEW.business_name, OLD.business_name),
    'calender_name', COALESCE(NEW.calender_name, OLD.calender_name),
    'session_id', session_id_var,
    'service_type_data', service_type_data,
    'timestamp', NOW(),
    'trigger_source', 'database_trigger',
    'created_at', COALESCE(NEW.created_at, OLD.created_at),
    'updated_at', COALESCE(NEW.updated_at, OLD.updated_at)
  ) INTO webhook_payload;

  -- Insert webhook event
  INSERT INTO public.webhook_events (calendar_id, event_type, payload, status)
  VALUES (
    COALESCE(NEW.calendar_id, OLD.calendar_id),
    event_type_name,
    webhook_payload,
    'pending'
  );

  -- Trigger automatische verwerking via pg_notify
  PERFORM pg_notify(
    'process_webhooks', 
    json_build_object(
      'calendar_id', COALESCE(NEW.calendar_id, OLD.calendar_id),
      'event_type', event_type_name,
      'booking_id', COALESCE(NEW.id, OLD.id),
      'session_id', session_id_var,
      'phone_lookup_used', CASE WHEN session_id_var IS NOT NULL THEN 'true' ELSE 'false' END,
      'trigger_time', extract(epoch from now())
    )::text
  );

  -- Enhanced log voor debugging
  RAISE NOTICE 'Webhook triggered for booking % with event type %, session_id: %, phone: %', 
    COALESCE(NEW.id, OLD.id), event_type_name, session_id_var, COALESCE(NEW.customer_phone, OLD.customer_phone);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verbeterde functie om bestaande bookings te koppelen aan WhatsApp conversations
CREATE OR REPLACE FUNCTION public.link_existing_bookings_to_whatsapp()
RETURNS jsonb AS $$
DECLARE
  booking_record record;
  v_contact_id uuid;
  v_conversation_id uuid;
  v_updated_count integer := 0;
  v_created_intents integer := 0;
BEGIN
  -- Loop door alle bookings met telefoonnummer
  FOR booking_record IN 
    SELECT DISTINCT b.id, b.calendar_id, b.customer_phone, b.customer_name, b.service_type_id
    FROM public.bookings b
    WHERE b.customer_phone IS NOT NULL 
      AND b.calendar_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.booking_intents bi WHERE bi.booking_id = b.id
      )
  LOOP
    -- Zoek contact
    SELECT id INTO v_contact_id
    FROM public.whatsapp_contacts
    WHERE phone_number = booking_record.customer_phone;
    
    -- Maak contact aan als het niet bestaat
    IF v_contact_id IS NULL THEN
      INSERT INTO public.whatsapp_contacts (phone_number, display_name)
      VALUES (booking_record.customer_phone, booking_record.customer_name)
      RETURNING id INTO v_contact_id;
    END IF;
    
    -- Zoek of maak conversation
    SELECT id INTO v_conversation_id
    FROM public.whatsapp_conversations
    WHERE contact_id = v_contact_id AND calendar_id = booking_record.calendar_id;
    
    IF v_conversation_id IS NULL THEN
      INSERT INTO public.whatsapp_conversations (contact_id, calendar_id, status)
      VALUES (v_contact_id, booking_record.calendar_id, 'active')
      RETURNING id INTO v_conversation_id;
    ELSE
      -- Update bestaande conversation met calendar_id als die null was
      UPDATE public.whatsapp_conversations 
      SET calendar_id = booking_record.calendar_id
      WHERE id = v_conversation_id AND calendar_id IS NULL;
    END IF;
    
    -- Maak booking_intent aan
    INSERT INTO public.booking_intents (
      conversation_id, 
      service_type_id, 
      status, 
      booking_id,
      collected_data
    ) VALUES (
      v_conversation_id,
      booking_record.service_type_id,
      'booked',
      booking_record.id,
      jsonb_build_object(
        'customer_name', booking_record.customer_name,
        'linked_retroactively', true
      )
    );
    
    v_created_intents := v_created_intents + 1;
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_bookings', v_updated_count,
    'created_intents', v_created_intents,
    'message', 'Successfully linked existing bookings to WhatsApp conversations'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om alle booking data opnieuw te versturen met correcte session_ids
CREATE OR REPLACE FUNCTION public.resend_all_booking_webhooks(p_calendar_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_processed_count integer := 0;
  booking_record record;
BEGIN
  -- Loop door alle bookings voor deze calendar
  FOR booking_record IN 
    SELECT * FROM public.bookings 
    WHERE calendar_id = p_calendar_id
    ORDER BY created_at DESC
  LOOP
    -- Trigger webhook opnieuw via de trigger functie
    -- Dit zorgt ervoor dat alle nieuwe session_id lookups worden gebruikt
    UPDATE public.bookings 
    SET updated_at = NOW()
    WHERE id = booking_record.id;
    
    v_processed_count := v_processed_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed_bookings', v_processed_count,
    'message', 'All booking webhooks have been regenerated with updated session_ids'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
