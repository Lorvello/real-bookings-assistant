-- Fix missing calendar_id for Luciano's WhatsApp messages
-- This allows RLS policies to correctly grant access

-- Update whatsapp_conversations records
UPDATE whatsapp_conversations
SET calendar_id = '5a0393d4-2a35-41bc-9da5-5bafe4585a06'
WHERE contact_id = 'e912a7ce-d4bc-473d-9391-465b2c5bd2d4'
  AND calendar_id IS NULL;

-- Update whatsapp_contact_overview record
UPDATE whatsapp_contact_overview
SET calendar_id = '5a0393d4-2a35-41bc-9da5-5bafe4585a06'
WHERE contact_id = 'e912a7ce-d4bc-473d-9391-465b2c5bd2d4'
  AND calendar_id IS NULL;