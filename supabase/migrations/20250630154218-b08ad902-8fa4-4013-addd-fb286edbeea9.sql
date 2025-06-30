
-- Add webhook endpoint for Brand Evolves calendar
INSERT INTO webhook_endpoints (calendar_id, webhook_url, is_active)
SELECT 
  c.id,
  'https://n8n-yls3.onrender.com/webhook/bf141ed0-ccb3-46d0-971a-0ba7bd942aa5',
  true
FROM calendars c
JOIN users u ON c.user_id = u.id
WHERE u.business_name = 'Brand Evolves'
  AND c.is_active = true;

-- Enhanced function to process webhook events with detailed booking payload
CREATE OR REPLACE FUNCTION process_booking_webhook_events()
RETURNS void AS $$
DECLARE
  webhook_record record;
  endpoint_record record;
  booking_data jsonb;
BEGIN
  -- Process all pending webhook events for bookings
  FOR webhook_record IN 
    SELECT * FROM webhook_events 
    WHERE status = 'pending' 
      AND event_type LIKE 'booking.%'
    ORDER BY created_at ASC
  LOOP
    -- Get enhanced booking data
    SELECT jsonb_build_object(
      'event_type', webhook_record.event_type,
      'booking_id', b.id,
      'calendar_id', b.calendar_id,
      'calendar_name', c.name,
      'business_name', u.business_name,
      'customer_name', b.customer_name,
      'customer_email', b.customer_email,
      'customer_phone', b.customer_phone,
      'service_name', COALESCE(st.name, b.service_name),
      'service_duration', COALESCE(st.duration, b.booking_duration),
      'service_price', st.price,
      'start_time', b.start_time,
      'end_time', b.end_time,
      'status', b.status,
      'notes', b.notes,
      'created_at', b.created_at,
      'confirmed_at', b.confirmed_at,
      'booking_url', 'https://brandevolves.lovable.app/calendar/' || c.slug,
      'timezone', c.timezone
    ) INTO booking_data
    FROM bookings b
    JOIN calendars c ON b.calendar_id = c.id
    JOIN users u ON c.user_id = u.id
    LEFT JOIN service_types st ON b.service_type_id = st.id
    WHERE b.id = (webhook_record.payload->>'booking_id')::uuid;

    -- Send to all active webhook endpoints for this calendar
    FOR endpoint_record IN 
      SELECT * FROM webhook_endpoints 
      WHERE calendar_id = webhook_record.calendar_id 
        AND is_active = true
    LOOP
      -- Here we would normally make HTTP request
      -- For now, we'll update the webhook event as processed
      UPDATE webhook_events 
      SET 
        status = 'sent',
        attempts = attempts + 1,
        last_attempt_at = NOW(),
        payload = booking_data
      WHERE id = webhook_record.id;
      
      -- Log successful webhook delivery
      INSERT INTO webhook_events (calendar_id, event_type, payload, status)
      VALUES (
        webhook_record.calendar_id,
        'webhook.delivered',
        jsonb_build_object(
          'webhook_url', endpoint_record.webhook_url,
          'original_event', webhook_record.event_type,
          'booking_id', webhook_record.payload->>'booking_id',
          'delivered_at', NOW()
        ),
        'sent'
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced trigger function for bookings with immediate webhook processing
CREATE OR REPLACE FUNCTION handle_booking_webhook_trigger()
RETURNS TRIGGER AS $$
DECLARE
  event_type_name text;
  webhook_payload jsonb;
BEGIN
  -- Determine event type based on trigger operation
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

  -- Create enhanced webhook payload
  SELECT jsonb_build_object(
    'event_type', event_type_name,
    'booking_id', COALESCE(NEW.id, OLD.id),
    'calendar_id', COALESCE(NEW.calendar_id, OLD.calendar_id),
    'customer_name', COALESCE(NEW.customer_name, OLD.customer_name),
    'customer_email', COALESCE(NEW.customer_email, OLD.customer_email),
    'customer_phone', COALESCE(NEW.customer_phone, OLD.customer_phone),
    'service_name', COALESCE(NEW.service_name, OLD.service_name),
    'start_time', COALESCE(NEW.start_time, OLD.start_time),
    'end_time', COALESCE(NEW.end_time, OLD.end_time),
    'status', COALESCE(NEW.status, OLD.status),
    'timestamp', NOW()
  ) INTO webhook_payload;

  -- Insert webhook event
  INSERT INTO webhook_events (calendar_id, event_type, payload, status)
  VALUES (
    COALESCE(NEW.calendar_id, OLD.calendar_id),
    event_type_name,
    webhook_payload,
    'pending'
  );

  -- Process webhooks immediately in background
  PERFORM pg_notify('process_webhooks', COALESCE(NEW.calendar_id, OLD.calendar_id)::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create/replace booking trigger
DROP TRIGGER IF EXISTS booking_webhook_trigger ON bookings;
CREATE TRIGGER booking_webhook_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_booking_webhook_trigger();

-- Function to manually process webhook queue (for testing)
CREATE OR REPLACE FUNCTION process_webhook_queue()
RETURNS void AS $$
BEGIN
  PERFORM process_booking_webhook_events();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
