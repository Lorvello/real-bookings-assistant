-- R47: close the last two anon-executable SECURITY DEFINER leaks found in the round-10 sweep
-- get_calendar_statistics(uuid): anon got cross-tenant KPIs (revenue/bookings) for any calendar (guard
--   bypassed for the NULL-uid anon role). No frontend caller; the auth.uid() guard works for
--   authenticated, so keep authenticated+service_role, drop anon/PUBLIC.
-- cleanup_expired_context(): maintenance cron, no caller; service_role only.
DO $r47$
DECLARE fn text;
BEGIN
  -- get_calendar_statistics: authenticated + service_role
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_calendar_statistics(uuid) FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_calendar_statistics(uuid) FROM anon';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_calendar_statistics(uuid) TO authenticated, service_role';
  -- cleanup_expired_context: service_role only
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.cleanup_expired_context() FROM PUBLIC';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.cleanup_expired_context() FROM anon';
  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.cleanup_expired_context() FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_expired_context() TO service_role';
END
$r47$;
