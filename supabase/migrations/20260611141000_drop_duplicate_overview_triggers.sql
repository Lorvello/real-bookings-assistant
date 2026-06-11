-- Drop duplicate business-overview refresh triggers across all affected tables.
--
-- The same refresh function was attached twice (identical timing/events) on
-- several tables via layered migrations, so the overview refresh ran twice on
-- every insert/update/delete. Keep one trigger of each pair; drop the duplicate.
-- (bookings was handled in 20260611140000.)

-- trigger_business_overview_v2_refresh duplicates
DROP TRIGGER IF EXISTS trigger_availability_rules_v2_refresh ON public.availability_rules;
DROP TRIGGER IF EXISTS trigger_calendar_settings_v2_refresh ON public.calendar_settings;
DROP TRIGGER IF EXISTS trigger_calendars_v2_refresh ON public.calendars;
DROP TRIGGER IF EXISTS trigger_service_types_v2_refresh ON public.service_types;

-- trigger_business_overview_refresh duplicate on service_types
DROP TRIGGER IF EXISTS trigger_refresh_on_service_type_update ON public.service_types;
