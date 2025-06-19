
-- Enable RLS on WhatsApp tables (if not already enabled)
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_reply_flows ENABLE ROW LEVEL SECURITY;

-- RLS Policy for WhatsApp Conversations - Only calendar owners can access their conversations
CREATE POLICY "Users can view own WhatsApp conversations" 
  ON whatsapp_conversations
  FOR ALL 
  USING (
    calendar_id IN (
      SELECT id FROM calendars WHERE user_id = auth.uid()
    )
  );

-- RLS Policy for WhatsApp Messages - Only access messages from owned conversations
CREATE POLICY "Users can view messages from own conversations" 
  ON whatsapp_messages
  FOR ALL 
  USING (
    conversation_id IN (
      SELECT conv.id 
      FROM whatsapp_conversations conv
      JOIN calendars cal ON cal.id = conv.calendar_id
      WHERE cal.user_id = auth.uid()
    )
  );

-- RLS Policy for WhatsApp Contacts - Only access contacts from owned conversations
CREATE POLICY "Users can view contacts from own conversations" 
  ON whatsapp_contacts
  FOR ALL 
  USING (
    id IN (
      SELECT conv.contact_id
      FROM whatsapp_conversations conv
      JOIN calendars cal ON cal.id = conv.calendar_id
      WHERE cal.user_id = auth.uid()
    )
  );

-- RLS Policy for Conversation Context - Only access context from owned conversations
CREATE POLICY "Users can view context from own conversations" 
  ON conversation_context
  FOR ALL 
  USING (
    conversation_id IN (
      SELECT conv.id 
      FROM whatsapp_conversations conv
      JOIN calendars cal ON cal.id = conv.calendar_id
      WHERE cal.user_id = auth.uid()
    )
  );

-- RLS Policy for Booking Intents - Only access intents from owned conversations
CREATE POLICY "Users can view booking intents from own conversations" 
  ON booking_intents
  FOR ALL 
  USING (
    conversation_id IN (
      SELECT conv.id 
      FROM whatsapp_conversations conv
      JOIN calendars cal ON cal.id = conv.calendar_id
      WHERE cal.user_id = auth.uid()
    )
  );

-- RLS Policy for WhatsApp Templates - Only access own calendar templates
CREATE POLICY "Users can manage own WhatsApp templates" 
  ON whatsapp_templates
  FOR ALL 
  USING (
    calendar_id IN (
      SELECT id FROM calendars WHERE user_id = auth.uid()
    )
  );

-- RLS Policy for Quick Reply Flows - Only access own calendar flows
CREATE POLICY "Users can manage own quick reply flows" 
  ON quick_reply_flows
  FOR ALL 
  USING (
    calendar_id IN (
      SELECT id FROM calendars WHERE user_id = auth.uid()
    )
  );

-- Data Retention Function for GDPR Compliance
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_data()
RETURNS void AS $$
BEGIN
  -- Archive conversations inactive for more than 30 days
  UPDATE whatsapp_conversations
  SET status = 'archived'
  WHERE last_message_at < now() - interval '30 days'
    AND status = 'active';
  
  -- Delete expired conversation context
  DELETE FROM conversation_context
  WHERE expires_at IS NOT NULL 
    AND expires_at < now();
  
  -- Delete abandoned booking intents older than 7 days
  DELETE FROM booking_intents
  WHERE status = 'abandoned' 
    AND created_at < now() - interval '7 days';
  
  -- Delete old messages (configurable retention period - default 90 days)
  DELETE FROM whatsapp_messages
  WHERE created_at < now() - interval '90 days';
  
  -- Clean up orphaned contacts (contacts with no active conversations)
  DELETE FROM whatsapp_contacts
  WHERE id NOT IN (
    SELECT DISTINCT contact_id 
    FROM whatsapp_conversations 
    WHERE contact_id IS NOT NULL
  );
  
  -- Log cleanup activity
  INSERT INTO error_logs (calendar_id, error_type, error_message, error_context)
  SELECT 
    NULL,
    'data_cleanup',
    'Automated WhatsApp data cleanup completed',
    jsonb_build_object(
      'cleanup_date', now(),
      'retention_period_days', 90
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's data retention settings (for future customization)
CREATE OR REPLACE FUNCTION get_whatsapp_data_retention_days(p_calendar_id uuid)
RETURNS integer AS $$
DECLARE
  retention_days integer := 90; -- default 90 days
BEGIN
  -- Future: could read from calendar_settings or user preferences
  -- For now, return default value
  RETURN retention_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced cleanup function with configurable retention
CREATE OR REPLACE FUNCTION cleanup_whatsapp_data_for_calendar(p_calendar_id uuid)
RETURNS void AS $$
DECLARE
  retention_days integer;
BEGIN
  -- Get retention period for this calendar
  retention_days := get_whatsapp_data_retention_days(p_calendar_id);
  
  -- Archive old conversations for this calendar
  UPDATE whatsapp_conversations
  SET status = 'archived'
  WHERE calendar_id = p_calendar_id
    AND last_message_at < now() - interval '30 days'
    AND status = 'active';
  
  -- Delete old messages for this calendar
  DELETE FROM whatsapp_messages
  WHERE conversation_id IN (
    SELECT id FROM whatsapp_conversations WHERE calendar_id = p_calendar_id
  )
  AND created_at < now() - (retention_days || ' days')::interval;
  
  -- Log cleanup for this calendar
  INSERT INTO error_logs (calendar_id, error_type, error_message, error_context)
  VALUES (
    p_calendar_id,
    'data_cleanup',
    'Calendar-specific WhatsApp data cleanup completed',
    jsonb_build_object(
      'cleanup_date', now(),
      'retention_period_days', retention_days
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to export user's WhatsApp data (for GDPR data portability)
CREATE OR REPLACE FUNCTION export_whatsapp_data(p_calendar_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- Verify user owns this calendar
  IF NOT EXISTS (
    SELECT 1 FROM calendars 
    WHERE id = p_calendar_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Calendar not found or not owned by user';
  END IF;
  
  -- Export all WhatsApp data for this calendar
  SELECT jsonb_build_object(
    'export_date', now(),
    'calendar_id', p_calendar_id,
    'contacts', (
      SELECT jsonb_agg(row_to_json(wc.*))
      FROM whatsapp_contacts wc
      WHERE wc.id IN (
        SELECT DISTINCT contact_id 
        FROM whatsapp_conversations 
        WHERE calendar_id = p_calendar_id
      )
    ),
    'conversations', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'conversation', row_to_json(conv.*),
          'messages', (
            SELECT jsonb_agg(row_to_json(msg.*) ORDER BY msg.created_at)
            FROM whatsapp_messages msg
            WHERE msg.conversation_id = conv.id
          )
        )
      )
      FROM whatsapp_conversations conv
      WHERE conv.calendar_id = p_calendar_id
    ),
    'templates', (
      SELECT jsonb_agg(row_to_json(tmpl.*))
      FROM whatsapp_templates tmpl
      WHERE tmpl.calendar_id = p_calendar_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
