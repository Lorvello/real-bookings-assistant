-- Drop de bestaande policy
DROP POLICY IF EXISTS "Users can view their own whatsapp contacts overview" ON whatsapp_contact_overview;

-- Maak nieuwe policy die ook business_name checkt voor contacts zonder calendar_id
CREATE POLICY "Users can view their own whatsapp contacts overview"
ON whatsapp_contact_overview
FOR SELECT
USING (
  -- Optie 1: calendar_id matcht een eigen calendar
  EXISTS (
    SELECT 1 FROM calendars c 
    WHERE c.id = whatsapp_contact_overview.calendar_id 
    AND c.user_id = auth.uid()
  )
  OR
  -- Optie 2: business_name matcht via users table (voor contacts zonder calendar)
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.business_name IS NOT NULL
    AND u.business_name = whatsapp_contact_overview.business_name
  )
  OR
  -- Optie 3: with_business matcht via users table
  EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.business_name IS NOT NULL
    AND u.business_name = whatsapp_contact_overview.with_business
  )
);