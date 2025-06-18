
-- Performance optimalisaties voor database queries

-- Availability lookups indexen
CREATE INDEX IF NOT EXISTS idx_availability_rules_schedule_day ON availability_rules(schedule_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_calendar_date ON availability_overrides(calendar_id, date);

-- Booking searches indexen
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_date_range ON bookings(calendar_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_status ON bookings(calendar_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_service_type ON bookings(service_type_id);

-- Waitlist indexen voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_calendar_status ON waitlist(calendar_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_preferred_date ON waitlist(preferred_date, status);

-- Service types index
CREATE INDEX IF NOT EXISTS idx_service_types_calendar ON service_types(calendar_id, is_active);

-- Materialized view voor calendar statistieken
CREATE MATERIALIZED VIEW IF NOT EXISTS calendar_stats AS
SELECT 
  calendar_id,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN status = 'no-show' THEN 1 END) as no_show_bookings,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_duration_minutes,
  SUM(CASE WHEN total_price IS NOT NULL THEN total_price ELSE 0 END) as total_revenue,
  DATE_TRUNC('month', MAX(created_at)) as last_updated_month
FROM bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY calendar_id;

-- Index op materialized view voor snelle lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_stats_calendar_id ON calendar_stats(calendar_id);

-- Materialized view voor service type performance
CREATE MATERIALIZED VIEW IF NOT EXISTS service_type_stats AS
SELECT 
  st.calendar_id,
  st.id as service_type_id,
  st.name as service_name,
  COUNT(b.id) as booking_count,
  AVG(st.duration) as avg_duration,
  SUM(COALESCE(b.total_price, st.price, 0)) as total_revenue,
  COUNT(CASE WHEN b.status = 'no-show' THEN 1 END) as no_show_count
FROM service_types st
LEFT JOIN bookings b ON st.id = b.service_type_id 
  AND b.created_at >= CURRENT_DATE - INTERVAL '12 months'
WHERE st.is_active = true
GROUP BY st.calendar_id, st.id, st.name, st.duration;

-- Index op service type stats
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_type_stats_service_id ON service_type_stats(service_type_id);
CREATE INDEX IF NOT EXISTS idx_service_type_stats_calendar ON service_type_stats(calendar_id);

-- Functie om materialized views te refreshen
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY calendar_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY service_type_stats;
END;
$$;

-- Trigger om stats bij te werken bij nieuwe bookings
CREATE OR REPLACE FUNCTION trigger_refresh_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh stats periodically (bijvoorbeeld alleen op werkdagen)
  IF EXTRACT(DOW FROM NOW()) BETWEEN 1 AND 5 THEN
    PERFORM refresh_analytics_views();
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger die dagelijks draait (via cron of scheduled task)
-- Voor nu maken we een functie die handmatig aangeroepen kan worden
