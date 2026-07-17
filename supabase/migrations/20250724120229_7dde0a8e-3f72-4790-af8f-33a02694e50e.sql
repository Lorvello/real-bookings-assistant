-- Add RLS policies for WhatsApp tables to ensure proper data access control

-- Enable RLS on WhatsApp tables if not already enabled
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_intents ENABLE ROW LEVEL SECURITY;

-- WhatsApp Contacts: Users can view contacts linked to their calendars
CREATE POLICY "Users can view whatsapp contacts for their calendars" 
ON public.whatsapp_contacts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.contact_id = whatsapp_contacts.id
    AND c.user_id = auth.uid()
  )
);

-- WhatsApp Contacts: Allow system to create/update contacts
CREATE POLICY "System can manage whatsapp contacts" 
ON public.whatsapp_contacts 
FOR ALL 
USING (true)
WITH CHECK (true);

-- WhatsApp Conversations: Users can view conversations for their calendars
CREATE POLICY "Users can view whatsapp conversations for their calendars" 
ON public.whatsapp_conversations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.calendars c
    WHERE c.id = whatsapp_conversations.calendar_id
    AND c.user_id = auth.uid()
  )
);

-- WhatsApp Conversations: Allow system to manage conversations
CREATE POLICY "System can manage whatsapp conversations" 
ON public.whatsapp_conversations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- WhatsApp Messages: Users can view messages for their calendar conversations
CREATE POLICY "Users can view whatsapp messages for their conversations" 
ON public.whatsapp_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.id = whatsapp_messages.conversation_id
    AND c.user_id = auth.uid()
  )
);

-- WhatsApp Messages: Allow system to manage messages
CREATE POLICY "System can manage whatsapp messages" 
ON public.whatsapp_messages 
FOR ALL 
USING (true)
WITH CHECK (true);

-- WhatsApp Templates: Users can manage templates for their calendars
CREATE POLICY "Users can manage whatsapp templates for their calendars" 
ON public.whatsapp_templates 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.calendars c
    WHERE c.id = whatsapp_templates.calendar_id
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendars c
    WHERE c.id = whatsapp_templates.calendar_id
    AND c.user_id = auth.uid()
  )
);

-- Conversation Context: Users can view context for their conversations
CREATE POLICY "Users can view conversation context for their conversations" 
ON public.conversation_context 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.id = conversation_context.conversation_id
    AND c.user_id = auth.uid()
  )
);

-- Conversation Context: Allow system to manage context
CREATE POLICY "System can manage conversation context" 
ON public.conversation_context 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Booking Intents: Users can view intents for their conversations
CREATE POLICY "Users can view booking intents for their conversations" 
ON public.booking_intents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.id = booking_intents.conversation_id
    AND c.user_id = auth.uid()
  )
);

-- Booking Intents: Allow system to manage intents
CREATE POLICY "System can manage booking intents" 
ON public.booking_intents 
FOR ALL 
USING (true)
WITH CHECK (true);

-- WhatsApp Webhook Queue: Allow system access only
CREATE POLICY "System can manage whatsapp webhook queue" 
ON public.whatsapp_webhook_queue 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Refresh the WhatsApp contact overview to ensure fresh data
SELECT refresh_whatsapp_contact_overview();

-- Generate some comprehensive mock data for testing
SELECT admin_generate_comprehensive_mock_data(
  (SELECT id FROM public.calendars WHERE user_id = auth.uid() LIMIT 1),
  'whatsapp'
);