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

-- PostgreSQL does not support RLS policies directly on views or materialized
-- views. Prevent direct access to the materialized data and make ordinary
-- views run with the caller's permissions so the underlying table policies
-- remain the authorization boundary.
REVOKE ALL ON public.dashboard_metrics_mv FROM anon, authenticated;

ALTER VIEW public.daily_booking_stats SET (security_invoker = on);
ALTER VIEW public.service_popularity_stats SET (security_invoker = on);
ALTER VIEW public.user_status_overview SET (security_invoker = on);
ALTER VIEW public.available_slots_view SET (security_invoker = on);

REVOKE ALL ON public.daily_booking_stats FROM anon;
REVOKE ALL ON public.service_popularity_stats FROM anon;
REVOKE ALL ON public.user_status_overview FROM anon;

GRANT SELECT ON public.daily_booking_stats TO authenticated;
GRANT SELECT ON public.service_popularity_stats TO authenticated;
GRANT SELECT ON public.user_status_overview TO authenticated;
GRANT SELECT ON public.available_slots_view TO anon, authenticated;
