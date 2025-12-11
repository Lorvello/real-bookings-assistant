-- Link all existing WhatsApp conversations to Hoofdkalender
UPDATE whatsapp_conversations 
SET calendar_id = '5a0393d4-2a35-41bc-9da5-5bafe4585a06'
WHERE calendar_id IS NULL;