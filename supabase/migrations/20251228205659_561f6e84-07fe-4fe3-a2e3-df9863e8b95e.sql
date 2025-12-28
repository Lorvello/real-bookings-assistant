-- Herstructureer whatsapp_contact_overview: verwijder vaste calendar koppeling, voeg all_bookings JSON toe

-- Stap 1: Drop dependent policies eerst
DROP POLICY IF EXISTS "Users can view their own whatsapp contacts overview" ON public.whatsapp_contact_overview;
DROP POLICY IF EXISTS "Users can manage whatsapp conversations for their calendars" ON public.whatsapp_conversations;

-- Stap 2: Voeg nieuwe kolom toe
ALTER TABLE public.whatsapp_contact_overview 
ADD COLUMN IF NOT EXISTS all_bookings JSONB DEFAULT '[]'::jsonb;

-- Stap 3: Verwijder oude kolommen (single booking koppeling)
ALTER TABLE public.whatsapp_contact_overview 
DROP COLUMN IF EXISTS booking_id,
DROP COLUMN IF EXISTS laatste_booking,
DROP COLUMN IF EXISTS laatste_service,
DROP COLUMN IF EXISTS booking_status,
DROP COLUMN IF EXISTS calendar_id,
DROP COLUMN IF EXISTS calendar_name,
DROP COLUMN IF EXISTS business_name;

-- Stap 4: Nieuwe RLS policy voor whatsapp_contact_overview
-- Gebruikers kunnen contacts zien die boekingen hebben bij hun kalenders
CREATE POLICY "Users can view contacts with bookings at their calendars"
ON public.whatsapp_contact_overview
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(all_bookings) AS booking
    WHERE (booking->>'calendar_id')::uuid IN (
      SELECT id FROM public.calendars WHERE user_id = auth.uid()
    )
  )
  OR 
  -- Of als er geen boekingen zijn, kijk naar conversations
  EXISTS (
    SELECT 1 
    FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON wc.calendar_id = c.id
    WHERE wc.contact_id = whatsapp_contact_overview.contact_id
      AND c.user_id = auth.uid()
  )
);

-- Stap 5: Herstel de whatsapp_conversations policy
CREATE POLICY "Users can manage whatsapp conversations for their calendars"
ON public.whatsapp_conversations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars c
    WHERE c.id = whatsapp_conversations.calendar_id
      AND c.user_id = auth.uid()
  )
);

-- Stap 6: Update de refresh functie met nieuwe logica
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
      (SELECT jsonb_agg(
        jsonb_build_object(
          'booking_id', b.id,
          'calendar_id', b.calendar_id,
          'calendar_name', cal.name,
          'business_name', u.business_name,
          'start_time', b.start_time,
          'end_time', b.end_time,
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
    ), '[]'::jsonb) as all_bookings,
    NOW() as updated_at
  FROM public.whatsapp_contacts wc
  LEFT JOIN LATERAL (
    SELECT * FROM public.whatsapp_conversations conv
    WHERE conv.contact_id = wc.id
    ORDER BY conv.last_message_at DESC NULLS LAST
    LIMIT 1
  ) latest_conv ON true;
END;
$$;

-- Stap 7: Voer de refresh uit om data bij te werken
SELECT public.refresh_whatsapp_contact_overview();