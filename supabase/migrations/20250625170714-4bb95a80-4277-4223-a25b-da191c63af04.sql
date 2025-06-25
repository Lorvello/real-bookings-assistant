
-- Complete Security Fix for All Remaining Warnings (Corrected Version)
-- This fixes ~22 remaining security warnings (excluding auth config)

-- 1. Fix all remaining SECURITY DEFINER functions with search_path
CREATE OR REPLACE FUNCTION public.create_default_whatsapp_templates(p_calendar_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- 2. Fix render_whatsapp_template function
CREATE OR REPLACE FUNCTION public.render_whatsapp_template(p_template_key text, p_calendar_id uuid, p_variables jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_template record;
  v_content text;
  v_key text;
  v_value text;
BEGIN
  -- Haal template op
  SELECT * INTO v_template
  FROM public.whatsapp_templates
  WHERE template_key = p_template_key 
    AND calendar_id = p_calendar_id
    AND is_active = true;
    
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Template not found');
  END IF;
  
  v_content := v_template.content;
  
  -- Replace variables
  FOR v_key IN SELECT jsonb_object_keys(p_variables)
  LOOP
    v_value := p_variables ->> v_key;
    v_content := replace(v_content, '{{' || v_key || '}}', v_value);
  END LOOP;
  
  RETURN jsonb_build_object(
    'content', v_content,
    'quick_replies', v_template.quick_replies
  );
END;
$function$;

-- 3. Fix match_quick_reply_flow function
CREATE OR REPLACE FUNCTION public.match_quick_reply_flow(p_message text, p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_flow record;
  v_keyword text;
BEGIN
  -- Zoek naar matching flow gebaseerd op keywords
  FOR v_flow IN 
    SELECT * FROM public.quick_reply_flows 
    WHERE calendar_id = p_calendar_id 
      AND is_active = true
  LOOP
    -- Check elk keyword
    IF v_flow.trigger_keywords IS NOT NULL THEN
      FOREACH v_keyword IN ARRAY v_flow.trigger_keywords
      LOOP
        IF LOWER(p_message) LIKE '%' || LOWER(v_keyword) || '%' THEN
          RETURN jsonb_build_object(
            'flow_id', v_flow.id,
            'flow_name', v_flow.flow_name,
            'flow_data', v_flow.flow_data
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$function$;

-- 4. Fix process_whatsapp_message function
CREATE OR REPLACE FUNCTION public.process_whatsapp_message(p_phone_number text, p_message_id text, p_message_content text, p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_contact_id uuid;
  v_conversation_id uuid;
  v_response jsonb;
BEGIN
  -- Maak of vind contact
  INSERT INTO public.whatsapp_contacts (phone_number)
  VALUES (p_phone_number)
  ON CONFLICT (phone_number) 
  DO UPDATE SET last_seen_at = now()
  RETURNING id INTO v_contact_id;
  
  -- Maak of vind conversation
  INSERT INTO public.whatsapp_conversations (calendar_id, contact_id)
  VALUES (p_calendar_id, v_contact_id)
  ON CONFLICT (calendar_id, contact_id)
  DO UPDATE SET last_message_at = now()
  RETURNING id INTO v_conversation_id;
  
  -- Sla message op
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
  
  -- Trigger webhook voor n8n processing
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

-- 5. Fix process_whatsapp_webhook_queue function
CREATE OR REPLACE FUNCTION public.process_whatsapp_webhook_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  webhook_record record;
  max_retries integer := 3;
BEGIN
  -- Verwerk unprocessed webhooks
  FOR webhook_record IN 
    SELECT * FROM public.whatsapp_webhook_queue 
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
      UPDATE public.whatsapp_webhook_queue 
      SET processed = true, 
          processed_at = now(),
          error = null
      WHERE id = webhook_record.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Update retry count en error
        UPDATE public.whatsapp_webhook_queue 
        SET retry_count = retry_count + 1,
            error = SQLERRM
        WHERE id = webhook_record.id;
    END;
  END LOOP;
END;
$function$;

-- 6. Fix handle_new_whatsapp_webhook function
CREATE OR REPLACE FUNCTION public.handle_new_whatsapp_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Notificeer systeem van nieuwe webhook
  PERFORM pg_notify('whatsapp_webhook', NEW.id::text);
  RETURN NEW;
END;
$function$;

-- 7. Fix cleanup_old_whatsapp_data function
CREATE OR REPLACE FUNCTION public.cleanup_old_whatsapp_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  retention_days integer := 90;
  cutoff_date timestamp with time zone;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::interval;
  
  -- Cleanup old messages
  DELETE FROM public.whatsapp_messages 
  WHERE created_at < cutoff_date;
  
  -- Cleanup old conversation context
  DELETE FROM public.conversation_context 
  WHERE created_at < cutoff_date;
  
  -- Cleanup old webhook queue entries
  DELETE FROM public.whatsapp_webhook_queue 
  WHERE created_at < cutoff_date AND processed = true;
END;
$function$;

-- 8. Fix get_whatsapp_data_retention_days function
CREATE OR REPLACE FUNCTION public.get_whatsapp_data_retention_days(p_calendar_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_retention_days integer := 90;
BEGIN
  -- Voor nu gebruik standaard retention, later uit calendar settings
  RETURN v_retention_days;
END;
$function$;

-- 9. Fix cleanup_whatsapp_data_for_calendar function
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_data_for_calendar(p_calendar_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  retention_days integer;
  cutoff_date timestamp with time zone;
BEGIN
  retention_days := public.get_whatsapp_data_retention_days(p_calendar_id);
  cutoff_date := NOW() - (retention_days || ' days')::interval;
  
  -- Cleanup messages for this calendar
  DELETE FROM public.whatsapp_messages wm
  USING public.whatsapp_conversations wc
  WHERE wm.conversation_id = wc.id
    AND wc.calendar_id = p_calendar_id
    AND wm.created_at < cutoff_date;
    
  -- Cleanup conversation context
  DELETE FROM public.conversation_context cc
  USING public.whatsapp_conversations wc
  WHERE cc.conversation_id = wc.id
    AND wc.calendar_id = p_calendar_id
    AND cc.created_at < cutoff_date;
END;
$function$;

-- 10. Fix export_whatsapp_data function
CREATE OR REPLACE FUNCTION public.export_whatsapp_data(p_calendar_id uuid, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
  v_result jsonb;
BEGIN
  -- Stel datumbereik in
  v_start_date := COALESCE(p_start_date::timestamp with time zone, NOW() - interval '30 days');
  v_end_date := COALESCE(p_end_date::timestamp with time zone, NOW());
  
  -- Export conversatie data
  SELECT jsonb_build_object(
    'conversations', jsonb_agg(
      jsonb_build_object(
        'conversation_id', wc.id,
        'contact_phone', wco.phone_number,
        'contact_name', wco.display_name,
        'messages', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'message_id', wm.message_id,
              'direction', wm.direction,
              'content', wm.content,
              'created_at', wm.created_at
            ) ORDER BY wm.created_at
          )
          FROM public.whatsapp_messages wm
          WHERE wm.conversation_id = wc.id
            AND wm.created_at BETWEEN v_start_date AND v_end_date
        )
      )
    )
  ) INTO v_result
  FROM public.whatsapp_conversations wc
  JOIN public.whatsapp_contacts wco ON wco.id = wc.contact_id
  WHERE wc.calendar_id = p_calendar_id
    AND wc.created_at BETWEEN v_start_date AND v_end_date;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

-- 11. Remove materialized views from API access (fix "Materialized View in API" warnings)
-- These views bypass RLS and should not be accessible via API
REVOKE ALL ON public.calendar_stats FROM anon, authenticated;
REVOKE ALL ON public.service_type_stats FROM anon, authenticated;
REVOKE ALL ON public.dashboard_metrics_mv FROM anon, authenticated;

-- Also revoke from other views that might be exposed
REVOKE ALL ON public.whatsapp_analytics FROM anon, authenticated;
REVOKE ALL ON public.whatsapp_message_volume FROM anon, authenticated;
REVOKE ALL ON public.whatsapp_conversation_topics FROM anon, authenticated;
REVOKE ALL ON public.service_popularity_stats FROM anon, authenticated;
REVOKE ALL ON public.daily_booking_stats FROM anon, authenticated;

-- 12. Fix remaining trigger functions that need search_path
CREATE OR REPLACE FUNCTION public.validate_availability_times()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Valideer dat start_time voor end_time ligt
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  -- Valideer dat tijden binnen een redelijke range liggen (00:00 - 23:59)
  IF NEW.start_time < '00:00'::time OR NEW.start_time > '23:59'::time THEN
    RAISE EXCEPTION 'Start time must be between 00:00 and 23:59';
  END IF;
  
  IF NEW.end_time < '00:00'::time OR NEW.end_time > '23:59'::time THEN
    RAISE EXCEPTION 'End time must be between 00:00 and 23:59';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_dashboard_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Refresh in background (non-blocking)
  PERFORM pg_notify('dashboard_refresh', NEW.calendar_id::text);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_booking_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_settings record;
  v_booking_count integer;
  v_min_booking_time timestamp with time zone;
  v_max_booking_date date;
BEGIN
  -- Haal calendar settings op
  SELECT * INTO v_calendar_settings
  FROM public.calendar_settings
  WHERE calendar_id = NEW.calendar_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calendar settings not found for calendar_id: %', NEW.calendar_id;
  END IF;
  
  -- Check minimum notice tijd
  v_min_booking_time := NOW() + (v_calendar_settings.minimum_notice_hours || ' hours')::interval;
  IF NEW.start_time < v_min_booking_time THEN
    RAISE EXCEPTION 'Booking must be made at least % hours in advance', v_calendar_settings.minimum_notice_hours;
  END IF;
  
  -- Check booking window (niet te ver in de toekomst)
  v_max_booking_date := CURRENT_DATE + (v_calendar_settings.booking_window_days || ' days')::interval;
  IF NEW.start_time::date > v_max_booking_date THEN
    RAISE EXCEPTION 'Booking cannot be made more than % days in advance', v_calendar_settings.booking_window_days;
  END IF;
  
  -- Check max bookings per dag (als ingesteld)
  IF v_calendar_settings.max_bookings_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_booking_count
    FROM public.bookings
    WHERE calendar_id = NEW.calendar_id
      AND DATE(start_time) = DATE(NEW.start_time)
      AND status NOT IN ('cancelled', 'no-show')
      AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND id != NEW.id));
    
    IF v_booking_count >= v_calendar_settings.max_bookings_per_day THEN
      RAISE EXCEPTION 'Maximum number of bookings per day (%) exceeded', v_calendar_settings.max_bookings_per_day;
    END IF;
  END IF;
  
  -- Valideer customer gegevens
  IF LENGTH(TRIM(NEW.customer_name)) < 2 THEN
    RAISE EXCEPTION 'Customer name must be at least 2 characters long';
  END IF;
  
  IF NEW.customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.customer_email;
  END IF;
  
  -- Valideer dat service type bij calendar hoort
  IF NEW.service_type_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.service_types 
      WHERE id = NEW.service_type_id 
        AND calendar_id = NEW.calendar_id 
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Invalid or inactive service type for this calendar';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_availability_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Check dat start_time voor end_time ligt
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  -- Check geldige dag van de week (0-6)
  IF NEW.day_of_week < 0 OR NEW.day_of_week > 6 THEN
    RAISE EXCEPTION 'Day of week must be between 0 (Sunday) and 6 (Saturday)';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 13. Create missing functions that might be referenced
CREATE OR REPLACE FUNCTION public.get_business_hours(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'day_of_week', ar.day_of_week,
      'start_time', ar.start_time,
      'end_time', ar.end_time,
      'is_available', ar.is_available
    ) ORDER BY ar.day_of_week
  ) INTO v_result
  FROM public.availability_rules ar
  JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
  WHERE sch.calendar_id = p_calendar_id
    AND sch.is_default = true;
    
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

-- 14. Create function for calendar statistics (secure version)
CREATE OR REPLACE FUNCTION public.get_calendar_statistics(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb;
  v_user_id uuid;
BEGIN
  -- Check if user owns this calendar
  SELECT user_id INTO v_user_id
  FROM public.calendars
  WHERE id = p_calendar_id;
  
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied to calendar statistics';
  END IF;
  
  -- Get statistics for owned calendar
  SELECT jsonb_build_object(
    'total_bookings', COUNT(*),
    'completed_bookings', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_bookings', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'pending_bookings', COUNT(*) FILTER (WHERE status = 'pending'),
    'total_revenue', COALESCE(SUM(total_price), 0),
    'this_month', jsonb_build_object(
      'bookings', COUNT(*) FILTER (WHERE start_time >= date_trunc('month', CURRENT_DATE)),
      'revenue', COALESCE(SUM(total_price) FILTER (WHERE start_time >= date_trunc('month', CURRENT_DATE)), 0)
    )
  ) INTO v_result
  FROM public.bookings
  WHERE calendar_id = p_calendar_id;
  
  RETURN v_result;
END;
$function$;
