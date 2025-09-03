-- Create enhanced dashboard metrics function with WhatsApp integration
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