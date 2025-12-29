-- Create override table for manual business tagging
CREATE TABLE public.whatsapp_contact_business_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contact_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_contact_business_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage overrides for contacts linked to their calendars
CREATE POLICY "whatsapp_contact_business_overrides_owner_all"
ON public.whatsapp_contact_business_overrides
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_contacts wc
    JOIN public.whatsapp_conversations wconv ON wconv.contact_id = wc.id
    JOIN public.calendars c ON c.id = wconv.calendar_id
    WHERE wc.id = whatsapp_contact_business_overrides.contact_id
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_contacts wc
    JOIN public.whatsapp_conversations wconv ON wconv.contact_id = wc.id
    JOIN public.calendars c ON c.id = wconv.calendar_id
    WHERE wc.id = whatsapp_contact_business_overrides.contact_id
    AND c.user_id = auth.uid()
  )
);

-- Add with_business column to overview if not exists (for displaying)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_contact_overview' 
    AND column_name = 'with_business'
  ) THEN
    ALTER TABLE public.whatsapp_contact_overview ADD COLUMN with_business text;
  END IF;
END $$;

-- Update refresh function to include overrides
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
    -- with_business: override first, then latest booking business, then NULL
    COALESCE(
      override.business_name,
      (
        SELECT u.business_name
        FROM public.bookings b
        JOIN public.calendars cal ON b.calendar_id = cal.id
        JOIN public.users u ON cal.user_id = u.id
        WHERE b.customer_phone = wc.phone_number
          AND b.is_deleted = false
        ORDER BY b.start_time DESC
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

-- Refresh to apply changes
SELECT public.refresh_whatsapp_contact_overview();