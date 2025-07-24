-- Security Fix: Add proper search_path to database functions to prevent SQL injection

-- Fix render_whatsapp_template function
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

-- Fix match_quick_reply_flow function
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

-- Fix process_whatsapp_webhook_queue function
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

-- Fix cleanup_old_whatsapp_data function
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

-- Fix get_business_hours function
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

-- Fix get_calendar_statistics function
CREATE OR REPLACE FUNCTION public.get_calendar_statistics(p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

-- Fix get_dashboard_metrics function
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_today_bookings integer;
  v_pending_bookings integer;
  v_total_revenue numeric;
  v_week_bookings integer;
  v_month_bookings integer;
  v_conversion_rate numeric;
  v_avg_response_time numeric;
BEGIN
  -- Today's bookings
  SELECT COUNT(*) INTO v_today_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND DATE(start_time) = CURRENT_DATE
    AND status != 'cancelled';

  -- Pending confirmations
  SELECT COUNT(*) INTO v_pending_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND status = 'pending';

  -- This week's bookings
  SELECT COUNT(*) INTO v_week_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND start_time >= date_trunc('week', CURRENT_DATE)
    AND start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
    AND status != 'cancelled';

  -- This month's bookings  
  SELECT COUNT(*) INTO v_month_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND start_time >= date_trunc('month', CURRENT_DATE)
    AND start_time < date_trunc('month', CURRENT_DATE) + interval '1 month'
    AND status != 'cancelled';

  -- Total revenue this month
  SELECT COALESCE(SUM(COALESCE(b.total_price, st.price, 0)), 0) INTO v_total_revenue
  FROM public.bookings b
  LEFT JOIN public.service_types st ON b.service_type_id = st.id
  WHERE b.calendar_id = p_calendar_id 
    AND b.start_time >= date_trunc('month', CURRENT_DATE)
    AND b.status != 'cancelled';

  -- WhatsApp conversion rate (if WhatsApp data exists)
  SELECT COALESCE(
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100)
      ELSE 0 
    END, 0
  ) INTO v_conversion_rate
  FROM public.booking_intents bi
  JOIN public.whatsapp_conversations wc ON bi.conversation_id = wc.id
  WHERE wc.calendar_id = p_calendar_id
    AND bi.created_at >= CURRENT_DATE - interval '30 days';

  -- Average WhatsApp response time (in minutes)
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      SELECT MIN(m2.created_at) 
      FROM public.whatsapp_messages m2 
      WHERE m2.conversation_id = m1.conversation_id 
        AND m2.direction = 'outbound' 
        AND m2.created_at > m1.created_at
    ) - m1.created_at) / 60
  ), 0) INTO v_avg_response_time
  FROM public.whatsapp_messages m1
  JOIN public.whatsapp_conversations wc ON m1.conversation_id = wc.id
  WHERE wc.calendar_id = p_calendar_id
    AND m1.direction = 'inbound'
    AND m1.created_at >= CURRENT_DATE - interval '7 days';

  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'conversion_rate', ROUND(v_conversion_rate, 1),
    'avg_response_time', ROUND(v_avg_response_time, 1),
    'last_updated', now()
  );

  RETURN v_result;
END;
$function$;