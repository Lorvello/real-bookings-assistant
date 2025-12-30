-- Update refresh function to include conversations business_name as fallback
CREATE OR REPLACE FUNCTION public.refresh_whatsapp_contact_overview()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Leeg de tabel
  DELETE FROM public.whatsapp_contact_overview WHERE true;

  -- Vul opnieuw met alle contacts en hun boekingen als JSON array
  INSERT INTO public.whatsapp_contact_overview (
    contact_id,
    phone_number,
    display_name,
    first_name,
    last_name,
    last_seen_at,
    contact_created_at,
    session_id,
    conversation_status,
    last_message_at,
    conversation_created_at,
    all_bookings,
    with_business,
    updated_at
  )
  SELECT
    wc.id as contact_id,
    wc.phone_number,
    wc.display_name,
    wc.first_name,
    wc.last_name,
    wc.last_seen_at,
    wc.created_at as contact_created_at,
    -- Laatste conversation info
    latest_conv.session_id,
    latest_conv.status as conversation_status,
    latest_conv.last_message_at,
    latest_conv.created_at as conversation_created_at,
    -- ALLE boekingen als JSON array (gesorteerd op datum, nieuwste eerst)
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'booking_id', b.id,
            'calendar_id', b.calendar_id,
            'calendar_name', cal.name,
            'business_name', u.business_name,
            'start_time', b.start_time,
            'end_time', b.end_time,
            'service_type_id', b.service_type_id,
            'service_name', COALESCE(b.service_name, st.name),
            'status', b.status,
            'customer_name', b.customer_name,
            'customer_email', b.customer_email
          ) ORDER BY b.start_time DESC
        )
        FROM public.bookings b
        LEFT JOIN public.calendars cal ON b.calendar_id = cal.id
        LEFT JOIN public.users u ON cal.user_id = u.id
        LEFT JOIN public.service_types st ON b.service_type_id = st.id
        WHERE b.customer_phone = wc.phone_number
          AND b.is_deleted = false
      ),
      '[]'::jsonb
    ) as all_bookings,
    -- with_business: override first, then latest booking business, then conversation business, then NULL
    COALESCE(
      override.business_name,
      -- Fallback 1: business uit actieve bookings
      (
        SELECT u.business_name
        FROM public.bookings b
        JOIN public.calendars cal ON b.calendar_id = cal.id
        JOIN public.users u ON cal.user_id = u.id
        WHERE b.customer_phone = wc.phone_number
          AND b.is_deleted = false
        ORDER BY b.start_time DESC
        LIMIT 1
      ),
      -- Fallback 2: business uit whatsapp_conversations (voor als bookings verwijderd zijn)
      (
        SELECT conv.business_name
        FROM public.whatsapp_conversations conv
        WHERE conv.phone_number = wc.phone_number
          AND conv.business_name IS NOT NULL
          AND conv.business_name != ''
        ORDER BY conv.last_message_at DESC NULLS LAST
        LIMIT 1
      )
    ) as with_business,
    NOW() as updated_at
  FROM public.whatsapp_contacts wc
  LEFT JOIN LATERAL (
    SELECT * FROM public.whatsapp_conversations conv
    WHERE conv.contact_id = wc.id
    ORDER BY conv.last_message_at DESC NULLS LAST
    LIMIT 1
  ) latest_conv ON true
  LEFT JOIN public.whatsapp_contact_business_overrides override ON override.contact_id = wc.id;
END;
$$;

-- Trigger refresh om de wijziging direct toe te passen
SELECT refresh_whatsapp_contact_overview();