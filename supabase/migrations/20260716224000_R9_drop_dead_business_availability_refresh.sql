-- R9: remove a dead maintenance RPC left behind when the obsolete
-- business_availability_overview materialized view was dropped.
--
-- Current availability reads use get_business_available_slots(), which resolves
-- calendars and service types directly and delegates to get_available_slots().
-- Keeping this function exposed to service_role only produced a deterministic
-- "relation does not exist" failure.
DROP FUNCTION IF EXISTS public.refresh_business_availability_overview();
