-- Fix refresh_whatsapp_contact_overview function to comply with RLS requirements
-- Adding WHERE true to DELETE statement to fix "DELETE requires a WHERE clause" error

CREATE OR REPLACE FUNCTION public.refresh_whatsapp_contact_overview()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clear existing data (WHERE true required for RLS compliance)
  DELETE FROM public.whatsapp_contact_overview WHERE true;
  
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