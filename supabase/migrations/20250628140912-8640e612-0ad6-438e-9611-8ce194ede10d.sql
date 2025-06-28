
-- Create a proper table for WhatsApp contact overview
CREATE TABLE public.whatsapp_contact_overview (
  contact_id uuid PRIMARY KEY,
  phone_number text NOT NULL,
  display_name text,
  first_name text,
  last_name text,
  session_id text,
  calendar_id uuid,
  calendar_name text,
  business_name text,
  booking_id uuid,
  laatste_booking timestamp with time zone,
  laatste_service text,
  booking_status text,
  last_seen_at timestamp with time zone,
  contact_created_at timestamp with time zone,
  conversation_status text,
  last_message_at timestamp with time zone,
  conversation_created_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_whatsapp_contact_overview_phone ON public.whatsapp_contact_overview (phone_number);
CREATE INDEX idx_whatsapp_contact_overview_calendar ON public.whatsapp_contact_overview (calendar_id);
CREATE INDEX idx_whatsapp_contact_overview_last_booking ON public.whatsapp_contact_overview (laatste_booking DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_contact_overview ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT SELECT ON public.whatsapp_contact_overview TO authenticated;

-- Create RLS policy
CREATE POLICY "Users can view their own whatsapp contacts overview"
  ON public.whatsapp_contact_overview
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars c
      WHERE c.id = whatsapp_contact_overview.calendar_id
      AND c.user_id = auth.uid()
    )
  );

-- Function to refresh the contact overview data
CREATE OR REPLACE FUNCTION public.refresh_whatsapp_contact_overview()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing data
  DELETE FROM public.whatsapp_contact_overview;
  
  -- Insert fresh data
  INSERT INTO public.whatsapp_contact_overview (
    contact_id, phone_number, display_name, first_name, last_name,
    session_id, calendar_id, calendar_name, business_name,
    booking_id, laatste_booking, laatste_service, booking_status,
    last_seen_at, contact_created_at, conversation_status,
    last_message_at, conversation_created_at
  )
  SELECT 
    wc.id as contact_id,
    wc.phone_number,
    wc.display_name,
    wc.first_name,
    wc.last_name,
    conv.session_id,
    conv.calendar_id,
    cal.name as calendar_name,
    u.business_name,
    latest_booking.booking_id,
    latest_booking.booking_start_time as laatste_booking,
    latest_booking.service_name as laatste_service,
    latest_booking.booking_status,
    wc.last_seen_at,
    wc.created_at as contact_created_at,
    conv.status as conversation_status,
    conv.last_message_at,
    conv.created_at as conversation_created_at
  FROM public.whatsapp_contacts wc
  LEFT JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
  LEFT JOIN public.calendars cal ON conv.calendar_id = cal.id
  LEFT JOIN public.users u ON cal.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT 
      b.id as booking_id,
      b.start_time as booking_start_time,
      COALESCE(b.service_name, st.name) as service_name,
      b.status as booking_status
    FROM public.bookings b
    LEFT JOIN public.service_types st ON b.service_type_id = st.id
    WHERE b.customer_phone = wc.phone_number
      AND b.calendar_id = conv.calendar_id
    ORDER BY b.start_time DESC
    LIMIT 1
  ) latest_booking ON true;
END;
$$;

-- Function to trigger refresh on relevant table changes
CREATE OR REPLACE FUNCTION public.trigger_whatsapp_overview_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Schedule refresh in background to avoid blocking the transaction
  PERFORM pg_notify('refresh_whatsapp_overview', 'refresh_needed');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for automatic refresh
CREATE TRIGGER whatsapp_contacts_overview_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_whatsapp_overview_refresh();

CREATE TRIGGER whatsapp_conversations_overview_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_whatsapp_overview_refresh();

CREATE TRIGGER bookings_overview_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_whatsapp_overview_refresh();

-- Initial data population
SELECT public.refresh_whatsapp_contact_overview();
