-- Remove all mock WhatsApp data from the database
-- This will clear out any test/mock data that was previously generated

-- Delete mock WhatsApp messages first (due to foreign key constraints)
DELETE FROM whatsapp_messages 
WHERE conversation_id IN (
  SELECT wc.id 
  FROM whatsapp_conversations wc
  JOIN whatsapp_contacts cont ON wc.contact_id = cont.id
  WHERE cont.phone_number LIKE '+3161%' -- Mock phone numbers start with +3161
     OR cont.phone_number LIKE '+3162%'
     OR cont.phone_number LIKE '+3163%'
     OR cont.phone_number LIKE '+3164%'
     OR cont.phone_number LIKE '+3165%'
     OR cont.phone_number LIKE '+3166%'
     OR cont.phone_number LIKE '+3167%'
     OR cont.phone_number LIKE '+3168%'
);

-- Delete booking intents for mock conversations
DELETE FROM booking_intents
WHERE conversation_id IN (
  SELECT wc.id 
  FROM whatsapp_conversations wc
  JOIN whatsapp_contacts cont ON wc.contact_id = cont.id
  WHERE cont.phone_number LIKE '+3161%'
     OR cont.phone_number LIKE '+3162%'
     OR cont.phone_number LIKE '+3163%'
     OR cont.phone_number LIKE '+3164%'
     OR cont.phone_number LIKE '+3165%'
     OR cont.phone_number LIKE '+3166%'
     OR cont.phone_number LIKE '+3167%'
     OR cont.phone_number LIKE '+3168%'
);

-- Delete conversation context for mock conversations
DELETE FROM conversation_context
WHERE conversation_id IN (
  SELECT wc.id 
  FROM whatsapp_conversations wc
  JOIN whatsapp_contacts cont ON wc.contact_id = cont.id
  WHERE cont.phone_number LIKE '+3161%'
     OR cont.phone_number LIKE '+3162%'
     OR cont.phone_number LIKE '+3163%'
     OR cont.phone_number LIKE '+3164%'
     OR cont.phone_number LIKE '+3165%'
     OR cont.phone_number LIKE '+3166%'
     OR cont.phone_number LIKE '+3167%'
     OR cont.phone_number LIKE '+3168%'
);

-- Delete mock conversations
DELETE FROM whatsapp_conversations 
WHERE contact_id IN (
  SELECT id FROM whatsapp_contacts
  WHERE phone_number LIKE '+3161%'
     OR phone_number LIKE '+3162%'
     OR phone_number LIKE '+3163%'
     OR phone_number LIKE '+3164%'
     OR phone_number LIKE '+3165%'
     OR phone_number LIKE '+3166%'
     OR phone_number LIKE '+3167%'
     OR phone_number LIKE '+3168%'
);

-- Delete mock contacts
DELETE FROM whatsapp_contacts
WHERE phone_number LIKE '+3161%'
   OR phone_number LIKE '+3162%'
   OR phone_number LIKE '+3163%'
   OR phone_number LIKE '+3164%'
   OR phone_number LIKE '+3165%'
   OR phone_number LIKE '+3166%'
   OR phone_number LIKE '+3167%'
   OR phone_number LIKE '+3168%';

-- Also clean up any bookings with mock phone numbers
DELETE FROM bookings
WHERE customer_phone LIKE '+3161%'
   OR customer_phone LIKE '+3162%'
   OR customer_phone LIKE '+3163%'
   OR customer_phone LIKE '+3164%'
   OR customer_phone LIKE '+3165%'
   OR customer_phone LIKE '+3166%'
   OR customer_phone LIKE '+3167%'
   OR customer_phone LIKE '+3168%';