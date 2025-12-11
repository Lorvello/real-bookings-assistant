-- Add missing last_message_at column to whatsapp_conversations
-- This fixes the booking webhook trigger error: "column last_message_at does not exist"

ALTER TABLE whatsapp_conversations 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- Populate existing records with created_at as fallback
UPDATE whatsapp_conversations 
SET last_message_at = created_at 
WHERE last_message_at IS NULL;

-- Add index for sorting (used frequently in queries)
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at 
ON whatsapp_conversations(last_message_at DESC NULLS LAST);