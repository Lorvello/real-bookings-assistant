-- Function to check WhatsApp contact limits for a user
CREATE OR REPLACE FUNCTION public.check_whatsapp_contact_limit(p_user_id uuid, p_calendar_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count integer;
  v_max_contacts integer;
  v_subscription_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get max contacts based on subscription tier
  SELECT max_whatsapp_contacts INTO v_max_contacts
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::subscription_tier;
  
  -- If unlimited (null), return true
  IF v_max_contacts IS NULL THEN
    RETURN true;
  END IF;
  
  -- Count current WhatsApp contacts for this user's calendars
  SELECT COUNT(DISTINCT wc.id) INTO v_current_count
  FROM public.whatsapp_contacts wc
  JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
  JOIN public.calendars cal ON conv.calendar_id = cal.id
  WHERE cal.user_id = p_user_id;
  
  -- Return true if under limit
  RETURN v_current_count < v_max_contacts;
END;
$$;

-- Update the process_whatsapp_message function to check limits
CREATE OR REPLACE FUNCTION public.process_whatsapp_message(p_phone_number text, p_message_id text, p_message_content text, p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_contact_id uuid;
  v_conversation_id uuid;
  v_response jsonb;
  v_calendar_owner uuid;
  v_limit_check boolean;
BEGIN
  -- Get calendar owner
  SELECT user_id INTO v_calendar_owner
  FROM public.calendars
  WHERE id = p_calendar_id;
  
  -- Check if contact already exists
  SELECT id INTO v_contact_id
  FROM public.whatsapp_contacts
  WHERE phone_number = p_phone_number;
  
  -- If contact doesn't exist, check limits
  IF v_contact_id IS NULL THEN
    SELECT public.check_whatsapp_contact_limit(v_calendar_owner, p_calendar_id) INTO v_limit_check;
    
    IF NOT v_limit_check THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'WhatsApp contact limit reached for this subscription tier',
        'error_code', 'CONTACT_LIMIT_REACHED'
      );
    END IF;
  END IF;
  
  -- Create or update contact
  INSERT INTO public.whatsapp_contacts (phone_number)
  VALUES (p_phone_number)
  ON CONFLICT (phone_number) 
  DO UPDATE SET last_seen_at = now()
  RETURNING id INTO v_contact_id;
  
  -- Create or find conversation
  INSERT INTO public.whatsapp_conversations (calendar_id, contact_id)
  VALUES (p_calendar_id, v_contact_id)
  ON CONFLICT (calendar_id, contact_id)
  DO UPDATE SET last_message_at = now()
  RETURNING id INTO v_conversation_id;
  
  -- Save message
  INSERT INTO public.whatsapp_messages (
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
  
  -- Trigger webhook for n8n processing
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    p_calendar_id,
    'whatsapp.message.received',
    jsonb_build_object(
      'contact_id', v_contact_id,
      'conversation_id', v_conversation_id,
      'phone_number', p_phone_number,
      'message', p_message_content,
      'context', public.get_conversation_context(p_phone_number, p_calendar_id)
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', v_conversation_id
  );
END;
$$;