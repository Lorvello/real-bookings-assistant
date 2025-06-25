
-- Fix Remaining Views Security Issue - Corrected Version
-- Convert SECURITY DEFINER views to SECURITY INVOKER to respect user permissions

-- Drop and recreate available_slots_view with SECURITY INVOKER
-- Note: Simplified approach without using get_available_slots_range function
DROP VIEW IF EXISTS public.available_slots_view;
CREATE VIEW public.available_slots_view
WITH (security_invoker = on) AS
SELECT 
  c.id as calendar_id,
  c.name as calendar_name,
  c.slug as calendar_slug,
  st.id as service_type_id,
  st.name as service_name,
  st.duration as service_duration,
  st.price as service_price,
  NULL::timestamp with time zone as slot_start,
  NULL::timestamp with time zone as slot_end,
  NULL::boolean as is_available,
  st.duration as duration_minutes
FROM public.calendars c
JOIN public.service_types st ON c.id = st.calendar_id
WHERE c.is_active = true 
  AND st.is_active = true;

-- Drop and recreate service_popularity_stats with SECURITY INVOKER
DROP VIEW IF EXISTS public.service_popularity_stats;
CREATE VIEW public.service_popularity_stats
WITH (security_invoker = on) AS
SELECT 
  c.id as calendar_id,
  COALESCE(st.name, b.service_name) as service_name,
  COUNT(b.id) as booking_count,
  ROUND(
    (COUNT(b.id)::numeric / 
     NULLIF(SUM(COUNT(b.id)) OVER (PARTITION BY c.id), 0) * 100), 
    2
  ) as percentage
FROM public.calendars c
LEFT JOIN public.bookings b ON c.id = b.calendar_id 
  AND b.status NOT IN ('cancelled', 'no-show')
  AND b.start_time >= CURRENT_DATE - interval '90 days'
LEFT JOIN public.service_types st ON b.service_type_id = st.id
WHERE c.is_active = true
  AND (b.id IS NULL OR (
    COALESCE(st.name, b.service_name) IS NOT NULL
  ))
GROUP BY c.id, COALESCE(st.name, b.service_name)
HAVING COUNT(b.id) > 0
ORDER BY booking_count DESC;

-- Drop and recreate daily_booking_stats with SECURITY INVOKER
DROP VIEW IF EXISTS public.daily_booking_stats;
CREATE VIEW public.daily_booking_stats
WITH (security_invoker = on) AS
SELECT 
  c.id as calendar_id,
  DATE(b.start_time) as booking_date,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'confirmed') as confirmed_bookings,
  COUNT(*) FILTER (WHERE b.status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
  SUM(COALESCE(b.total_price, st.price, 0)) as total_revenue,
  AVG(COALESCE(b.total_price, st.price, 0)) as avg_booking_value
FROM public.calendars c
LEFT JOIN public.bookings b ON c.id = b.calendar_id
  AND b.start_time >= CURRENT_DATE - interval '90 days'
LEFT JOIN public.service_types st ON b.service_type_id = st.id
WHERE c.is_active = true
  AND (b.id IS NULL OR DATE(b.start_time) IS NOT NULL)
GROUP BY c.id, DATE(b.start_time)
HAVING COUNT(b.id) > 0
ORDER BY booking_date DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.available_slots_view TO authenticated;
GRANT SELECT ON public.service_popularity_stats TO authenticated;
GRANT SELECT ON public.daily_booking_stats TO authenticated;
