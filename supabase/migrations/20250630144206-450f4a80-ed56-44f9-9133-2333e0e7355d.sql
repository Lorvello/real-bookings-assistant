
-- Functie om calendar_id automatisch te koppelen aan WhatsApp conversations bij nieuwe bookings
CREATE OR REPLACE FUNCTION public.link_whatsapp_conversation_to_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id uuid;
  v_conversation_id uuid;
BEGIN
  -- Alleen uitvoeren als customer_phone aanwezig is
  IF NEW.customer_phone IS NOT NULL AND NEW.calendar_id IS NOT NULL THEN
    
    -- Zoek het contact op basis van telefoonnummer
    SELECT id INTO v_contact_id
    FROM public.whatsapp_contacts
    WHERE phone_number = NEW.customer_phone;
    
    -- Als contact gevonden, update de conversation met calendar_id
    IF v_contact_id IS NOT NULL THEN
      UPDATE public.whatsapp_conversations 
      SET calendar_id = NEW.calendar_id,
          last_message_at = COALESCE(last_message_at, NOW())
      WHERE contact_id = v_contact_id 
        AND calendar_id IS NULL;
      
      -- Log voor debugging
      INSERT INTO public.webhook_events (calendar_id, event_type, payload)
      VALUES (
        NEW.calendar_id,
        'whatsapp.conversation.linked',
        jsonb_build_object(
          'booking_id', NEW.id,
          'contact_phone', NEW.customer_phone,
          'contact_id', v_contact_id,
          'linked_at', NOW()
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger aanmaken voor nieuwe bookings
DROP TRIGGER IF EXISTS link_whatsapp_conversation_trigger ON public.bookings;
CREATE TRIGGER link_whatsapp_conversation_trigger
  AFTER INSERT ON public.bookings
  FOR EACH ROW 
  EXECUTE FUNCTION public.link_whatsapp_conversation_to_booking();

-- Functie voor het handmatig koppelen van bestaande data
CREATE OR REPLACE FUNCTION public.link_existing_whatsapp_conversations()
RETURNS void AS $$
DECLARE
  booking_record record;
  v_contact_id uuid;
  v_updated_count integer := 0;
BEGIN
  -- Loop door alle bookings met telefoonnummer
  FOR booking_record IN 
    SELECT DISTINCT calendar_id, customer_phone
    FROM public.bookings 
    WHERE customer_phone IS NOT NULL 
      AND calendar_id IS NOT NULL
  LOOP
    -- Zoek contact
    SELECT id INTO v_contact_id
    FROM public.whatsapp_contacts
    WHERE phone_number = booking_record.customer_phone;
    
    -- Update conversation als contact gevonden
    IF v_contact_id IS NOT NULL THEN
      UPDATE public.whatsapp_conversations 
      SET calendar_id = booking_record.calendar_id
      WHERE contact_id = v_contact_id 
        AND calendar_id IS NULL;
      
      GET DIAGNOSTICS v_updated_count = ROW_COUNT;
      
      -- Log update
      IF v_updated_count > 0 THEN
        INSERT INTO public.webhook_events (calendar_id, event_type, payload)
        VALUES (
          booking_record.calendar_id,
          'whatsapp.conversation.bulk_linked',
          jsonb_build_object(
            'contact_phone', booking_record.customer_phone,
            'contact_id', v_contact_id,
            'updated_conversations', v_updated_count,
            'linked_at', NOW()
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om orphaned conversations te vinden
CREATE OR REPLACE FUNCTION public.find_orphaned_whatsapp_conversations()
RETURNS TABLE(
  conversation_id uuid,
  contact_phone text,
  contact_name text,
  message_count bigint,
  last_activity timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wc.id as conversation_id,
    wco.phone_number as contact_phone,
    COALESCE(wco.display_name, wco.first_name || ' ' || wco.last_name) as contact_name,
    (SELECT COUNT(*) FROM public.whatsapp_messages wm WHERE wm.conversation_id = wc.id) as message_count,
    wc.last_message_at as last_activity
  FROM public.whatsapp_conversations wc
  JOIN public.whatsapp_contacts wco ON wc.contact_id = wco.id
  WHERE wc.calendar_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.customer_phone = wco.phone_number
    )
  ORDER BY wc.last_message_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run de link functie voor bestaande data
SELECT public.link_existing_whatsapp_conversations();
