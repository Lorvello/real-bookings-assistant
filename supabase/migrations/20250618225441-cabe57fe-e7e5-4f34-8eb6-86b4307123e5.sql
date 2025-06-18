
-- Create webhook_events table for n8n integration
CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'booking.created', 'booking.confirmed', etc.
  payload jsonb NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer DEFAULT 0,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create webhook_endpoints table to store n8n webhook URLs per calendar
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  webhook_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Trigger function voor booking events
CREATE OR REPLACE FUNCTION public.trigger_booking_webhook()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    NEW.calendar_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'booking.created'
      WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'booking.' || NEW.status
      ELSE 'booking.updated'
    END,
    jsonb_build_object(
      'booking_id', NEW.id,
      'calendar_id', NEW.calendar_id,
      'service_type_id', NEW.service_type_id,
      'customer', jsonb_build_object(
        'name', NEW.customer_name,
        'email', NEW.customer_email,
        'phone', NEW.customer_phone
      ),
      'timing', jsonb_build_object(
        'start', NEW.start_time,
        'end', NEW.end_time
      ),
      'status', NEW.status,
      'notes', NEW.notes,
      'total_price', NEW.total_price,
      'confirmation_token', NEW.confirmation_token
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for booking events
CREATE TRIGGER booking_webhook_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_booking_webhook();

-- Enable RLS on webhook tables
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_events
CREATE POLICY "Users can view own calendar webhook events" ON public.webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = webhook_events.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert webhook events for own calendars" ON public.webhook_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = webhook_events.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own calendar webhook events" ON public.webhook_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = webhook_events.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- RLS policies for webhook_endpoints
CREATE POLICY "Users can view own calendar webhook endpoints" ON public.webhook_endpoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = webhook_endpoints.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own calendar webhook endpoints" ON public.webhook_endpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = webhook_endpoints.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Add updated_at trigger for webhook_endpoints
CREATE TRIGGER on_webhook_endpoint_updated
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for better performance
CREATE INDEX idx_webhook_events_calendar_status ON public.webhook_events(calendar_id, status);
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events(created_at);
CREATE INDEX idx_webhook_endpoints_calendar_active ON public.webhook_endpoints(calendar_id, is_active);
