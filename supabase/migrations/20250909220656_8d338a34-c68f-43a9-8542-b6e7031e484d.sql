-- Fix all database function search path security warnings
-- This ensures all functions use secure search paths to prevent security vulnerabilities

-- 1. Update all existing functions to have secure search paths
CREATE OR REPLACE FUNCTION public.handle_updated_at_business_stripe_accounts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
 SET search_path TO ''
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
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_whatsapp_payment_sessions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_service_installment_configs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_tax_configurations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_business_countries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at_tax_thresholds()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
 SET search_path TO ''
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
 SET search_path TO ''
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
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update trigger_business_overview_refresh to have secure search path
CREATE OR REPLACE FUNCTION public.trigger_business_overview_refresh()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Schedule refresh in background to avoid blocking the transaction
  PERFORM pg_notify('refresh_business_overview', 'refresh_needed');
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create a function to automatically create default payment settings for new calendars
CREATE OR REPLACE FUNCTION public.create_default_payment_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Create default payment settings for new calendar
  INSERT INTO public.payment_settings (
    calendar_id,
    payment_required_for_booking,
    secure_payments_enabled,
    auto_cancel_unpaid_bookings,
    payment_deadline_hours,
    allow_partial_refunds,
    platform_fee_percentage,
    enabled_payment_methods,
    payout_option
  ) VALUES (
    NEW.id,
    false,
    false,
    true,
    24,
    true,
    2.50,
    '["ideal"]'::jsonb,
    'standard'
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger to automatically create payment settings for new calendars
DROP TRIGGER IF EXISTS trigger_create_default_payment_settings ON public.calendars;
CREATE TRIGGER trigger_create_default_payment_settings
  AFTER INSERT ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_payment_settings();