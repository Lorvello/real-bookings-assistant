-- These three relations are views, so PostgreSQL cannot enable RLS or attach
-- policies directly to them. Run them with caller permissions instead: the
-- underlying users/calendars/bookings policies remain the authorization
-- boundary and the view owner cannot bypass them.
ALTER VIEW public.daily_booking_stats SET (security_invoker = on);
ALTER VIEW public.service_popularity_stats SET (security_invoker = on);
ALTER VIEW public.user_status_overview SET (security_invoker = on);

REVOKE ALL ON public.daily_booking_stats FROM anon;
REVOKE ALL ON public.service_popularity_stats FROM anon;
REVOKE ALL ON public.user_status_overview FROM anon;

GRANT SELECT ON public.daily_booking_stats TO authenticated;
GRANT SELECT ON public.service_popularity_stats TO authenticated;
GRANT SELECT ON public.user_status_overview TO authenticated;
