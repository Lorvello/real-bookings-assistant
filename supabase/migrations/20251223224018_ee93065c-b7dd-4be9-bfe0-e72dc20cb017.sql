-- Create the bookings_with_period view with automatic time period calculation
CREATE OR REPLACE VIEW public.bookings_with_period
WITH (security_invoker = true)
AS
SELECT 
  b.*,
  CASE 
    WHEN DATE(b.start_time AT TIME ZONE COALESCE(c.timezone, 'Europe/Amsterdam')) < CURRENT_DATE THEN 'past'
    WHEN DATE(b.start_time AT TIME ZONE COALESCE(c.timezone, 'Europe/Amsterdam')) = CURRENT_DATE THEN 'today'
    ELSE 'future'
  END AS calculated_period
FROM public.bookings b
LEFT JOIN public.calendars c ON b.calendar_id = c.id;

-- Add comment for documentation
COMMENT ON VIEW public.bookings_with_period IS 'View met automatisch berekende calculated_period (past/today/future) gebaseerd op start_time en calendar timezone';

-- Grant access to authenticated and anon users (view inherits RLS from bookings table via security_invoker)
GRANT SELECT ON public.bookings_with_period TO authenticated;
GRANT SELECT ON public.bookings_with_period TO anon;