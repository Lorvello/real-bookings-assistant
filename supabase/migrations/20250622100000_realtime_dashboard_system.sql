
-- Enable real-time for all relevant tables
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;
ALTER TABLE public.whatsapp_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.booking_intents REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_intents;

-- Create event tracking table for real-time business events
CREATE TABLE public.business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'booking_created', 'payment_received', 'whatsapp_message', etc.
  event_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

-- Enable RLS and realtime for business_events
ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.business_events;

-- RLS policy for business_events
CREATE POLICY "Users can view own calendar business events" ON public.business_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = business_events.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Create materialized views for each dashboard section

-- 1. Live Operations View
CREATE MATERIALIZED VIEW public.live_operations_mv AS
SELECT 
  b.calendar_id,
  -- Today's stats
  COUNT(*) FILTER (WHERE DATE(b.start_time) = CURRENT_DATE AND b.status != 'cancelled') as today_bookings,
  COUNT(*) FILTER (WHERE DATE(b.start_time) = CURRENT_DATE AND b.status = 'pending') as today_pending,
  COUNT(*) FILTER (WHERE DATE(b.start_time) = CURRENT_DATE AND b.status = 'confirmed') as today_confirmed,
  
  -- Live status
  COUNT(*) FILTER (WHERE b.start_time <= NOW() AND b.end_time >= NOW() AND b.status = 'confirmed') as currently_active_bookings,
  
  -- Next appointment
  MIN(b.start_time) FILTER (WHERE b.start_time > NOW() AND b.status = 'confirmed') as next_appointment_time,
  
  -- WhatsApp activity (last hour)
  (SELECT COUNT(*) FROM whatsapp_messages wm 
   JOIN whatsapp_conversations wc ON wm.conversation_id = wc.id 
   WHERE wc.calendar_id = b.calendar_id 
   AND wm.created_at >= NOW() - interval '1 hour'
   AND wm.direction = 'inbound') as whatsapp_messages_last_hour,
  
  MAX(b.updated_at) as last_updated
FROM public.bookings b
GROUP BY b.calendar_id;

CREATE UNIQUE INDEX ON live_operations_mv (calendar_id);

-- 2. Business Intelligence View
CREATE MATERIALIZED VIEW public.business_intelligence_mv AS
SELECT 
  b.calendar_id,
  -- Revenue analytics
  SUM(COALESCE(b.total_price, st.price, 0)) FILTER (WHERE b.start_time >= date_trunc('month', CURRENT_DATE) AND b.status != 'cancelled') as month_revenue,
  SUM(COALESCE(b.total_price, st.price, 0)) FILTER (WHERE b.start_time >= date_trunc('month', CURRENT_DATE) - interval '1 month' AND b.start_time < date_trunc('month', CURRENT_DATE) AND b.status != 'cancelled') as prev_month_revenue,
  
  -- Customer insights
  COUNT(DISTINCT b.customer_email) FILTER (WHERE b.start_time >= date_trunc('month', CURRENT_DATE)) as unique_customers_month,
  AVG(COALESCE(b.total_price, st.price, 0)) FILTER (WHERE b.status != 'cancelled') as avg_booking_value,
  
  -- Service performance
  (SELECT jsonb_agg(
    jsonb_build_object(
      'service_name', service_name,
      'booking_count', booking_count,
      'revenue', revenue,
      'avg_price', avg_price
    )
  ) FROM (
    SELECT 
      COALESCE(b2.service_name, st2.name) as service_name,
      COUNT(*) as booking_count,
      SUM(COALESCE(b2.total_price, st2.price, 0)) as revenue,
      AVG(COALESCE(b2.total_price, st2.price, 0)) as avg_price
    FROM bookings b2
    LEFT JOIN service_types st2 ON b2.service_type_id = st2.id
    WHERE b2.calendar_id = b.calendar_id 
    AND b2.start_time >= date_trunc('month', CURRENT_DATE)
    AND b2.status != 'cancelled'
    GROUP BY COALESCE(b2.service_name, st2.name)
    ORDER BY booking_count DESC
  ) service_stats) as service_performance,
  
  -- Conversion metrics
  (SELECT CASE WHEN COUNT(*) > 0 THEN 
    COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100 
   ELSE 0 END
   FROM booking_intents bi
   JOIN whatsapp_conversations wc ON bi.conversation_id = wc.id
   WHERE wc.calendar_id = b.calendar_id
   AND bi.created_at >= CURRENT_DATE - interval '30 days') as whatsapp_conversion_rate,
  
  MAX(b.updated_at) as last_updated
FROM public.bookings b
LEFT JOIN public.service_types st ON b.service_type_id = st.id
GROUP BY b.calendar_id;

CREATE UNIQUE INDEX ON business_intelligence_mv (calendar_id);

-- 3. Performance Efficiency View  
CREATE MATERIALIZED VIEW public.performance_efficiency_mv AS
SELECT 
  b.calendar_id,
  -- Response time metrics
  (SELECT AVG(
    EXTRACT(EPOCH FROM (
      SELECT MIN(m2.created_at) 
      FROM whatsapp_messages m2 
      WHERE m2.conversation_id = m1.conversation_id 
        AND m2.direction = 'outbound' 
        AND m2.created_at > m1.created_at
    ) - m1.created_at) / 60
  ) FROM whatsapp_messages m1
   JOIN whatsapp_conversations wc ON m1.conversation_id = wc.id
   WHERE wc.calendar_id = b.calendar_id
   AND m1.direction = 'inbound'
   AND m1.created_at >= CURRENT_DATE - interval '7 days') as avg_response_time_minutes,
  
  -- No-show and cancellation rates
  COUNT(*) FILTER (WHERE b.status = 'no-show' AND b.start_time >= CURRENT_DATE - interval '30 days')::numeric / 
  NULLIF(COUNT(*) FILTER (WHERE b.start_time >= CURRENT_DATE - interval '30 days'), 0)::numeric * 100 as no_show_rate,
  
  COUNT(*) FILTER (WHERE b.status = 'cancelled' AND b.start_time >= CURRENT_DATE - interval '30 days')::numeric / 
  NULLIF(COUNT(*) FILTER (WHERE b.start_time >= CURRENT_DATE - interval '30 days'), 0)::numeric * 100 as cancellation_rate,
  
  -- Calendar utilization
  (SELECT 
    COUNT(*) FILTER (WHERE b2.status != 'cancelled')::numeric / 
    NULLIF(
      (SELECT COUNT(*) FROM generate_series(
        date_trunc('week', CURRENT_DATE)::timestamp,
        date_trunc('week', CURRENT_DATE)::timestamp + interval '6 days',
        interval '30 minutes'
      )) * 5, 0  -- Assuming 5 work days
    )::numeric * 100
   FROM bookings b2 
   WHERE b2.calendar_id = b.calendar_id 
   AND b2.start_time >= date_trunc('week', CURRENT_DATE)
   AND b2.start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
  ) as calendar_utilization_rate,
  
  -- Peak hours analysis
  (SELECT jsonb_agg(
    jsonb_build_object(
      'hour', booking_hour,
      'count', booking_count
    ) ORDER BY booking_count DESC
  ) FROM (
    SELECT 
      EXTRACT(HOUR FROM b2.start_time) as booking_hour,
      COUNT(*) as booking_count
    FROM bookings b2
    WHERE b2.calendar_id = b.calendar_id 
    AND b2.start_time >= CURRENT_DATE - interval '30 days'
    AND b2.status != 'cancelled'
    GROUP BY EXTRACT(HOUR FROM b2.start_time)
    ORDER BY booking_count DESC
    LIMIT 5
  ) peak_hours) as peak_hours,
  
  MAX(b.updated_at) as last_updated
FROM public.bookings b
GROUP BY b.calendar_id;

CREATE UNIQUE INDEX ON performance_efficiency_mv (calendar_id);

-- 4. Future Insights View
CREATE MATERIALIZED VIEW public.future_insights_mv AS
SELECT 
  b.calendar_id,
  -- Demand forecasting (simple trend analysis)
  (SELECT 
    jsonb_agg(
      jsonb_build_object(
        'week', week_number,
        'bookings', booking_count,
        'trend', trend_direction
      ) ORDER BY week_number
    )
   FROM (
    SELECT 
      EXTRACT(WEEK FROM b2.start_time) as week_number,
      COUNT(*) as booking_count,
      CASE 
        WHEN COUNT(*) > LAG(COUNT(*)) OVER (ORDER BY EXTRACT(WEEK FROM b2.start_time)) THEN 'up'
        WHEN COUNT(*) < LAG(COUNT(*)) OVER (ORDER BY EXTRACT(WEEK FROM b2.start_time)) THEN 'down'
        ELSE 'stable'
      END as trend_direction
    FROM bookings b2
    WHERE b2.calendar_id = b.calendar_id 
    AND b2.start_time >= CURRENT_DATE - interval '8 weeks'
    AND b2.status != 'cancelled'
    GROUP BY EXTRACT(WEEK FROM b2.start_time)
    ORDER BY EXTRACT(WEEK FROM b2.start_time)
   ) weekly_trends) as demand_forecast,
  
  -- Waitlist conversion opportunities
  (SELECT COUNT(*) FROM waitlist w WHERE w.calendar_id = b.calendar_id AND w.status = 'waiting') as waitlist_size,
  
  -- Customer retention prediction (returning customers)
  COUNT(DISTINCT b.customer_email) FILTER (
    WHERE b.customer_email IN (
      SELECT customer_email 
      FROM bookings b3 
      WHERE b3.calendar_id = b.calendar_id 
      AND b3.start_time < CURRENT_DATE - interval '30 days'
    )
  ) as returning_customers_month,
  
  -- Seasonal patterns
  (SELECT jsonb_agg(
    jsonb_build_object(
      'month', month_name,
      'avg_bookings', avg_bookings
    )
  ) FROM (
    SELECT 
      to_char(date_trunc('month', b2.start_time), 'Month') as month_name,
      AVG(daily_bookings) as avg_bookings
    FROM (
      SELECT 
        DATE(b2.start_time) as booking_date,
        COUNT(*) as daily_bookings
      FROM bookings b2
      WHERE b2.calendar_id = b.calendar_id 
      AND b2.start_time >= CURRENT_DATE - interval '1 year'
      AND b2.status != 'cancelled'
      GROUP BY DATE(b2.start_time)
    ) daily_stats
    JOIN bookings b2 ON DATE(b2.start_time) = daily_stats.booking_date
    GROUP BY date_trunc('month', b2.start_time)
    ORDER BY date_trunc('month', b2.start_time)
  ) seasonal_data) as seasonal_patterns,
  
  MAX(b.updated_at) as last_updated
FROM public.bookings b
GROUP BY b.calendar_id;

CREATE UNIQUE INDEX ON future_insights_mv (calendar_id);

-- Function to refresh all dashboard views
CREATE OR REPLACE FUNCTION public.refresh_all_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.live_operations_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.business_intelligence_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.performance_efficiency_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.future_insights_mv;
END;
$$;

-- Enhanced trigger function for real-time updates
CREATE OR REPLACE FUNCTION public.trigger_realtime_dashboard_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_calendar_id uuid;
BEGIN
  -- Bepaal calendar_id afhankelijk van operatie
  IF TG_OP = 'DELETE' THEN
    target_calendar_id := OLD.calendar_id;
  ELSE
    target_calendar_id := NEW.calendar_id;
  END IF;
  
  -- Log business event
  INSERT INTO public.business_events (calendar_id, event_type, event_data)
  VALUES (
    target_calendar_id,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END
  );
  
  -- Send real-time notification
  PERFORM pg_notify('realtime_dashboard_update', 
    json_build_object(
      'calendar_id', target_calendar_id,
      'event_type', TG_TABLE_NAME || '.' || lower(TG_OP),
      'timestamp', now()
    )::text
  );
  
  -- Return correct record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Apply triggers to all relevant tables
DROP TRIGGER IF EXISTS realtime_dashboard_trigger ON public.bookings;
CREATE TRIGGER realtime_dashboard_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_realtime_dashboard_refresh();

DROP TRIGGER IF EXISTS realtime_dashboard_trigger ON public.whatsapp_messages;
CREATE TRIGGER realtime_dashboard_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_realtime_dashboard_refresh();

DROP TRIGGER IF EXISTS realtime_dashboard_trigger ON public.whatsapp_conversations;
CREATE TRIGGER realtime_dashboard_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_realtime_dashboard_refresh();

-- Initial refresh of all views
SELECT public.refresh_all_dashboard_views();
