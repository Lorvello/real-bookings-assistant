-- Verwijder de UNIQUE constraint die meerdere berichten per contact blokkeert
ALTER TABLE whatsapp_conversations 
DROP CONSTRAINT IF EXISTS whatsapp_conversations_calendar_id_contact_id_key;