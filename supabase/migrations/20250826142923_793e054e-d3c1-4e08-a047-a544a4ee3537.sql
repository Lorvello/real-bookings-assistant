-- CRITICAL SECURITY FIX: Restrict public access to users table
-- Remove the overly permissive public policies

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "users_public_read" ON public.users;
DROP POLICY IF EXISTS "public_users_read" ON public.users;

-- Ensure users can only see their own data and team members
-- Keep existing policies but ensure no public access
-- The existing policies should already handle this, but let's be explicit

-- Add search_path security to all custom functions
CREATE OR REPLACE FUNCTION public.handle_updated_at_business_stripe_accounts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_booking_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_payment_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_payment_security_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_payment_rate_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_users()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Secure materialized views - remove public access
-- Drop public policies on materialized views if they exist
DROP POLICY IF EXISTS "public_read_dashboard_metrics" ON public.dashboard_metrics_mv;

-- Ensure materialized views can only be accessed by authenticated users who own the calendar
CREATE POLICY "dashboard_metrics_owner_only" ON public.dashboard_metrics_mv
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = dashboard_metrics_mv.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

-- Add RLS to other views that might be exposed
ALTER TABLE public.daily_booking_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_booking_stats_owner_only" ON public.daily_booking_stats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = daily_booking_stats.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

ALTER TABLE public.service_popularity_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_popularity_stats_owner_only" ON public.service_popularity_stats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = service_popularity_stats.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

-- Secure the user_status_overview view
ALTER TABLE public.user_status_overview ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_status_overview_own_only" ON public.user_status_overview
FOR SELECT USING (auth.uid() = id);

-- Secure the available_slots_view
ALTER TABLE public.available_slots_view ENABLE ROW LEVEL SECURITY;
CREATE POLICY "available_slots_view_public_or_owner" ON public.available_slots_view
FOR SELECT USING (
  -- Public can view for active calendars
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.slug = available_slots_view.calendar_slug 
    AND calendars.is_active = true
  )
  OR
  -- Owners can always view their calendar slots
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = available_slots_view.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);