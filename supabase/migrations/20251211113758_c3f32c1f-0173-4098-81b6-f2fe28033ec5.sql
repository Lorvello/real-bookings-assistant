-- Add missing session_id column to whatsapp_conversations
-- This fixes the booking webhook trigger error: "column wc.session_id does not exist"

ALTER TABLE whatsapp_conversations 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add index for performance on session_id lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_session_id 
ON whatsapp_conversations(session_id) WHERE session_id IS NOT NULL;