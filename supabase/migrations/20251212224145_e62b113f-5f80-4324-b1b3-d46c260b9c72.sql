-- Drop de bestaande policy
DROP POLICY IF EXISTS "Users can manage whatsapp conversations for their calendars" 
  ON whatsapp_conversations;

-- Maak een nieuwe policy die ook via contact_id werkt
CREATE POLICY "Users can manage whatsapp conversations for their calendars" 
  ON whatsapp_conversations
  FOR ALL
  USING (
    -- Optie 1: calendar_id matcht direct
    EXISTS (
      SELECT 1 FROM calendars c
      WHERE c.id = whatsapp_conversations.calendar_id 
        AND c.user_id = auth.uid()
    )
    OR
    -- Optie 2: contact_id hoort bij een contact die gelinkt is aan user's calendar
    EXISTS (
      SELECT 1 FROM whatsapp_contact_overview wco
      JOIN calendars c ON c.id = wco.calendar_id
      WHERE wco.contact_id = whatsapp_conversations.contact_id 
        AND c.user_id = auth.uid()
    )
    OR
    -- Optie 3: contact_id hoort bij een contact van user's business_name
    EXISTS (
      SELECT 1 FROM whatsapp_contact_overview wco
      JOIN users u ON u.business_name = wco.business_name
      WHERE wco.contact_id = whatsapp_conversations.contact_id 
        AND u.id = auth.uid()
    )
  )
  WITH CHECK (
    -- Voor INSERT/UPDATE: zelfde logica
    EXISTS (
      SELECT 1 FROM calendars c
      WHERE c.id = whatsapp_conversations.calendar_id 
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM whatsapp_contact_overview wco
      JOIN calendars c ON c.id = wco.calendar_id
      WHERE wco.contact_id = whatsapp_conversations.contact_id 
        AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN whatsapp_contact_overview wco ON u.business_name = wco.business_name
      WHERE wco.contact_id = whatsapp_conversations.contact_id 
        AND u.id = auth.uid()
    )
  );