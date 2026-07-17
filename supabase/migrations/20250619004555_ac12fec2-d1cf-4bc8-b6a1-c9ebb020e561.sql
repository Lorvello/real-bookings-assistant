
-- WhatsApp Webhook Queue tabel voor het verwerken van inkomende webhooks
CREATE TABLE public.whatsapp_webhook_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL, -- 'message', 'status', 'contact_update'
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamp with time zone,
  error text,
  retry_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Index voor performance bij het ophalen van unprocessed webhooks
CREATE INDEX idx_whatsapp_webhook_queue_processed ON whatsapp_webhook_queue(processed, created_at);
CREATE INDEX idx_whatsapp_webhook_queue_type ON whatsapp_webhook_queue(webhook_type);

-- Row Level Security
ALTER TABLE public.whatsapp_webhook_queue ENABLE ROW LEVEL SECURITY;

-- Policy - alleen systeem kan webhooks verwerken
CREATE POLICY "System can manage webhook queue"
  ON public.whatsapp_webhook_queue
  FOR ALL
  USING (true);

-- Functie voor het verwerken van WhatsApp berichten
CREATE OR REPLACE FUNCTION public.process_whatsapp_message(
  p_phone_number text,
  p_message_id text,
  p_message_content text,
  p_calendar_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_contact_id uuid;
  v_conversation_id uuid;
  v_response jsonb;
BEGIN
  -- Maak of vind contact
  INSERT INTO whatsapp_contacts (phone_number)
  VALUES (p_phone_number)
  ON CONFLICT (phone_number) 
  DO UPDATE SET last_seen_at = now()
  RETURNING id INTO v_contact_id;
  
  -- Maak of vind conversation
  INSERT INTO whatsapp_conversations (calendar_id, contact_id)
  VALUES (p_calendar_id, v_contact_id)
  ON CONFLICT (calendar_id, contact_id)
  DO UPDATE SET last_message_at = now()
  RETURNING id INTO v_conversation_id;
  
  -- Sla message op
  INSERT INTO whatsapp_messages (
    conversation_id, 
    message_id, 
    direction, 
    message_type, 
    content
  ) VALUES (
    v_conversation_id,
    p_message_id,
    'inbound',
    'text',
    p_message_content
  );
  
  -- Trigger webhook voor n8n processing
  INSERT INTO webhook_events (calendar_id, event_type, payload)
  VALUES (
    p_calendar_id,
    'whatsapp.message.received',
    jsonb_build_object(
      'contact_id', v_contact_id,
      'conversation_id', v_conversation_id,
      'phone_number', p_phone_number,
      'message', p_message_content,
      'context', get_conversation_context(p_phone_number, p_calendar_id)
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', v_conversation_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie voor het verwerken van de webhook queue
CREATE OR REPLACE FUNCTION public.process_whatsapp_webhook_queue()
RETURNS void AS $$
DECLARE
  webhook_record record;
  max_retries integer := 3;
BEGIN
  -- Verwerk unprocessed webhooks
  FOR webhook_record IN 
    SELECT * FROM whatsapp_webhook_queue 
    WHERE processed = false 
      AND retry_count < max_retries
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Afhankelijk van webhook type, roep juiste processing functie aan
      CASE webhook_record.webhook_type
        WHEN 'message' THEN
          -- Verwerk bericht via process_whatsapp_message functie
          -- Dit zou normaal gesproken door een externe service gedaan worden
          NULL;
        WHEN 'status' THEN
          -- Verwerk status update
          NULL;
        WHEN 'contact_update' THEN
          -- Verwerk contact update
          NULL;
        ELSE
          -- Onbekend type
          NULL;
      END CASE;
      
      -- Markeer als verwerkt
      UPDATE whatsapp_webhook_queue 
      SET processed = true, 
          processed_at = now(),
          error = null
      WHERE id = webhook_record.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Update retry count en error
        UPDATE whatsapp_webhook_queue 
        SET retry_count = retry_count + 1,
            error = SQLERRM
        WHERE id = webhook_record.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger functie voor automatische webhook queue processing
CREATE OR REPLACE FUNCTION public.handle_new_whatsapp_webhook()
RETURNS trigger AS $$
BEGIN
  -- Notificeer systeem van nieuwe webhook
  PERFORM pg_notify('whatsapp_webhook', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger voor nieuwe webhooks
CREATE TRIGGER on_whatsapp_webhook_inserted
  AFTER INSERT ON public.whatsapp_webhook_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_whatsapp_webhook();
