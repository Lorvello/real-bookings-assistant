-- Add WhatsApp settings to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_qr_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_qr_generated_at TIMESTAMPTZ;

-- Migrate existing WhatsApp data from calendar_settings to users
UPDATE users u
SET 
  whatsapp_phone_number = cs.whatsapp_phone_number,
  whatsapp_qr_url = cs.whatsapp_qr_url,
  whatsapp_qr_generated_at = cs.whatsapp_qr_generated_at
FROM calendar_settings cs
JOIN calendars c ON c.id = cs.calendar_id
WHERE c.user_id = u.id
  AND cs.whatsapp_phone_number IS NOT NULL
  AND u.whatsapp_phone_number IS NULL;

-- Add user_id to whatsapp_contacts for proper tracking
ALTER TABLE whatsapp_contacts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_user_id 
ON whatsapp_contacts(user_id);

-- Add RLS policy for users to manage their own WhatsApp settings
CREATE POLICY "users_manage_own_whatsapp"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add RLS policy for whatsapp_contacts user access
CREATE POLICY "whatsapp_contacts_user_access"
ON whatsapp_contacts FOR ALL
USING (user_id = auth.uid());