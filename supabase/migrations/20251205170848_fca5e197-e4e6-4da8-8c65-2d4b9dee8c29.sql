-- Grant SELECT permissions on WhatsApp analytics views to authenticated users
GRANT SELECT ON whatsapp_analytics TO authenticated;
GRANT SELECT ON whatsapp_message_volume TO authenticated;
GRANT SELECT ON whatsapp_conversation_topics TO authenticated;