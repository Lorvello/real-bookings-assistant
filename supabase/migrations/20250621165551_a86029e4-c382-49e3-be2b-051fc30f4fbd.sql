
-- Create comprehensive dashboard analytics views and functions

-- 1. Daily booking statistics view
CREATE OR REPLACE VIEW daily_booking_stats AS
SELECT 
  b.calendar_id,
  DATE(b.start_time) as booking_date,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE b.status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
  SUM(COALESCE(b.total_price, st.price, 0)) as total_revenue,
  AVG(COALESCE(b.total_price, st.price, 0)) as avg_booking_value
FROM bookings b
LEFT JOIN service_types st ON b.service_type_id = st.id
GROUP BY b.calendar_id, DATE(b.start_time);

-- 2. Real-time dashboard metrics function
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  FROM bookings 
  WHERE calendar_id = p_calendar_id 
    AND DATE(start_time) = CURRENT_DATE
    AND status != 'cancelled';

  -- Pending confirmations
  SELECT COUNT(*) INTO v_pending_bookings
  FROM bookings 
  WHERE calendar_id = p_calendar_id 
    AND status = 'pending';

  -- This week's bookings
  SELECT COUNT(*) INTO v_week_bookings
  FROM bookings 
  WHERE calendar_id = p_calendar_id 
    AND start_time >= date_trunc('week', CURRENT_DATE)
    AND start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
    AND status != 'cancelled';

  -- This month's bookings  
  SELECT COUNT(*) INTO v_month_bookings
  FROM bookings 
  WHERE calendar_id = p_calendar_id 
    AND start_time >= date_trunc('month', CURRENT_DATE)
    AND start_time < date_trunc('month', CURRENT_DATE) + interval '1 month'
    AND status != 'cancelled';

  -- Total revenue this month
  SELECT COALESCE(SUM(COALESCE(b.total_price, st.price, 0)), 0) INTO v_total_revenue
  FROM bookings b
  LEFT JOIN service_types st ON b.service_type_id = st.id
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
  FROM booking_intents bi
  JOIN whatsapp_conversations wc ON bi.conversation_id = wc.id
  WHERE wc.calendar_id = p_calendar_id
    AND bi.created_at >= CURRENT_DATE - interval '30 days';

  -- Average WhatsApp response time (in minutes)
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      SELECT MIN(m2.created_at) 
      FROM whatsapp_messages m2 
      WHERE m2.conversation_id = m1.conversation_id 
        AND m2.direction = 'outbound' 
        AND m2.created_at > m1.created_at
    ) - m1.created_at) / 60
  ), 0) INTO v_avg_response_time
  FROM whatsapp_messages m1
  JOIN whatsapp_conversations wc ON m1.conversation_id = wc.id
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

-- 3. Service popularity stats
CREATE OR REPLACE VIEW service_popularity_stats AS
SELECT 
  st.calendar_id,
  st.name as service_name,
  COUNT(b.id) as booking_count,
  ROUND(
    (COUNT(b.id)::numeric / NULLIF(SUM(COUNT(b.id)) OVER (PARTITION BY st.calendar_id), 0)) * 100, 
    1
  ) as percentage
FROM service_types st
LEFT JOIN bookings b ON st.id = b.service_type_id AND b.status != 'cancelled'
WHERE st.is_active = true
GROUP BY st.calendar_id, st.id, st.name
ORDER BY st.calendar_id, booking_count DESC;

-- 4. Today's schedule function  
CREATE OR REPLACE FUNCTION get_todays_schedule(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'customer_name', b.customer_name,
      'service_name', COALESCE(b.service_name, st.name),
      'start_time', b.start_time,
      'end_time', b.end_time,
      'status', b.status,
      'customer_phone', b.customer_phone,
      'customer_email', b.customer_email,
      'notes', b.notes
    ) ORDER BY b.start_time
  ) INTO v_result
  FROM bookings b
  LEFT JOIN service_types st ON b.service_type_id = st.id
  WHERE b.calendar_id = p_calendar_id
    AND DATE(b.start_time) = CURRENT_DATE
    AND b.status != 'cancelled';

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

-- 5. Bot status tracking in calendar_settings
ALTER TABLE calendar_settings 
ADD COLUMN IF NOT EXISTS whatsapp_bot_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_bot_activity timestamp with time zone;

-- 6. Weekly booking trends function
CREATE OR REPLACE FUNCTION get_booking_trends(p_calendar_id uuid, p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', booking_date,
      'bookings', booking_count,
      'revenue', revenue
    ) ORDER BY booking_date
  ) INTO v_result
  FROM (
    SELECT 
      DATE(b.start_time) as booking_date,
      COUNT(*) as booking_count,
      SUM(COALESCE(b.total_price, st.price, 0)) as revenue
    FROM bookings b
    LEFT JOIN service_types st ON b.service_type_id = st.id
    WHERE b.calendar_id = p_calendar_id
      AND b.start_time >= CURRENT_DATE - (p_days || ' days')::interval
      AND b.status != 'cancelled'
    GROUP BY DATE(b.start_time)
    ORDER BY DATE(b.start_time)
  ) trends;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;
