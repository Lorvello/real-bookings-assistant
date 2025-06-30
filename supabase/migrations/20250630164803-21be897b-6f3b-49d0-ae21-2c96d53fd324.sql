
-- Stap 1: Cleanup van dubbele/conflicterende webhook triggers
DROP TRIGGER IF EXISTS booking_webhook_trigger ON public.bookings;
DROP TRIGGER IF EXISTS trigger_booking_webhook ON public.bookings;

-- Stap 2: Verbeterde webhook trigger functie met automatische Edge Function triggering
CREATE OR REPLACE FUNCTION public.handle_booking_webhook_trigger()
RETURNS TRIGGER AS $$
DECLARE
  event_type_name text;
  webhook_payload jsonb;
  calendar_slug text;
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

  -- Maak verbeterde webhook payload
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
      'trigger_time', extract(epoch from now())
    )::text
  );

  -- Log voor debugging
  RAISE NOTICE 'Webhook triggered for booking % with event type %', 
    COALESCE(NEW.id, OLD.id), event_type_name;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hermaak de trigger
CREATE TRIGGER booking_webhook_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_webhook_trigger();

-- Functie om webhooks handmatig te verwerken (voor testing)
CREATE OR REPLACE FUNCTION public.manual_process_webhooks(p_calendar_id uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  result_count integer := 0;
BEGIN
  -- Tel pending webhook events
  SELECT COUNT(*) INTO result_count
  FROM public.webhook_events
  WHERE status = 'pending'
    AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id);
  
  -- Trigger processing via notify
  PERFORM pg_notify('process_webhooks', 
    json_build_object(
      'source', 'manual_trigger',
      'calendar_id', p_calendar_id,
      'pending_count', result_count,
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN json_build_object(
    'success', true,
    'pending_webhooks', result_count,
    'message', 'Processing triggered'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test functie om webhook system te verifiëren
CREATE OR REPLACE FUNCTION public.test_webhook_system(p_calendar_id uuid)
RETURNS jsonb AS $$
DECLARE
  test_webhook_id uuid;
  endpoint_count integer;
  result jsonb;
BEGIN
  -- Check actieve webhook endpoints
  SELECT COUNT(*) INTO endpoint_count
  FROM public.webhook_endpoints
  WHERE calendar_id = p_calendar_id AND is_active = true;
  
  -- Maak test webhook event
  INSERT INTO public.webhook_events (calendar_id, event_type, payload, status)
  VALUES (
    p_calendar_id,
    'webhook.test',
    jsonb_build_object(
      'test', true,
      'timestamp', NOW(),
      'message', 'Test webhook event'
    ),
    'pending'
  ) RETURNING id INTO test_webhook_id;
  
  -- Trigger processing
  PERFORM pg_notify('process_webhooks', 
    json_build_object(
      'source', 'test_webhook',
      'calendar_id', p_calendar_id,
      'test_webhook_id', test_webhook_id
    )::text
  );
  
  RETURN json_build_object(
    'success', true,
    'test_webhook_id', test_webhook_id,
    'active_endpoints', endpoint_count,
    'message', 'Test webhook created and processing triggered'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
