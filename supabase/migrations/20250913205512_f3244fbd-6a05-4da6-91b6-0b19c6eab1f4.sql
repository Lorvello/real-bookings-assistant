-- Security Hardening: Phase 2 - Fix Security Linter Issues

-- 1. Fix security definer views - Convert to regular views
DROP VIEW IF EXISTS public.public_calendar_view;
DROP VIEW IF EXISTS public.public_service_types_view;

-- Create regular views instead of security definer views
CREATE OR REPLACE VIEW public.public_calendar_view AS
SELECT 
  id,
  slug,
  name,
  timezone,
  is_active
FROM public.calendars
WHERE is_active = true;

CREATE OR REPLACE VIEW public.public_service_types_view AS
SELECT 
  st.id,
  st.calendar_id,
  st.name,
  st.duration,
  st.price,
  st.description,
  st.color,
  st.is_active
FROM public.service_types st
JOIN public.calendars c ON c.id = st.calendar_id
WHERE st.is_active = true AND c.is_active = true;

-- 2. Add proper search_path to all existing functions that are missing it
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

CREATE OR REPLACE FUNCTION public.handle_updated_at_whatsapp_payment_sessions()
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

CREATE OR REPLACE FUNCTION public.handle_updated_at_service_installment_configs()
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

CREATE OR REPLACE FUNCTION public.handle_updated_at_tax_configurations()
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

CREATE OR REPLACE FUNCTION public.handle_updated_at_business_countries()
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

CREATE OR REPLACE FUNCTION public.handle_updated_at_tax_thresholds()
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

-- 3. Update check_payment_rate_limit with search_path
CREATE OR REPLACE FUNCTION public.check_payment_rate_limit(p_ip_address inet, p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_settings RECORD;
  v_rate_limit RECORD;
  v_current_attempts INTEGER := 0;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_is_blocked BOOLEAN := false;
  v_block_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get security settings for calendar
  SELECT * INTO v_settings
  FROM public.payment_security_settings
  WHERE calendar_id = p_calendar_id;
  
  -- Use default settings if none exist
  IF v_settings IS NULL THEN
    SELECT 3 as rate_limit_attempts, 10 as rate_limit_window_minutes INTO v_settings;
  END IF;
  
  v_window_start := NOW() - (v_settings.rate_limit_window_minutes || ' minutes')::INTERVAL;
  
  -- Check if IP is permanently blocked
  SELECT blocked_until INTO v_block_until
  FROM public.blocked_ips
  WHERE ip_address = p_ip_address
    AND (permanent_block = true OR blocked_until > NOW());
  
  IF v_block_until IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ip_blocked',
      'blocked_until', v_block_until
    );
  END IF;
  
  -- Get or create rate limit record
  SELECT * INTO v_rate_limit
  FROM public.payment_rate_limits
  WHERE ip_address = p_ip_address;
  
  IF v_rate_limit IS NULL THEN
    INSERT INTO public.payment_rate_limits (ip_address, attempt_count)
    VALUES (p_ip_address, 0)
    RETURNING * INTO v_rate_limit;
  END IF;
  
  -- Check if currently blocked
  IF v_rate_limit.blocked_until IS NOT NULL AND v_rate_limit.blocked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'blocked_until', v_rate_limit.blocked_until,
      'attempts', v_rate_limit.attempt_count
    );
  END IF;
  
  -- Reset counter if window has passed
  IF v_rate_limit.first_attempt_at < v_window_start THEN
    UPDATE public.payment_rate_limits
    SET attempt_count = 0,
        first_attempt_at = NOW(),
        blocked_until = NULL
    WHERE ip_address = p_ip_address;
    v_current_attempts := 0;
  ELSE
    v_current_attempts := v_rate_limit.attempt_count;
  END IF;
  
  -- Check if limit exceeded
  IF v_current_attempts >= v_settings.rate_limit_attempts THEN
    -- Block for exponential backoff: 10 min * 2^(total_blocks)
    v_block_until := NOW() + (v_settings.rate_limit_window_minutes * POWER(2, LEAST(v_rate_limit.total_blocks, 6)) || ' minutes')::INTERVAL;
    
    UPDATE public.payment_rate_limits
    SET blocked_until = v_block_until,
        total_blocks = total_blocks + 1,
        last_attempt_at = NOW()
    WHERE ip_address = p_ip_address;
    
    -- Log the block
    INSERT INTO public.payment_security_logs (
      event_type, ip_address, block_reason, severity, request_data
    ) VALUES (
      'rate_limit_exceeded', p_ip_address, 
      'Too many payment attempts from IP', 'high',
      jsonb_build_object('attempts', v_current_attempts, 'blocked_until', v_block_until)
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'blocked_until', v_block_until,
      'attempts', v_current_attempts
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'attempts', v_current_attempts,
    'remaining', v_settings.rate_limit_attempts - v_current_attempts
  );
END;
$function$;

-- 4. Update record_payment_attempt with search_path
CREATE OR REPLACE FUNCTION public.record_payment_attempt(p_ip_address inet, p_calendar_id uuid, p_success boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Update rate limit counter
  INSERT INTO public.payment_rate_limits (ip_address, attempt_count, last_attempt_at)
  VALUES (p_ip_address, 1, NOW())
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    attempt_count = CASE 
      WHEN payment_rate_limits.first_attempt_at < NOW() - INTERVAL '10 minutes' 
      THEN 1 
      ELSE payment_rate_limits.attempt_count + 1 
    END,
    last_attempt_at = NOW(),
    first_attempt_at = CASE 
      WHEN payment_rate_limits.first_attempt_at < NOW() - INTERVAL '10 minutes' 
      THEN NOW() 
      ELSE payment_rate_limits.first_attempt_at 
    END;
    
  -- Reset attempt counter on successful payment
  IF p_success THEN
    UPDATE public.payment_rate_limits
    SET attempt_count = 0,
        blocked_until = NULL
    WHERE ip_address = p_ip_address;
  END IF;
END;
$function$;

-- 5. Update create_default_payment_settings with search_path
CREATE OR REPLACE FUNCTION public.create_default_payment_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- 6. Update trigger_business_overview_refresh with search_path
CREATE OR REPLACE FUNCTION public.trigger_business_overview_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Schedule refresh in background to avoid blocking the transaction
  PERFORM pg_notify('refresh_business_overview', 'refresh_needed');
  RETURN COALESCE(NEW, OLD);
END;
$function$;