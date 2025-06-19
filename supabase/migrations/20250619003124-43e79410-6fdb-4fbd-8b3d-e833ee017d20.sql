
-- Conversation Context tabel (AI memory)
CREATE TABLE public.conversation_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  context_type text NOT NULL, -- 'booking_intent', 'service_preference', 'availability_discussed'
  context_data jsonb NOT NULL,
  expires_at timestamp with time zone, -- voor tijdelijke context
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Booking Intents tabel (booking pogingen via WhatsApp)
CREATE TABLE public.booking_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.whatsapp_conversations(id),
  service_type_id uuid REFERENCES public.service_types(id),
  preferred_date date,
  preferred_time_slot text, -- 'morning', 'afternoon', 'specific: 14:00'
  status text DEFAULT 'collecting_info' CHECK (status IN ('collecting_info', 'ready_to_book', 'booked', 'abandoned')),
  collected_data jsonb DEFAULT '{}', -- stapsgewijs verzamelde info
  booking_id uuid REFERENCES public.bookings(id), -- als succesvol geboekt
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes voor performance
CREATE INDEX idx_conversation_context_conversation ON conversation_context(conversation_id);
CREATE INDEX idx_conversation_context_type ON conversation_context(context_type);
CREATE INDEX idx_conversation_context_expires ON conversation_context(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_booking_intents_conversation ON booking_intents(conversation_id);
CREATE INDEX idx_booking_intents_status ON booking_intents(status);

-- Triggers voor updated_at
CREATE TRIGGER handle_conversation_context_updated_at
  BEFORE UPDATE ON public.conversation_context
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_booking_intents_updated_at
  BEFORE UPDATE ON public.booking_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security
ALTER TABLE public.conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_intents ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor conversation_context
CREATE POLICY "Calendar owners can manage conversation context"
  ON public.conversation_context
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations wc
      JOIN public.calendars c ON c.id = wc.calendar_id
      WHERE wc.id = conversation_context.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policies voor booking_intents
CREATE POLICY "Calendar owners can manage booking intents"
  ON public.booking_intents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_conversations wc
      JOIN public.calendars c ON c.id = wc.calendar_id
      WHERE wc.id = booking_intents.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Helper functie voor context retrieval
CREATE OR REPLACE FUNCTION public.get_conversation_context(
  p_phone_number text,
  p_calendar_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Haal alle relevante context op voor een gesprek
  SELECT jsonb_build_object(
    'contact', row_to_json(wc.*),
    'conversation', row_to_json(conv.*),
    'recent_messages', (
      SELECT jsonb_agg(row_to_json(m.*) ORDER BY m.created_at DESC)
      FROM whatsapp_messages m
      WHERE m.conversation_id = conv.id
      LIMIT 10
    ),
    'active_booking_intent', (
      SELECT row_to_json(bi.*)
      FROM booking_intents bi
      WHERE bi.conversation_id = conv.id
      AND bi.status = 'collecting_info'
      ORDER BY bi.created_at DESC
      LIMIT 1
    ),
    'context_history', (
      SELECT jsonb_agg(row_to_json(cc.*) ORDER BY cc.created_at DESC)
      FROM conversation_context cc
      WHERE cc.conversation_id = conv.id
      AND (cc.expires_at IS NULL OR cc.expires_at > NOW())
      LIMIT 20
    ),
    'previous_bookings', (
      SELECT jsonb_agg(row_to_json(b.*))
      FROM bookings b
      WHERE b.customer_phone = p_phone_number
      AND b.calendar_id = p_calendar_id
      ORDER BY b.created_at DESC
      LIMIT 5
    )
  ) INTO v_result
  FROM whatsapp_contacts wc
  LEFT JOIN whatsapp_conversations conv ON conv.contact_id = wc.id AND conv.calendar_id = p_calendar_id
  WHERE wc.phone_number = p_phone_number;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om verlopen context op te ruimen
CREATE OR REPLACE FUNCTION public.cleanup_expired_context()
RETURNS void AS $$
BEGIN
  DELETE FROM public.conversation_context
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
