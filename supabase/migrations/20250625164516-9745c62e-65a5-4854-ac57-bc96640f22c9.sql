
-- Fix WhatsApp Analytics Views Security Issue
-- Convert SECURITY DEFINER views to SECURITY INVOKER to respect user permissions

-- Drop and recreate whatsapp_analytics view with SECURITY INVOKER
DROP VIEW IF EXISTS public.whatsapp_analytics;
CREATE VIEW public.whatsapp_analytics
WITH (security_invoker = on) AS
SELECT 
  c.id as calendar_id,
  c.name as calendar_name,
  COALESCE(contact_stats.total_contacts, 0) as total_contacts,
  COALESCE(conv_stats.total_conversations, 0) as total_conversations,
  COALESCE(conv_stats.active_conversations, 0) as active_conversations,
  COALESCE(msg_stats.total_messages, 0) as total_messages,
  COALESCE(msg_stats.inbound_messages, 0) as inbound_messages,
  COALESCE(msg_stats.outbound_messages, 0) as outbound_messages,
  COALESCE(intent_stats.total_booking_intents, 0) as total_booking_intents,
  COALESCE(intent_stats.completed_booking_intents, 0) as completed_booking_intents,
  COALESCE(booking_stats.bookings_via_whatsapp, 0) as bookings_via_whatsapp,
  CASE 
    WHEN COALESCE(intent_stats.total_booking_intents, 0) > 0 
    THEN (COALESCE(intent_stats.completed_booking_intents, 0)::float / intent_stats.total_booking_intents * 100)
    ELSE 0 
  END as booking_intent_conversion_rate,
  CASE 
    WHEN COALESCE(conv_stats.total_conversations, 0) > 0 
    THEN (COALESCE(booking_stats.bookings_via_whatsapp, 0)::float / conv_stats.total_conversations * 100)
    ELSE 0 
  END as conversation_to_booking_rate,
  COALESCE(response_stats.avg_response_time_minutes, 0) as avg_response_time_minutes
FROM public.calendars c
LEFT JOIN (
  SELECT 
    wc.calendar_id,
    COUNT(DISTINCT cont.id) as total_contacts
  FROM public.whatsapp_conversations wc
  JOIN public.whatsapp_contacts cont ON wc.contact_id = cont.id
  GROUP BY wc.calendar_id
) contact_stats ON c.id = contact_stats.calendar_id
LEFT JOIN (
  SELECT 
    calendar_id,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE status = 'active') as active_conversations
  FROM public.whatsapp_conversations
  GROUP BY calendar_id
) conv_stats ON c.id = conv_stats.calendar_id
LEFT JOIN (
  SELECT 
    wc.calendar_id,
    COUNT(wm.*) as total_messages,
    COUNT(wm.*) FILTER (WHERE wm.direction = 'inbound') as inbound_messages,
    COUNT(wm.*) FILTER (WHERE wm.direction = 'outbound') as outbound_messages
  FROM public.whatsapp_messages wm
  JOIN public.whatsapp_conversations wc ON wm.conversation_id = wc.id
  GROUP BY wc.calendar_id
) msg_stats ON c.id = msg_stats.calendar_id
LEFT JOIN (
  SELECT 
    wc.calendar_id,
    COUNT(bi.*) as total_booking_intents,
    COUNT(bi.*) FILTER (WHERE bi.status = 'completed') as completed_booking_intents
  FROM public.booking_intents bi
  JOIN public.whatsapp_conversations wc ON bi.conversation_id = wc.id
  GROUP BY wc.calendar_id
) intent_stats ON c.id = intent_stats.calendar_id
LEFT JOIN (
  SELECT 
    calendar_id,
    COUNT(*) as bookings_via_whatsapp
  FROM public.bookings
  WHERE customer_phone IS NOT NULL
  GROUP BY calendar_id
) booking_stats ON c.id = booking_stats.calendar_id
LEFT JOIN (
  SELECT 
    wc.calendar_id,
    AVG(
      EXTRACT(EPOCH FROM (
        SELECT MIN(m2.created_at) 
        FROM public.whatsapp_messages m2 
        WHERE m2.conversation_id = m1.conversation_id 
          AND m2.direction = 'outbound' 
          AND m2.created_at > m1.created_at
      ) - m1.created_at) / 60
    ) as avg_response_time_minutes
  FROM public.whatsapp_messages m1
  JOIN public.whatsapp_conversations wc ON m1.conversation_id = wc.id
  WHERE m1.direction = 'inbound'
  GROUP BY wc.calendar_id
) response_stats ON c.id = response_stats.calendar_id
WHERE c.is_active = true;

-- Drop and recreate whatsapp_message_volume view with SECURITY INVOKER
DROP VIEW IF EXISTS public.whatsapp_message_volume;
CREATE VIEW public.whatsapp_message_volume
WITH (security_invoker = on) AS
SELECT 
  wc.calendar_id,
  DATE(wm.created_at) as message_date,
  EXTRACT(HOUR FROM wm.created_at) as message_hour,
  COUNT(*) as message_count,
  COUNT(*) FILTER (WHERE wm.direction = 'inbound') as inbound_count,
  COUNT(*) FILTER (WHERE wm.direction = 'outbound') as outbound_count
FROM public.whatsapp_messages wm
JOIN public.whatsapp_conversations wc ON wm.conversation_id = wc.id
JOIN public.calendars c ON wc.calendar_id = c.id
WHERE c.is_active = true
GROUP BY wc.calendar_id, DATE(wm.created_at), EXTRACT(HOUR FROM wm.created_at)
ORDER BY wc.calendar_id, message_date DESC, message_hour;

-- Drop and recreate whatsapp_conversation_topics view with SECURITY INVOKER
DROP VIEW IF EXISTS public.whatsapp_conversation_topics;
CREATE VIEW public.whatsapp_conversation_topics
WITH (security_invoker = on) AS
SELECT 
  wc.calendar_id,
  CASE 
    WHEN wc.context->>'topic' = 'booking' THEN 'booking_request'
    WHEN wc.context->>'topic' = 'availability' THEN 'availability_check'
    WHEN wc.context->>'topic' = 'cancellation' THEN 'cancellation'
    WHEN wc.context->>'topic' = 'information' THEN 'information_request'
    ELSE 'other'
  END as topic_category,
  COUNT(*) as conversation_count
FROM public.whatsapp_conversations wc
JOIN public.calendars c ON wc.calendar_id = c.id
WHERE c.is_active = true
GROUP BY wc.calendar_id, topic_category
ORDER BY wc.calendar_id, conversation_count DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.whatsapp_analytics TO authenticated;
GRANT SELECT ON public.whatsapp_message_volume TO authenticated;
GRANT SELECT ON public.whatsapp_conversation_topics TO authenticated;
