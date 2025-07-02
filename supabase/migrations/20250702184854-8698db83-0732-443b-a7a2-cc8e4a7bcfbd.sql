
-- Defensieve aanpak: gebruik UPSERT met DO NOTHING om duplicaten te negeren

-- Stap 1: Probeer nieuwe contacten toe te voegen, negeer duplicaten
INSERT INTO public.whatsapp_contacts (phone_number, display_name, updated_at)
SELECT DISTINCT 
    b.customer_phone, 
    b.customer_name,
    NOW()
FROM public.bookings b
WHERE b.customer_phone IS NOT NULL
ON CONFLICT (phone_number) DO NOTHING;

-- Stap 2: Maak conversations aan voor combinaties die nog niet bestaan
INSERT INTO public.whatsapp_conversations (contact_id, calendar_id, session_id, status, created_at)
SELECT DISTINCT
    wc.id as contact_id,
    COALESCE(b.calendar_id, c.id) as calendar_id,
    'session_' || REPLACE(wc.phone_number, '+', '') || '_' || EXTRACT(EPOCH FROM NOW())::bigint as session_id,
    'active',
    NOW()
FROM public.whatsapp_contacts wc
CROSS JOIN public.calendars c
LEFT JOIN public.bookings b ON b.customer_phone = wc.phone_number AND b.calendar_id = c.id
WHERE wc.phone_number IN (
    SELECT DISTINCT customer_phone 
    FROM public.bookings 
    WHERE customer_phone IS NOT NULL
)
AND NOT EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wconv 
    WHERE wconv.contact_id = wc.id 
      AND wconv.calendar_id = COALESCE(b.calendar_id, c.id)
)
AND (b.calendar_id IS NOT NULL OR c.id IS NOT NULL);

-- Stap 3: Maak booking_intents aan voor bookings zonder intent
INSERT INTO public.booking_intents (conversation_id, service_type_id, status, booking_id, collected_data, created_at)
SELECT DISTINCT
    wconv.id as conversation_id,
    b.service_type_id,
    'booked',
    b.id,
    jsonb_build_object(
        'customer_name', b.customer_name,
        'linked_retroactively', true,
        'session_id', wconv.session_id
    ),
    NOW()
FROM public.bookings b
JOIN public.whatsapp_contacts wc ON wc.phone_number = b.customer_phone
JOIN public.whatsapp_conversations wconv ON wconv.contact_id = wc.id AND wconv.calendar_id = b.calendar_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.booking_intents bi 
    WHERE bi.booking_id = b.id
)
AND b.customer_phone IS NOT NULL;

-- Stap 4: Update conversations zonder session_id
UPDATE public.whatsapp_conversations 
SET session_id = 'session_' || REPLACE(
    (SELECT phone_number FROM public.whatsapp_contacts WHERE id = whatsapp_conversations.contact_id), 
    '+', ''
) || '_' || EXTRACT(EPOCH FROM NOW())::bigint
WHERE session_id IS NULL;

-- Stap 5: Refresh de overview
SELECT public.refresh_whatsapp_contact_overview();

-- Eindiagnostiek
SELECT 
    (SELECT COUNT(*) FROM public.whatsapp_contacts) as total_contacts,
    (SELECT COUNT(*) FROM public.whatsapp_conversations) as total_conversations,
    (SELECT COUNT(*) FROM public.booking_intents) as total_intents,
    (SELECT COUNT(*) FROM public.bookings WHERE customer_phone IS NOT NULL) as bookings_with_phone;
