-- Drop oude policy
DROP POLICY IF EXISTS "Users can manage whatsapp conversations for their calendars" ON whatsapp_conversations;

-- Nieuwe policy met business_name fallback voor NULL calendar_id
CREATE POLICY "Users can manage whatsapp conversations for their calendars"
ON whatsapp_conversations
FOR ALL
USING (
  -- Optie 1: calendar_id is gevuld en matched
  (calendar_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM calendars c 
    WHERE c.id = whatsapp_conversations.calendar_id 
      AND c.user_id = auth.uid()
  ))
  OR
  -- Optie 2: calendar_id is NULL, match op business_name
  (calendar_id IS NULL AND business_name IS NOT NULL AND EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
      AND u.business_name = whatsapp_conversations.business_name
  ))
);