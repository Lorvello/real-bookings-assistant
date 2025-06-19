
-- WhatsApp Contacts tabel voor gebruikers
CREATE TABLE public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL, -- internationaal formaat: +31612345678
  display_name text,
  first_name text,
  last_name text,
  profile_picture_url text,
  linked_customer_email text, -- koppeling naar bookings
  metadata jsonb DEFAULT '{}', -- extra WhatsApp profile data
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index voor snelle phone lookups
CREATE INDEX idx_whatsapp_contacts_phone ON whatsapp_contacts(phone_number);

-- WhatsApp Conversations tabel (gesprekken per kalender)
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  context jsonb DEFAULT '{}', -- bewaar conversatie context voor AI
  last_message_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(calendar_id, contact_id)
);

-- WhatsApp Messages tabel (individuele berichten)
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id text UNIQUE, -- WhatsApp message ID
  direction text CHECK (direction IN ('inbound', 'outbound')),
  message_type text CHECK (message_type IN ('text', 'image', 'audio', 'document', 'location')),
  content text, -- tekst inhoud
  media_url text, -- voor media berichten
  metadata jsonb DEFAULT '{}', -- extra WhatsApp data
  status text DEFAULT 'sent', -- sent, delivered, read, failed
  created_at timestamp with time zone DEFAULT now()
);

-- Index voor conversation history
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id, created_at);

-- Trigger voor updated_at op whatsapp_contacts
CREATE TRIGGER handle_whatsapp_contacts_updated_at
  BEFORE UPDATE ON public.whatsapp_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security policies
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policies voor whatsapp_contacts - alleen calendar owners kunnen hun contacten beheren
CREATE POLICY "Calendar owners can manage whatsapp contacts"
  ON public.whatsapp_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations wc
      JOIN public.calendars c ON c.id = wc.calendar_id
      WHERE wc.contact_id = whatsapp_contacts.id
      AND c.user_id = auth.uid()
    )
  );

-- Policies voor whatsapp_conversations - alleen calendar owners
CREATE POLICY "Calendar owners can manage conversations"
  ON public.whatsapp_conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars c
      WHERE c.id = whatsapp_conversations.calendar_id
      AND c.user_id = auth.uid()
    )
  );

-- Policies voor whatsapp_messages - via conversation toegang
CREATE POLICY "Calendar owners can manage messages"
  ON public.whatsapp_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations wc
      JOIN public.calendars c ON c.id = wc.calendar_id
      WHERE wc.id = whatsapp_messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );
