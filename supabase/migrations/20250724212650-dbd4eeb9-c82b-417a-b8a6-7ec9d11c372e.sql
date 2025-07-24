-- Fix remaining security functions with search_path

CREATE OR REPLACE FUNCTION public.render_whatsapp_template(p_template_key text, p_calendar_id uuid, p_variables jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.match_quick_reply_flow(p_message text, p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.process_whatsapp_webhook_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.cleanup_old_whatsapp_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.get_business_hours(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.cleanup_duplicate_availability_rules(p_schedule_id uuid, p_day_of_week integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Verwijder duplicaten, behoud alleen de nieuwste
  DELETE FROM public.availability_rules 
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (
               PARTITION BY schedule_id, day_of_week, start_time, end_time 
               ORDER BY created_at DESC
             ) as rn
      FROM public.availability_rules
      WHERE schedule_id = p_schedule_id 
        AND day_of_week = p_day_of_week
    ) t
    WHERE t.rn > 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.export_whatsapp_data(p_calendar_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.update_existing_users_retroactively()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Update existing users without trial dates
  UPDATE public.users 
  SET 
    trial_start_date = COALESCE(trial_start_date, created_at),
    trial_end_date = COALESCE(trial_end_date, created_at + interval '7 days')
  WHERE trial_start_date IS NULL OR trial_end_date IS NULL;
  
  -- Update subscription status for expired trials
  UPDATE public.users 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial' 
    AND trial_end_date <= NOW()
    AND subscription_status != 'expired';
  
  -- Set default subscription tier for existing users
  UPDATE public.users 
  SET subscription_tier = 'starter'
  WHERE subscription_tier IS NULL 
    AND subscription_status IN ('active', 'paid');
    
  -- Log the update
  RAISE NOTICE 'Updated existing users retroactively';
END;
$function$;