
-- WhatsApp Templates tabel
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  template_key text NOT NULL, -- 'welcome', 'booking_confirm', 'reminder'
  language text DEFAULT 'nl',
  content text NOT NULL,
  variables text[], -- placeholders zoals {{name}}, {{date}}
  quick_replies jsonb, -- voorgedefinieerde antwoord opties
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(calendar_id, template_key, language)
);

-- Quick Reply Flows tabel
CREATE TABLE public.quick_reply_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  flow_name text NOT NULL,
  trigger_keywords text[], -- woorden die deze flow activeren
  flow_data jsonb NOT NULL, -- beslisboom structuur
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes voor performance
CREATE INDEX idx_whatsapp_templates_calendar ON whatsapp_templates(calendar_id);
CREATE INDEX idx_whatsapp_templates_key ON whatsapp_templates(template_key);
CREATE INDEX idx_whatsapp_templates_active ON whatsapp_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_quick_reply_flows_calendar ON quick_reply_flows(calendar_id);
CREATE INDEX idx_quick_reply_flows_active ON quick_reply_flows(is_active) WHERE is_active = true;

-- Triggers voor updated_at
CREATE TRIGGER handle_whatsapp_templates_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_quick_reply_flows_updated_at
  BEFORE UPDATE ON public.quick_reply_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_reply_flows ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor whatsapp_templates
CREATE POLICY "Calendar owners can manage templates"
  ON public.whatsapp_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars c
      WHERE c.id = whatsapp_templates.calendar_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policies voor quick_reply_flows
CREATE POLICY "Calendar owners can manage quick reply flows"
  ON public.quick_reply_flows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars c
      WHERE c.id = quick_reply_flows.calendar_id
      AND c.user_id = auth.uid()
    )
  );

-- Functie om standaard templates aan te maken voor nieuwe kalenders
CREATE OR REPLACE FUNCTION public.create_default_whatsapp_templates(p_calendar_id uuid)
RETURNS void AS $$
BEGIN
  -- Insert standaard templates
  INSERT INTO public.whatsapp_templates (calendar_id, template_key, content, variables, quick_replies) VALUES
    (p_calendar_id, 'welcome', 'Hallo {{name}}! Welkom bij {{business_name}}. Waarmee kan ik u helpen?', 
     ARRAY['name', 'business_name'],
     '[{"text": "Afspraak maken", "payload": "book_appointment"}, {"text": "Beschikbaarheid", "payload": "check_availability"}]'::jsonb),
    
    (p_calendar_id, 'booking_confirm', 'Uw afspraak voor {{service}} op {{date}} om {{time}} is bevestigd! Tot dan!', 
     ARRAY['service', 'date', 'time'],
     '[{"text": "Wijzigen", "payload": "modify_booking"}, {"text": "Annuleren", "payload": "cancel_booking"}]'::jsonb),
    
    (p_calendar_id, 'reminder', 'Herinnering: U heeft morgen om {{time}} een afspraak voor {{service}}. Tot dan!', 
     ARRAY['time', 'service'],
     '[{"text": "Bevestigen", "payload": "confirm_reminder"}, {"text": "Wijzigen", "payload": "modify_booking"}]'::jsonb),
    
    (p_calendar_id, 'booking_request', 'Ik begrijp dat u een afspraak wilt maken. Voor welke service heeft u interesse?',
     ARRAY[],
     NULL),
    
    (p_calendar_id, 'availability_check', 'Ik ga voor u kijken naar beschikbare tijden. Voor welke datum heeft u voorkeur?',
     ARRAY[],
     '[{"text": "Deze week", "payload": "this_week"}, {"text": "Volgende week", "payload": "next_week"}, {"text": "Specifieke datum", "payload": "specific_date"}]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om template content te renderen met variabelen
CREATE OR REPLACE FUNCTION public.render_whatsapp_template(
  p_calendar_id uuid,
  p_template_key text,
  p_variables jsonb DEFAULT '{}'::jsonb,
  p_language text DEFAULT 'nl'
) RETURNS jsonb AS $$
DECLARE
  v_template record;
  v_content text;
  v_variable text;
  v_value text;
BEGIN
  -- Haal template op
  SELECT * INTO v_template
  FROM public.whatsapp_templates
  WHERE calendar_id = p_calendar_id
  AND template_key = p_template_key
  AND language = p_language
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Template not found'
    );
  END IF;
  
  v_content := v_template.content;
  
  -- Vervang variabelen in content
  IF v_template.variables IS NOT NULL THEN
    FOREACH v_variable IN ARRAY v_template.variables
    LOOP
      v_value := p_variables ->> v_variable;
      IF v_value IS NOT NULL THEN
        v_content := REPLACE(v_content, '{{' || v_variable || '}}', v_value);
      END IF;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'content', v_content,
    'quick_replies', v_template.quick_replies,
    'template_key', v_template.template_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om quick reply flows te matchen
CREATE OR REPLACE FUNCTION public.match_quick_reply_flow(
  p_calendar_id uuid,
  p_message_text text
) RETURNS jsonb AS $$
DECLARE
  v_flow record;
  v_keyword text;
  v_message_lower text;
BEGIN
  v_message_lower := LOWER(TRIM(p_message_text));
  
  -- Zoek naar matching flows
  FOR v_flow IN 
    SELECT * FROM public.quick_reply_flows
    WHERE calendar_id = p_calendar_id
    AND is_active = true
    ORDER BY created_at DESC
  LOOP
    -- Check of een van de trigger keywords match
    FOREACH v_keyword IN ARRAY v_flow.trigger_keywords
    LOOP
      IF v_message_lower LIKE '%' || LOWER(v_keyword) || '%' THEN
        RETURN jsonb_build_object(
          'success', true,
          'flow_id', v_flow.id,
          'flow_name', v_flow.flow_name,
          'flow_data', v_flow.flow_data,
          'matched_keyword', v_keyword
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', false,
    'message', 'No matching flow found'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
