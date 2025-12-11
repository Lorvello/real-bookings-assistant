
-- First, insert the missing contact into whatsapp_contact_overview
INSERT INTO whatsapp_contact_overview (contact_id, phone_number, first_name, last_name, last_seen_at, contact_created_at)
SELECT 
  id as contact_id,
  phone_number,
  first_name,
  last_name,
  last_seen_at,
  created_at as contact_created_at
FROM whatsapp_contacts wc
WHERE wc.id NOT IN (SELECT contact_id FROM whatsapp_contact_overview WHERE contact_id IS NOT NULL)
ON CONFLICT (contact_id) DO NOTHING;

-- Drop existing foreign key that references whatsapp_contacts
ALTER TABLE public.whatsapp_conversations
DROP CONSTRAINT IF EXISTS whatsapp_conversations_contact_id_fkey;

-- Create new foreign key referencing whatsapp_contact_overview
ALTER TABLE public.whatsapp_conversations
ADD CONSTRAINT whatsapp_conversations_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES whatsapp_contact_overview(contact_id) ON DELETE CASCADE;
