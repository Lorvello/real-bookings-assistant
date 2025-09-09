-- Fix remaining database function search path security warnings  
-- Update the remaining functions that need secure search paths

-- Fix all remaining functions with search path issues
CREATE OR REPLACE FUNCTION public.get_calendar_availability(p_calendar_slug text, p_start_date date DEFAULT CURRENT_DATE, p_days integer DEFAULT 14)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_end_date date;
  v_result json;
BEGIN
  -- Haal calendar ID op via slug
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE slug = p_calendar_slug 
    AND is_active = true;
    
  IF v_calendar_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Calendar not found'
    );
  END IF;
  
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Haal beschikbare slots op voor alle actieve service types
  SELECT json_agg(
    json_build_object(
      'date', slot_date,
      'service_type_id', service_type_id,
      'service_name', service_name,
      'duration', service_duration,
      'price', service_price,
      'slots', slots_array
    )
  ) INTO v_result
  FROM (
    SELECT 
      slots.slot_date,
      st.id as service_type_id,
      st.name as service_name,
      st.duration as service_duration,
      st.price as service_price,
      json_agg(
        json_build_object(
          'start_time', slots.slot_start,
          'end_time', slots.slot_end,
          'available', slots.is_available
        ) ORDER BY slots.slot_start
      ) as slots_array
    FROM public.service_types st
    CROSS JOIN LATERAL public.get_available_slots_range(
      v_calendar_id,
      st.id,
      p_start_date,
      v_end_date
    ) as slots
    WHERE st.calendar_id = v_calendar_id 
      AND st.is_active = true
    GROUP BY slots.slot_date, st.id, st.name, st.duration, st.price
    ORDER BY slots.slot_date, st.name
  ) availability_data;
  
  RETURN json_build_object(
    'success', true,
    'calendar_id', v_calendar_id,
    'availability', COALESCE(v_result, '[]'::json)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_business_available_slots(p_calendar_slug text, p_service_type_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT CURRENT_DATE, p_days integer DEFAULT 14)
 RETURNS TABLE(calendar_id uuid, calendar_name text, service_type_id uuid, service_name text, service_duration integer, service_price numeric, slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean, duration_minutes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_calendar_name text;
  v_settings record;
  v_current_date date;
  v_end_date date;
  v_service record;
  v_rule record;
  v_current_slot timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_daily_bookings integer;
  v_allow_double_bookings boolean := false;
  v_max_daily_bookings integer;
BEGIN
  -- Get calendar info
  SELECT c.id, c.name INTO v_calendar_id, v_calendar_name
  FROM public.calendars c
  WHERE c.slug = p_calendar_slug AND c.is_active = true;
  
  IF v_calendar_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get calendar settings
  SELECT * INTO v_settings
  FROM public.calendar_settings
  WHERE calendar_id = v_calendar_id;
  
  IF v_settings IS NULL THEN
    v_settings := ROW(null, v_calendar_id, 30, 1, 60, 0, null, false, true, null, null, null, null, null, null, null, null, null);
  END IF;
  
  v_max_daily_bookings := v_settings.max_bookings_per_day;
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Loop through service types
  FOR v_service IN 
    SELECT st.id, st.name, st.duration, st.price, 
           COALESCE(st.preparation_time, 0) as preparation_time,
           COALESCE(st.cleanup_time, 0) as cleanup_time
    FROM public.service_types st
    WHERE st.calendar_id = v_calendar_id 
      AND st.is_active = true
      AND (p_service_type_id IS NULL OR st.id = p_service_type_id)
  LOOP
    -- Loop through dates
    v_current_date := p_start_date;
    WHILE v_current_date <= v_end_date LOOP
      
      -- Check daily booking limit if set
      IF v_max_daily_bookings IS NOT NULL THEN
        SELECT COUNT(*) INTO v_daily_bookings
        FROM public.bookings
        WHERE calendar_id = v_calendar_id
          AND DATE(start_time) = v_current_date
          AND status NOT IN ('cancelled', 'no-show');
          
        -- Skip this date if limit reached
        IF v_daily_bookings >= v_max_daily_bookings THEN
          v_current_date := v_current_date + 1;
          CONTINUE;
        END IF;
      END IF;
      
      -- Get availability rules for this day
      FOR v_rule IN
        SELECT ar.start_time, ar.end_time, ar.is_available
        FROM public.availability_rules ar
        JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
        WHERE sch.calendar_id = v_calendar_id
          AND sch.is_default = true
          AND ar.day_of_week = CASE 
            WHEN EXTRACT(DOW FROM v_current_date) = 0 THEN 7 
            ELSE EXTRACT(DOW FROM v_current_date)::integer 
          END
          AND ar.is_available = true
      LOOP
        -- Generate time slots for this availability window
        v_current_slot := (v_current_date || ' ' || v_rule.start_time)::timestamp with time zone;
        
        WHILE v_current_slot + (v_service.duration || ' minutes')::interval <= 
              (v_current_date || ' ' || v_rule.end_time)::timestamp with time zone LOOP
          
          v_slot_end := v_current_slot + (v_service.duration || ' minutes')::interval;
          
          -- Check availability (considering double bookings setting)
          RETURN QUERY SELECT 
            v_calendar_id,
            v_calendar_name,
            v_service.id,
            v_service.name,
            v_service.duration,
            v_service.price,
            v_current_slot,
            v_slot_end,
            NOT public.check_booking_conflicts(
              v_calendar_id,
              v_current_slot - (v_service.preparation_time || ' minutes')::interval,
              v_slot_end + (v_service.cleanup_time || ' minutes')::interval,
              NULL,
              v_allow_double_bookings
            ),
            v_service.duration;
          
          -- Move to next slot
          v_current_slot := v_current_slot + (v_settings.slot_duration || ' minutes')::interval;
        END LOOP;
      END LOOP;
      
      v_current_date := v_current_date + 1;
    END LOOP;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb := '{}';
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_week_start timestamptz;
  v_month_start timestamptz;
  v_thirty_days_ago timestamptz;
  
  -- Booking metrics
  v_today_bookings integer := 0;
  v_pending_bookings integer := 0;
  v_week_bookings integer := 0;
  v_month_bookings integer := 0;
  v_total_revenue numeric := 0;
  
  -- WhatsApp metrics
  v_whatsapp_conversations integer := 0;
  v_whatsapp_messages_today integer := 0;
  v_conversion_rate numeric := 0;
  v_avg_response_time numeric := 0;
  
  -- Customer metrics
  v_unique_customers integer := 0;
  v_returning_customers integer := 0;
  v_total_customers integer := 0;
BEGIN
  -- Set date boundaries
  v_today_start := date_trunc('day', now());
  v_today_end := v_today_start + interval '1 day';
  v_week_start := date_trunc('week', now());
  v_month_start := date_trunc('month', now());
  v_thirty_days_ago := now() - interval '30 days';
  
  -- Get booking metrics
  SELECT 
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND status != 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE start_time >= v_week_start AND status != 'cancelled'),
    COUNT(*) FILTER (WHERE start_time >= v_month_start AND status != 'cancelled'),
    COALESCE(SUM(total_price) FILTER (WHERE start_time >= v_month_start AND status = 'confirmed'), 0)
  INTO v_today_bookings, v_pending_bookings, v_week_bookings, v_month_bookings, v_total_revenue
  FROM public.bookings
  WHERE calendar_id = p_calendar_id;
  
  -- Get WhatsApp conversation metrics
  SELECT COUNT(*) INTO v_whatsapp_conversations
  FROM public.whatsapp_conversations
  WHERE calendar_id = p_calendar_id AND status = 'active';
  
  -- Get WhatsApp messages today
  SELECT COUNT(*) INTO v_whatsapp_messages_today
  FROM public.whatsapp_messages wm
  JOIN public.whatsapp_conversations wc ON wc.id = wm.conversation_id
  WHERE wc.calendar_id = p_calendar_id
    AND DATE(wm.created_at) = CURRENT_DATE;
  
  -- Calculate conversion rate (bookings from WhatsApp vs total WhatsApp conversations)
  WITH whatsapp_bookings AS (
    SELECT COUNT(*) as booking_count
    FROM public.bookings b
    WHERE b.calendar_id = p_calendar_id
      AND b.start_time >= v_thirty_days_ago
      AND b.status != 'cancelled'
      AND EXISTS (
        SELECT 1 FROM public.whatsapp_contacts wc
        WHERE wc.phone_number = b.customer_phone
          OR wc.linked_customer_email = b.customer_email
      )
  ),
  total_conversations AS (
    SELECT COUNT(*) as conv_count
    FROM public.whatsapp_conversations
    WHERE calendar_id = p_calendar_id
      AND created_at >= v_thirty_days_ago
  )
  SELECT 
    CASE 
      WHEN tc.conv_count > 0 THEN ROUND((wb.booking_count::numeric / tc.conv_count::numeric) * 100, 1)
      ELSE 0
    END
  INTO v_conversion_rate
  FROM whatsapp_bookings wb, total_conversations tc;
  
  -- Calculate customer metrics (combining email and WhatsApp)
  WITH all_customers AS (
    -- Email-based customers
    SELECT customer_email as identifier, MIN(created_at) as first_booking
    FROM public.bookings
    WHERE calendar_id = p_calendar_id
      AND customer_email IS NOT NULL
      AND status != 'cancelled'
    GROUP BY customer_email
    
    UNION
    
    -- WhatsApp-based customers
    SELECT wc.phone_number as identifier, MIN(wc.created_at) as first_booking
    FROM public.whatsapp_contacts wc
    JOIN public.whatsapp_conversations conv ON conv.contact_id = wc.id
    WHERE conv.calendar_id = p_calendar_id
    GROUP BY wc.phone_number
  )
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE first_booking >= v_thirty_days_ago) as new_customers,
    COUNT(*) FILTER (WHERE first_booking < v_thirty_days_ago) as returning
  INTO v_total_customers, v_unique_customers, v_returning_customers
  FROM all_customers;
  
  -- Calculate average response time (mock for now, will need message analysis)
  v_avg_response_time := 15; -- minutes, placeholder
  
  -- Build result
  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'conversion_rate', v_conversion_rate,
    'avg_response_time', v_avg_response_time,
    'whatsapp_conversations', v_whatsapp_conversations,
    'whatsapp_messages_today', v_whatsapp_messages_today,
    'unique_customers', v_unique_customers,
    'returning_customers', v_returning_customers,
    'total_customers', v_total_customers,
    'last_updated', now()
  );
  
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_webhook_queue()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM process_booking_webhook_events();
END;
$function$;