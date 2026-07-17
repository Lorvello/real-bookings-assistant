
-- Enable realtime for service_types table (for service changes)
ALTER TABLE public.service_types REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_types;

-- Enable realtime for calendars table (for calendar changes)
ALTER TABLE public.calendars REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendars;

-- Create a materialized view for fast dashboard metrics
CREATE MATERIALIZED VIEW public.dashboard_metrics_mv AS
SELECT 
  b.calendar_id,
  COUNT(*) FILTER (WHERE DATE(b.start_time) = CURRENT_DATE AND b.status != 'cancelled') as today_bookings,
  COUNT(*) FILTER (WHERE b.status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE b.start_time >= date_trunc('week', CURRENT_DATE) AND b.start_time < date_trunc('week', CURRENT_DATE) + interval '7 days' AND b.status != 'cancelled') as week_bookings,
  COUNT(*) FILTER (WHERE b.start_time >= date_trunc('month', CURRENT_DATE) AND b.start_time < date_trunc('month', CURRENT_DATE) + interval '1 month' AND b.status != 'cancelled') as month_bookings,
  COALESCE(SUM(COALESCE(b.total_price, st.price, 0)) FILTER (WHERE b.start_time >= date_trunc('month', CURRENT_DATE) AND b.status != 'cancelled'), 0) as month_revenue,
  MAX(b.updated_at) as last_updated
FROM public.bookings b
LEFT JOIN public.service_types st ON b.service_type_id = st.id
GROUP BY b.calendar_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON dashboard_metrics_mv (calendar_id);

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION public.refresh_dashboard_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_metrics_mv;
END;
$$;

-- Trigger to refresh metrics when bookings change
CREATE OR REPLACE FUNCTION public.trigger_dashboard_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh in background (non-blocking)
  PERFORM pg_notify('dashboard_refresh', NEW.calendar_id::text);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for dashboard refresh
CREATE TRIGGER booking_dashboard_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_dashboard_refresh();
