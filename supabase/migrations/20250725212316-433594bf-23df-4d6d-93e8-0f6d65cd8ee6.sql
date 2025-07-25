-- Fix onboarding calendar creation by removing auto-calendar creation trigger
-- The previous migration incorrectly tried to drop trigger from auth.users
-- but the trigger is actually on public.users table

-- Drop the trigger that automatically creates calendars for new users
DROP TRIGGER IF EXISTS on_user_created_calendar ON public.users;

-- Also drop the associated function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user_calendar();