-- ============================================
-- CRITICAL SECURITY FIX: Views and Functions
-- Issue 1: Security Definer Views Bypass RLS
-- Issue 2: Functions Missing SET search_path Protection
-- ============================================

-- ============================================
-- PART 1: Fix Security Definer Views
-- Add security_invoker=true to prevent RLS bypass
-- ============================================

-- Drop and recreate public_bookings_view with security_invoker
DROP VIEW IF EXISTS public.public_bookings_view CASCADE;
CREATE VIEW public.public_bookings_view
WITH (security_invoker = true) AS
SELECT 
  id, calendar_id, service_type_id, customer_name, customer_email, customer_phone,
  start_time, end_time, status, notes, total_price, confirmation_token,
  confirmed_at, cancelled_at, cancellation_reason, created_at, booking_duration,
  business_name, service_name, payment_required, payment_status, payment_deadline,
  total_amount_cents, payment_currency
FROM public.bookings
WHERE confirmation_token IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = bookings.calendar_id 
      AND calendars.is_active = true
  );

-- Drop and recreate public_calendars_view with security_invoker
DROP VIEW IF EXISTS public.public_calendars_view CASCADE;
CREATE VIEW public.public_calendars_view
WITH (security_invoker = true) AS
SELECT id, name, slug, timezone, color, is_active, created_at
FROM public.calendars 
WHERE is_active = true;

-- Drop and recreate public_service_types_view with security_invoker
DROP VIEW IF EXISTS public.public_service_types_view CASCADE;
CREATE VIEW public.public_service_types_view
WITH (security_invoker = true) AS
SELECT 
  id, calendar_id, name, description, duration, price, color, is_active,
  max_attendees, preparation_time, cleanup_time, supports_installments,
  payment_description, created_at, service_category, tax_enabled, tax_behavior
FROM public.service_types 
WHERE is_active = true;

-- Drop and recreate public_calendar_view with security_invoker
DROP VIEW IF EXISTS public.public_calendar_view CASCADE;
CREATE VIEW public.public_calendar_view
WITH (security_invoker = true) AS
SELECT id, name, slug, timezone, is_active
FROM public.calendars 
WHERE is_active = true;

-- available_slots_view already has security_invoker from previous migration
-- Verify it's set correctly
DROP VIEW IF EXISTS public.available_slots_view CASCADE;
CREATE VIEW public.available_slots_view
WITH (security_invoker = true) AS
SELECT 
  c.id as calendar_id,
  c.name as calendar_name,
  c.slug as calendar_slug,
  st.id as service_type_id,
  st.name as service_name,
  st.duration as service_duration,
  st.price as service_price,
  NULL::timestamp with time zone as slot_start,
  NULL::timestamp with time zone as slot_end,
  false as is_available,
  st.duration as duration_minutes
FROM public.calendars c
CROSS JOIN public.service_types st
WHERE c.is_active = true
  AND st.is_active = true
  AND st.calendar_id = c.id
LIMIT 0;

-- ============================================
-- PART 2: Fix Functions Missing SET search_path
-- Add SET search_path = 'public' to SECURITY DEFINER functions
-- ============================================

-- Fix validate_booking_security function
CREATE OR REPLACE FUNCTION public.validate_booking_security(
  p_calendar_slug text,
  p_service_type_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_customer_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_calendar_id uuid;
  v_service_type record;
  v_existing_bookings integer;
  v_validation_result jsonb := jsonb_build_object('valid', true, 'errors', '[]'::jsonb);
  v_errors jsonb := '[]'::jsonb;
  v_now timestamp with time zone := now();
BEGIN
  -- Validate input parameters
  IF p_calendar_slug IS NULL OR p_calendar_slug = '' THEN
    v_errors := v_errors || jsonb_build_object('field', 'calendar_slug', 'message', 'Calendar slug is required');
  END IF;
  
  IF p_service_type_id IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'service_type_id', 'message', 'Service type is required');
  END IF;
  
  IF p_start_time IS NULL OR p_end_time IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'time', 'message', 'Start and end times are required');
  END IF;
  
  IF p_start_time <= v_now THEN
    v_errors := v_errors || jsonb_build_object('field', 'start_time', 'message', 'Cannot book in the past');
  END IF;
  
  IF p_start_time >= p_end_time THEN
    v_errors := v_errors || jsonb_build_object('field', 'time', 'message', 'End time must be after start time');
  END IF;
  
  -- Validate email format
  IF p_customer_email IS NULL OR p_customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    v_errors := v_errors || jsonb_build_object('field', 'customer_email', 'message', 'Valid email address is required');
  END IF;
  
  -- Get calendar
  SELECT id INTO v_calendar_id
  FROM calendars
  WHERE slug = p_calendar_slug AND is_active = true;
  
  IF v_calendar_id IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'calendar', 'message', 'Calendar not found or inactive');
  END IF;
  
  -- Validate service type
  SELECT * INTO v_service_type
  FROM service_types
  WHERE id = p_service_type_id 
    AND calendar_id = v_calendar_id 
    AND is_active = true;
  
  IF v_service_type IS NULL THEN
    v_errors := v_errors || jsonb_build_object('field', 'service_type', 'message', 'Service type not found or inactive');
  END IF;
  
  -- Check for conflicts
  IF v_calendar_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_bookings
    FROM bookings
    WHERE calendar_id = v_calendar_id
      AND status NOT IN ('cancelled', 'no-show')
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      );
    
    IF v_existing_bookings > 0 THEN
      v_errors := v_errors || jsonb_build_object('field', 'time_conflict', 'message', 'Time slot is already booked');
    END IF;
  END IF;
  
  -- Set validation result
  IF jsonb_array_length(v_errors) > 0 THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
  END IF;
  
  v_validation_result := jsonb_set(v_validation_result, '{errors}', v_errors);
  
  RETURN v_validation_result;
END;
$$;

-- Fix admin_apply_developer_status function
CREATE OR REPLACE FUNCTION public.admin_apply_developer_status(
  p_user_id uuid,
  p_status text,
  p_tier text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_trial_end TIMESTAMPTZ;
  v_subscription_end TIMESTAMPTZ;
  v_effective_tier subscription_tier;
  v_calendar_result JSONB;
  v_existing_sub_id UUID;
BEGIN
  -- CRITICAL: Check if caller is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  -- Normalize tier if provided
  IF p_tier IS NOT NULL AND p_tier <> '' THEN
    v_effective_tier := p_tier::subscription_tier;
  ELSE
    v_effective_tier := 'professional'::subscription_tier;
  END IF;

  -- Branch on requested developer status
  IF p_status = 'setup_incomplete' THEN
    v_trial_end := v_now + interval '30 days';

    UPDATE users SET
      subscription_status = 'trial',
      subscription_tier = 'professional',
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = NULL,
      business_type = NULL,
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

  ELSIF p_status = 'active_trial' THEN
    v_trial_end := v_now + interval '30 days';

    UPDATE users SET
      subscription_status = 'trial',
      subscription_tier = 'professional',
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'expired_trial' THEN
    v_trial_end := v_now - interval '1 day';

    UPDATE users SET
      subscription_status = 'expired',
      subscription_tier = NULL,
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'missed_payment' THEN
    v_subscription_end := v_now;

    UPDATE users SET
      subscription_status = 'missed_payment',
      subscription_tier = NULL,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, v_subscription_end, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'paid_subscriber' THEN
    v_subscription_end := v_now + interval '30 days';

    UPDATE users SET
      subscription_status = 'active',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), true, v_subscription_end, v_effective_tier::text);
    ELSE
      UPDATE subscribers
      SET subscribed = true,
          subscription_end = v_subscription_end,
          subscription_tier = v_effective_tier::text,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'canceled_but_active' THEN
    v_subscription_end := v_now + interval '7 days';

    UPDATE users SET
      subscription_status = 'canceled',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), true, v_subscription_end, v_effective_tier::text);
    ELSE
      UPDATE subscribers
      SET subscribed = true,
          subscription_end = v_subscription_end,
          subscription_tier = v_effective_tier::text,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'canceled_and_inactive' THEN
    v_subscription_end := v_now - interval '1 day';

    UPDATE users SET
      subscription_status = 'expired',
      subscription_tier = NULL,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM users WHERE id = p_user_id), ''), false, v_subscription_end, NULL);
    ELSE
      UPDATE subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown status');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'applied_status', p_status,
    'tier', COALESCE(p_tier, 'professional'),
    'calendar_result', COALESCE(v_calendar_result, jsonb_build_object('message','no_calendar_change')),
    'processed_at', v_now
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fix validate_payment_security function (already has SET search_path = '')
-- Just verify it's using 'public' or '' (both are secure)
-- Current version uses '', which is secure, so no change needed

-- Fix get_dashboard_metrics function (already has SET search_path = '')
-- Current version is secure, no change needed

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all views have security_invoker
-- SELECT viewname, viewowner 
-- FROM pg_views 
-- WHERE schemaname = 'public' 
--   AND viewname LIKE 'public_%' 
--   OR viewname = 'available_slots_view';

-- Verify all SECURITY DEFINER functions have search_path set
-- SELECT p.proname, p.prosecdef, pg_get_function_arguments(p.oid)
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.prosecdef = true
--   AND p.proname IN ('validate_booking_security', 'admin_apply_developer_status', 'validate_payment_security', 'get_dashboard_metrics');