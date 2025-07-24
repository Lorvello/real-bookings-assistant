-- =====================================================
-- CRITICAL SECURITY FIXES - Phase 1d: Final Remaining Functions
-- =====================================================

-- Fix all remaining database functions with search path issues

CREATE OR REPLACE FUNCTION public.trigger_whatsapp_overview_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Schedule refresh in background to avoid blocking the transaction
  PERFORM pg_notify('refresh_whatsapp_overview', 'refresh_needed');
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_existing_whatsapp_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.find_orphaned_whatsapp_conversations()
RETURNS TABLE(conversation_id uuid, contact_phone text, contact_name text, message_count bigint, last_activity timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.process_whatsapp_message(p_phone_number text, p_message_id text, p_message_content text, p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.refresh_business_availability_overview()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Try concurrent refresh first, fallback to regular refresh if it fails
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.business_availability_overview;
  EXCEPTION
    WHEN OTHERS THEN
      -- If concurrent refresh fails, do a regular refresh
      REFRESH MATERIALIZED VIEW public.business_availability_overview;
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_business_available_slots(p_calendar_slug text, p_service_type_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT CURRENT_DATE, p_days integer DEFAULT 14)
RETURNS TABLE(business_name text, calendar_name text, service_name text, slot_date date, slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean, service_price numeric, service_duration integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_end_date date;
BEGIN
  -- Get calendar ID from slug
  SELECT calendar_id INTO v_calendar_id
  FROM public.business_availability_overview
  WHERE calendar_slug = p_calendar_slug
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    RETURN;
  END IF;
  
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Return available slots with business context
  RETURN QUERY
  SELECT 
    bao.business_name,
    bao.calendar_name,
    bao.service_name,
    slots.slot_date::date,
    slots.slot_start,
    slots.slot_end,
    slots.is_available,
    bao.service_price,
    bao.service_duration
  FROM public.business_availability_overview bao
  CROSS JOIN LATERAL public.get_available_slots_range(
    bao.calendar_id,
    bao.service_type_id,
    p_start_date,
    v_end_date
  ) as slots
  WHERE bao.calendar_slug = p_calendar_slug
    AND bao.service_active = true
    AND (p_service_type_id IS NULL OR bao.service_type_id = p_service_type_id)
  ORDER BY slots.slot_date, slots.slot_start, bao.service_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_business_overview_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Schedule refresh in background to avoid blocking the transaction
  PERFORM pg_notify('refresh_business_overview', 'refresh_needed');
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(p_user_id uuid, p_subscription_status text DEFAULT NULL::text, p_subscription_tier text DEFAULT NULL::text, p_trial_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_subscription_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_updated_user RECORD;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Update user subscription details
  UPDATE public.users 
  SET 
    subscription_status = COALESCE(p_subscription_status::text, subscription_status),
    subscription_tier = COALESCE(p_subscription_tier::public.subscription_tier, subscription_tier),
    trial_end_date = COALESCE(p_trial_end_date, trial_end_date),
    subscription_end_date = COALESCE(p_subscription_end_date, subscription_end_date),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_updated_user;
  
  RETURN jsonb_build_object(
    'success', true,
    'user', row_to_json(v_updated_user),
    'message', 'User subscription updated successfully'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_extend_trial(p_user_id uuid, p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.users 
  SET 
    trial_end_date = GREATEST(trial_end_date, NOW()) + (p_days || ' days')::interval,
    subscription_status = 'trial',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trial extended by ' || p_days || ' days'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_subscription_details(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user RECORD;
  v_tier RECORD;
  v_status TEXT;
BEGIN
  -- Get user details
  SELECT * INTO v_user
  FROM public.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get tier details if user has a tier
  IF v_user.subscription_tier IS NOT NULL THEN
    SELECT * INTO v_tier
    FROM public.subscription_tiers 
    WHERE tier_name = v_user.subscription_tier;
  END IF;
  
  -- Calculate current status
  SELECT 
    CASE 
      WHEN v_user.subscription_status = 'trial' AND v_user.trial_end_date > NOW() THEN 'active_trial'
      WHEN v_user.subscription_status = 'trial' AND v_user.trial_end_date <= NOW() THEN 'expired_trial'  
      WHEN v_user.subscription_status = 'active' THEN 'subscriber'
      WHEN v_user.subscription_status = 'canceled' AND v_user.subscription_end_date > NOW() THEN 'canceled_active'
      ELSE 'expired'
    END INTO v_status;
  
  RETURN jsonb_build_object(
    'success', true,
    'user', row_to_json(v_user),
    'tier', row_to_json(v_tier),
    'current_status', v_status,
    'days_remaining', 
      CASE 
        WHEN v_user.subscription_status = 'trial' THEN 
          GREATEST(0, EXTRACT(DAYS FROM (v_user.trial_end_date - NOW())))
        WHEN v_user.subscription_status = 'canceled' THEN 
          GREATEST(0, EXTRACT(DAYS FROM (v_user.subscription_end_date - NOW())))
        ELSE 0
      END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_whatsapp_templates(p_calendar_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
     '[{"text": "Deze week", "payload": "this_week"}, {"text": "Volgende week", "payload": "next_week"}]'::jsonb)
  ON CONFLICT (calendar_id, template_key) DO NOTHING;
END;
$function$;