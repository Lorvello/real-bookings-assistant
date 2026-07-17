-- R17: preserve the existing booking webhook payload contract while removing
-- customer phone/session values from database notices. This function is a
-- trigger implementation only and must not be directly callable by API roles.

CREATE OR REPLACE FUNCTION public.handle_booking_webhook_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_type_name text;
  webhook_payload jsonb;
  calendar_slug text;
  session_id_var text;
  service_type_data jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type_name := 'booking.created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
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

  SELECT calendar.slug
  INTO calendar_slug
  FROM public.calendars calendar
  WHERE calendar.id = COALESCE(NEW.calendar_id, OLD.calendar_id);

  SELECT conversation.session_id
  INTO session_id_var
  FROM public.booking_intents intent
  JOIN public.whatsapp_conversations conversation
    ON intent.conversation_id = conversation.id
  WHERE intent.booking_id = COALESCE(NEW.id, OLD.id)
  LIMIT 1;

  IF session_id_var IS NULL
     AND COALESCE(NEW.customer_phone, OLD.customer_phone) IS NOT NULL THEN
    SELECT conversation.session_id
    INTO session_id_var
    FROM public.whatsapp_contacts contact
    JOIN public.whatsapp_conversations conversation
      ON contact.id = conversation.contact_id
    WHERE contact.phone_number = COALESCE(
      NEW.customer_phone,
      OLD.customer_phone
    )
      AND conversation.calendar_id = COALESCE(
        NEW.calendar_id,
        OLD.calendar_id
      )
    ORDER BY conversation.created_at DESC
    LIMIT 1;
  END IF;

  SELECT jsonb_build_object(
    'service_type_id', service.id,
    'service_type_name', service.name,
    'service_type_description', service.description,
    'service_type_duration', service.duration,
    'service_type_price', service.price,
    'service_type_color', service.color,
    'service_type_preparation_time', service.preparation_time,
    'service_type_cleanup_time', service.cleanup_time,
    'service_type_max_attendees', service.max_attendees
  )
  INTO service_type_data
  FROM public.service_types service
  WHERE service.id = COALESCE(NEW.service_type_id, OLD.service_type_id);

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
    'confirmation_token', COALESCE(
      NEW.confirmation_token,
      OLD.confirmation_token
    ),
    'confirmed_at', COALESCE(NEW.confirmed_at, OLD.confirmed_at),
    'cancelled_at', COALESCE(NEW.cancelled_at, OLD.cancelled_at),
    'cancellation_reason', COALESCE(
      NEW.cancellation_reason,
      OLD.cancellation_reason
    ),
    'booking_duration', COALESCE(NEW.booking_duration, OLD.booking_duration),
    'business_name', COALESCE(NEW.business_name, OLD.business_name),
    'calender_name', COALESCE(NEW.calender_name, OLD.calender_name),
    'session_id', session_id_var,
    'service_type_data', service_type_data,
    'timestamp', now(),
    'trigger_source', 'database_trigger',
    'created_at', COALESCE(NEW.created_at, OLD.created_at),
    'updated_at', COALESCE(NEW.updated_at, OLD.updated_at)
  )
  INTO webhook_payload;

  INSERT INTO public.webhook_events (
    calendar_id,
    event_type,
    payload,
    status
  )
  VALUES (
    COALESCE(NEW.calendar_id, OLD.calendar_id),
    event_type_name,
    webhook_payload,
    'pending'
  );

  PERFORM pg_notify(
    'process_webhooks',
    json_build_object(
      'calendar_id', COALESCE(NEW.calendar_id, OLD.calendar_id),
      'event_type', event_type_name,
      'booking_id', COALESCE(NEW.id, OLD.id),
      'session_id', session_id_var,
      'phone_lookup_used', CASE
        WHEN session_id_var IS NOT NULL THEN 'true'
        ELSE 'false'
      END,
      'trigger_time', extract(epoch FROM now())
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.handle_booking_webhook_trigger()
  FROM PUBLIC, anon, authenticated, service_role;
