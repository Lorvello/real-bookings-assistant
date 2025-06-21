
-- Check of er afspraken zijn en hun status
SELECT 
  id,
  calendar_id,
  customer_name,
  service_name,
  start_time,
  end_time,
  status,
  created_at
FROM public.bookings 
ORDER BY created_at DESC 
LIMIT 10;

-- Check materialized view data
SELECT * FROM public.dashboard_metrics_mv;

-- Check of de trigger werkt
SELECT proname, prosrc FROM pg_proc WHERE proname = 'trigger_dashboard_refresh';
