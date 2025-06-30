
-- Update de webhook trigger functie om session_id toe te voegen
CREATE OR REPLACE FUNCTION public.handle_booking_webhook_trigger()
RETURNS TRIGGER AS $$
DECLARE
  event_type_name text;
  webhook_payload jsonb;
  calendar_slug text;
  session_id_var text;
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

  -- Haal session_id op via booking_intents → whatsapp_conversations relatie
  SELECT wc.session_id INTO session_id_var
  FROM public.booking_intents bi
  JOIN public.whatsapp_conversations wc ON bi.conversation_id = wc.id
  WHERE bi.booking_id = COALESCE(NEW.id, OLD.id)
  LIMIT 1;

  -- Maak verbeterde webhook payload met session_id
  SELECT jsonb_build_object(
    'event_type', event_type_name,
    'booking_id', COALESCE(NEW.id, OLD.id),
    'calendar_id', COALESCE(NEW.calendar_id, OLD.calendar_id),
    'calendar_slug', calendar_slug,
    'customer_name', COALESCE(NEW.customer_name, OLD.customer_name),
    'customer_email', COALESCE(NEW.customer_email, OLD.customer_email),
    'customer_phone', COALESCE(NEW.customer_phone, OLD.customer_phone),
    'service_name', COALESCE(NEW.service_name, OLD.service_name),
    'start_time', COALESCE(NEW.start_time, OLD.start_time),
    'end_time', COALESCE(NEW.end_time, OLD.end_time),
    'status', COALESCE(NEW.status, OLD.status),
    'notes', COALESCE(NEW.notes, OLD.notes),
    'session_id', session_id_var,
    'timestamp', NOW(),
    'trigger_source', 'database_trigger'
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
      'trigger_time', extract(epoch from now())
    )::text
  );

  -- Log voor debugging
  RAISE NOTICE 'Webhook triggered for booking % with event type % and session_id %', 
    COALESCE(NEW.id, OLD.id), event_type_name, session_id_var;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
