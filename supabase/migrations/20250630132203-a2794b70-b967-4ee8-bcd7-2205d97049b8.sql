
-- WhatsApp Data Cleanup en Reparatie Plan
-- Stap 1: Data cleanup - verwijder orphaned/inconsistente records

-- Verwijder conversaties zonder geldige contact_id of calendar_id
DELETE FROM public.whatsapp_conversations 
WHERE contact_id IS NULL 
   OR calendar_id IS NULL 
   OR NOT EXISTS (SELECT 1 FROM public.calendars WHERE id = whatsapp_conversations.calendar_id);

-- Verwijder berichten van niet-bestaande conversaties
DELETE FROM public.whatsapp_messages 
WHERE conversation_id IS NULL 
   OR NOT EXISTS (SELECT 1 FROM public.whatsapp_conversations WHERE id = whatsapp_messages.conversation_id);

-- Stap 2: Veilige contact migratie - maak WhatsApp contacten aan voor bookings
INSERT INTO public.whatsapp_contacts (phone_number, display_name, first_name, last_name, created_at)
SELECT DISTINCT 
  b.customer_phone,
  b.customer_name,
  SPLIT_PART(b.customer_name, ' ', 1) as first_name,
  CASE 
    WHEN POSITION(' ' IN b.customer_name) > 0 
    THEN SUBSTRING(b.customer_name FROM POSITION(' ' IN b.customer_name) + 1)
    ELSE NULL 
  END as last_name,
  MIN(b.created_at)
FROM public.bookings b
WHERE b.customer_phone IS NOT NULL 
  AND b.customer_phone != ''
  AND LENGTH(TRIM(b.customer_phone)) > 0
GROUP BY b.customer_phone, b.customer_name
ON CONFLICT (phone_number) DO NOTHING;

-- Stap 3: Conversatie linking - maak conversaties aan per kalender/contact combinatie
INSERT INTO public.whatsapp_conversations (calendar_id, contact_id, status, created_at, last_message_at)
SELECT DISTINCT 
  b.calendar_id,
  wc.id as contact_id,
  'active' as status,
  MIN(b.created_at),
  MAX(b.created_at) -- gebruik laatste booking als laatste message tijd
FROM public.bookings b
JOIN public.whatsapp_contacts wc ON wc.phone_number = b.customer_phone
JOIN public.calendars c ON c.id = b.calendar_id
WHERE b.customer_phone IS NOT NULL 
  AND b.customer_phone != ''
  AND LENGTH(TRIM(b.customer_phone)) > 0
GROUP BY b.calendar_id, wc.id
ON CONFLICT (calendar_id, contact_id) DO NOTHING;

-- Stap 4: Overview refresh - vul de overview tabel
DELETE FROM public.whatsapp_contact_overview;

INSERT INTO public.whatsapp_contact_overview (
  contact_id, phone_number, display_name, first_name, last_name,
  session_id, calendar_id, calendar_name, business_name,
  booking_id, laatste_booking, laatste_service, booking_status,
  last_seen_at, contact_created_at, conversation_status,
  last_message_at, conversation_created_at, updated_at
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
  conv.created_at as conversation_created_at,
  now() as updated_at
FROM public.whatsapp_contacts wc
JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
LEFT JOIN public.calendars cal ON conv.calendar_id = cal.id
LEFT JOIN public.users u ON cal.user_id = u.id
LEFT JOIN LATERAL (
  SELECT 
    b.id as booking_id,
    b.start_time as booking_start_time,
    COALESCE(b.service_name, st.name, 'Onbekende Service') as service_name,
    b.status as booking_status,
    ROW_NUMBER() OVER (ORDER BY b.start_time DESC) as rn
  FROM public.bookings b
  LEFT JOIN public.service_types st ON b.service_type_id = st.id
  WHERE b.customer_phone = wc.phone_number
    AND b.calendar_id = conv.calendar_id
) latest_booking ON latest_booking.rn = 1;

-- Stap 5: Verificatie queries
-- Tel de resultaten om te controleren dat alles correct is
SELECT 
  'whatsapp_contacts' as table_name, 
  COUNT(*) as record_count 
FROM public.whatsapp_contacts
UNION ALL
SELECT 
  'whatsapp_conversations' as table_name, 
  COUNT(*) as record_count 
FROM public.whatsapp_conversations
UNION ALL
SELECT 
  'whatsapp_contact_overview' as table_name, 
  COUNT(*) as record_count 
FROM public.whatsapp_contact_overview
UNION ALL
SELECT 
  'bookings_with_phone' as table_name, 
  COUNT(*) as record_count 
FROM public.bookings 
WHERE customer_phone IS NOT NULL AND customer_phone != '';

-- Health check om te controleren of alles correct gelinkt is
SELECT 
  COUNT(*) FILTER (WHERE contact_id IS NULL) as contacts_without_id,
  COUNT(*) FILTER (WHERE calendar_id IS NULL) as conversations_without_calendar,
  COUNT(*) FILTER (WHERE laatste_booking IS NULL) as contacts_without_bookings,
  COUNT(*) as total_overview_records
FROM public.whatsapp_contact_overview;
