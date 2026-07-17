-- Remove automatic availability creation when calendar is created
-- This prevents calendars from auto-generating availability schedules and rules

-- Drop the trigger that automatically creates availability schedules
DROP TRIGGER IF EXISTS on_calendar_created_availability ON public.calendars;

-- Drop the function that creates automatic availability 
DROP FUNCTION IF EXISTS public.handle_new_calendar_availability();

-- This ensures that:
-- 1. New calendars start with no availability schedules
-- 2. Availability step remains incomplete until manually configured
-- 3. Users must manually set up their working hours
-- 4. Onboarding progress accurately reflects completion status