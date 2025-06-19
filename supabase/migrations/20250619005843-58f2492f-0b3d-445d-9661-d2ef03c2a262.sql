
-- Create WhatsApp analytics view
CREATE VIEW whatsapp_analytics AS
SELECT 
  c.id as calendar_id,
  c.name as calendar_name,
  COUNT(DISTINCT wc.id) as total_contacts,
  COUNT(DISTINCT conv.id) as total_conversations,
  COUNT(DISTINCT CASE WHEN conv.status = 'active' THEN conv.id END) as active_conversations,
  COUNT(DISTINCT wm.id) as total_messages,
  COUNT(DISTINCT CASE WHEN wm.direction = 'inbound' THEN wm.id END) as inbound_messages,
  COUNT(DISTINCT CASE WHEN wm.direction = 'outbound' THEN wm.id END) as outbound_messages,
  COUNT(DISTINCT bi.id) as total_booking_intents,
  COUNT(DISTINCT CASE WHEN bi.status = 'booked' THEN bi.id END) as completed_booking_intents,
  COUNT(DISTINCT b.id) as bookings_via_whatsapp,
  CASE 
    WHEN COUNT(DISTINCT bi.id) > 0 
    THEN (COUNT(DISTINCT CASE WHEN bi.status = 'booked' THEN bi.id END)::float / COUNT(DISTINCT bi.id)::float) * 100
    ELSE 0 
  END as booking_intent_conversion_rate,
  CASE 
    WHEN COUNT(DISTINCT conv.id) > 0 
    THEN (COUNT(DISTINCT b.id)::float / COUNT(DISTINCT conv.id)::float) * 100
    ELSE 0 
  END as conversation_to_booking_rate,
  AVG(
    EXTRACT(EPOCH FROM (
      SELECT MIN(wm2.created_at) 
      FROM whatsapp_messages wm2 
      WHERE wm2.conversation_id = conv.id 
        AND wm2.direction = 'outbound'
        AND wm2.created_at > wm.created_at
    ) - wm.created_at) / 60
  ) as avg_response_time_minutes
FROM calendars c
LEFT JOIN whatsapp_conversations conv ON conv.calendar_id = c.id
LEFT JOIN whatsapp_contacts wc ON wc.id = conv.contact_id
LEFT JOIN whatsapp_messages wm ON wm.conversation_id = conv.id
LEFT JOIN booking_intents bi ON bi.conversation_id = conv.id
LEFT JOIN bookings b ON b.customer_phone = wc.phone_number AND b.calendar_id = c.id
GROUP BY c.id, c.name;

-- Create message volume per hour view for time-based analytics
CREATE VIEW whatsapp_message_volume AS
SELECT 
  conv.calendar_id,
  DATE(wm.created_at) as message_date,
  EXTRACT(HOUR FROM wm.created_at) as message_hour,
  COUNT(*) as message_count,
  COUNT(CASE WHEN wm.direction = 'inbound' THEN 1 END) as inbound_count,
  COUNT(CASE WHEN wm.direction = 'outbound' THEN 1 END) as outbound_count
FROM whatsapp_messages wm
JOIN whatsapp_conversations conv ON conv.id = wm.conversation_id
WHERE wm.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY conv.calendar_id, DATE(wm.created_at), EXTRACT(HOUR FROM wm.created_at)
ORDER BY message_date DESC, message_hour;

-- Create conversation topics view (simplified categorization)
CREATE VIEW whatsapp_conversation_topics AS
SELECT 
  conv.calendar_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM whatsapp_messages wm 
      WHERE wm.conversation_id = conv.id 
        AND (LOWER(wm.content) LIKE '%afspraak%' OR LOWER(wm.content) LIKE '%booking%')
    ) THEN 'booking_request'
    WHEN EXISTS (
      SELECT 1 FROM whatsapp_messages wm 
      WHERE wm.conversation_id = conv.id 
        AND (LOWER(wm.content) LIKE '%beschikbaar%' OR LOWER(wm.content) LIKE '%available%')
    ) THEN 'availability_check'
    WHEN EXISTS (
      SELECT 1 FROM whatsapp_messages wm 
      WHERE wm.conversation_id = conv.id 
        AND (LOWER(wm.content) LIKE '%annuleer%' OR LOWER(wm.content) LIKE '%cancel%')
    ) THEN 'cancellation'
    WHEN EXISTS (
      SELECT 1 FROM whatsapp_messages wm 
      WHERE wm.conversation_id = conv.id 
        AND (LOWER(wm.content) LIKE '%info%' OR LOWER(wm.content) LIKE '%vraag%')
    ) THEN 'information_request'
    ELSE 'other'
  END as topic_category,
  COUNT(*) as conversation_count
FROM whatsapp_conversations conv
WHERE conv.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY conv.calendar_id, topic_category;
