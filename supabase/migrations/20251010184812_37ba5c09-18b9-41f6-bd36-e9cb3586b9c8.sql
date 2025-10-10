-- ============================================
-- PUBLIC ACCESS SECURITY HARDENING - PHASE 1 + 2
-- Fixed: IMMUTABLE function requirement for indexes
-- ============================================

-- 1. DROP EXISTING VIEWS
DROP VIEW IF EXISTS public.public_service_types_view CASCADE;
DROP VIEW IF EXISTS public.public_calendars_view CASCADE;
DROP VIEW IF EXISTS public.public_bookings_view CASCADE;

-- 2. CREATE SECURE PUBLIC VIEWS (Exclude sensitive columns)

CREATE VIEW public.public_bookings_view AS
SELECT 
  id, calendar_id, service_type_id, customer_name, customer_email, customer_phone,
  start_time, end_time, status, notes, total_price, confirmation_token,
  confirmed_at, cancelled_at, cancellation_reason, created_at, booking_duration,
  business_name, service_name, payment_required, payment_status, payment_deadline,
  total_amount_cents, payment_currency
FROM public.bookings
WHERE confirmation_token IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.calendars WHERE calendars.id = bookings.calendar_id AND calendars.is_active = true);

CREATE VIEW public.public_calendars_view AS
SELECT id, name, slug, timezone, color, is_active, created_at
FROM public.calendars WHERE is_active = true;

CREATE VIEW public.public_service_types_view AS
SELECT 
  id, calendar_id, name, description, duration, price, color, is_active,
  max_attendees, preparation_time, cleanup_time, supports_installments,
  payment_description, created_at, service_category, tax_enabled, tax_behavior
FROM public.service_types WHERE is_active = true;

-- 3. ADD SOFT DELETE SUPPORT

ALTER TABLE public.calendars ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.calendars ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE public.service_types ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.service_types ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- 4. UPDATE PUBLIC POLICIES

DROP POLICY IF EXISTS "calendars_public_view" ON public.calendars;
CREATE POLICY "calendars_public_view" ON public.calendars FOR SELECT 
USING (is_active = true AND COALESCE(is_deleted, false) = false);

DROP POLICY IF EXISTS "service_types_public_booking_access" ON public.service_types;
CREATE POLICY "service_types_public_booking_access" ON public.service_types FOR SELECT 
USING (
  is_active = true AND COALESCE(is_deleted, false) = false
  AND EXISTS (SELECT 1 FROM public.calendars c WHERE c.id = service_types.calendar_id AND c.is_active = true AND COALESCE(c.is_deleted, false) = false)
);

-- 5. ADD PERFORMANCE INDEXES

CREATE INDEX IF NOT EXISTS idx_calendars_not_deleted ON public.calendars(id, slug) 
WHERE COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS idx_calendars_public_active ON public.calendars(slug)
WHERE is_active = true AND COALESCE(is_deleted, false) = false;

CREATE INDEX IF NOT EXISTS idx_service_types_not_deleted ON public.service_types(calendar_id, id) 
WHERE COALESCE(is_deleted, false) = false AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_bookings_not_deleted ON public.bookings(calendar_id, start_time) 
WHERE COALESCE(is_deleted, false) = false AND status NOT IN ('cancelled', 'no-show');

CREATE INDEX IF NOT EXISTS idx_availability_rules_schedule_lookup ON public.availability_rules(schedule_id) 
WHERE is_available = true;

-- 6. HARDEN get_business_available_slots FUNCTION

CREATE OR REPLACE FUNCTION public.get_business_available_slots(
  p_calendar_slug text,
  p_service_type_id uuid DEFAULT NULL,
  p_start_date date DEFAULT CURRENT_DATE,
  p_days integer DEFAULT 14
)
RETURNS TABLE(
  calendar_id uuid, calendar_name text, service_type_id uuid, service_name text,
  service_duration integer, service_price numeric, slot_start timestamp with time zone,
  slot_end timestamp with time zone, is_available boolean, duration_minutes integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_calendar_id uuid;
  v_calendar_name text;
BEGIN
  IF p_calendar_slug IS NULL OR trim(p_calendar_slug) = '' THEN
    RAISE EXCEPTION 'Invalid calendar_slug';
  END IF;
  
  IF p_days < 1 OR p_days > 90 THEN
    RAISE EXCEPTION 'Days must be between 1 and 90';
  END IF;
  
  IF p_start_date > CURRENT_DATE + interval '1 year' OR p_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Invalid start_date';
  END IF;
  
  SELECT c.id, c.name INTO v_calendar_id, v_calendar_name
  FROM public.calendars c
  WHERE c.slug = p_calendar_slug AND c.is_active = true AND COALESCE(c.is_deleted, false) = false;
  
  IF v_calendar_id IS NULL THEN
    RAISE EXCEPTION 'Calendar not found';
  END IF;
  
  INSERT INTO public.security_events_log (event_type, calendar_id, event_data, severity)
  VALUES ('public_availability_query', v_calendar_id, jsonb_build_object('days', p_days), 'info');
  
  RETURN QUERY
  WITH RECURSIVE date_series AS (
    SELECT p_start_date AS date
    UNION ALL
    SELECT date + 1 FROM date_series WHERE date < p_start_date + (p_days - 1)
  )
  SELECT 
    v_calendar_id, v_calendar_name, st.id, st.name, st.duration, st.price,
    (ds.date + ar.start_time)::timestamptz,
    (ds.date + ar.start_time + (st.duration || ' minutes')::interval)::timestamptz,
    NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.calendar_id = v_calendar_id
        AND COALESCE(b.is_deleted, false) = false
        AND b.status NOT IN ('cancelled', 'no-show')
        AND tstzrange(b.start_time, b.end_time) && tstzrange(
          (ds.date + ar.start_time)::timestamptz,
          (ds.date + ar.start_time + (st.duration || ' minutes')::interval)::timestamptz
        )
    ),
    st.duration
  FROM date_series ds
  CROSS JOIN public.service_types st
  JOIN public.availability_schedules asch ON asch.calendar_id = v_calendar_id
  JOIN public.availability_rules ar ON ar.schedule_id = asch.id
  WHERE st.calendar_id = v_calendar_id
    AND st.is_active = true
    AND COALESCE(st.is_deleted, false) = false
    AND (p_service_type_id IS NULL OR st.id = p_service_type_id)
    AND asch.is_default = true
    AND ar.is_available = true
    AND ar.day_of_week = CASE WHEN EXTRACT(DOW FROM ds.date) = 0 THEN 7 ELSE EXTRACT(DOW FROM ds.date)::integer END
    AND (ds.date + ar.start_time + (st.duration || ' minutes')::interval)::time <= ar.end_time
  ORDER BY 7, 4;
END;
$$;

-- 7. CREATE RATE LIMITING INFRASTRUCTURE

CREATE TABLE IF NOT EXISTS public.public_api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  calendar_slug text,
  endpoint text NOT NULL DEFAULT 'availability',
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  total_blocks integer DEFAULT 0,
  last_violation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_window ON public.public_api_rate_limits(ip_address, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_calendar_window ON public.public_api_rate_limits(calendar_slug, window_start DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint_unique ON public.public_api_rate_limits(ip_address, endpoint);

ALTER TABLE public.public_api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_access_public_rate_limits" ON public.public_api_rate_limits FOR ALL USING (auth.role() = 'service_role');

-- 8. CREATE RATE LIMIT CHECK FUNCTION

CREATE OR REPLACE FUNCTION public.check_public_rate_limit(
  p_ip_address inet,
  p_calendar_slug text DEFAULT NULL,
  p_endpoint text DEFAULT 'availability',
  p_rate_limit integer DEFAULT 10,
  p_window_minutes integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  v_current_count integer;
  v_window_start timestamp with time zone;
  v_blocked_until timestamp with time zone;
  v_total_blocks integer;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  SELECT blocked_until, total_blocks INTO v_blocked_until, v_total_blocks
  FROM public.public_api_rate_limits
  WHERE ip_address = p_ip_address AND endpoint = p_endpoint AND blocked_until > now()
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_blocked_until IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retry_after_seconds', EXTRACT(EPOCH FROM (v_blocked_until - now()))::integer);
  END IF;
  
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.public_api_rate_limits
  WHERE ip_address = p_ip_address AND endpoint = p_endpoint AND window_start >= v_window_start;
  
  IF v_current_count >= p_rate_limit THEN
    v_total_blocks := COALESCE(v_total_blocks, 0) + 1;
    v_blocked_until := now() + (p_window_minutes * POWER(2, LEAST(v_total_blocks, 6)) || ' minutes')::interval;
    
    INSERT INTO public.public_api_rate_limits (ip_address, calendar_slug, endpoint, request_count, window_start, blocked_until, total_blocks, last_violation_reason)
    VALUES (p_ip_address, p_calendar_slug, p_endpoint, v_current_count, v_window_start, v_blocked_until, v_total_blocks,
      format('Exceeded %s requests in %s minutes', p_rate_limit, p_window_minutes))
    ON CONFLICT (ip_address, endpoint) DO UPDATE 
    SET blocked_until = EXCLUDED.blocked_until, total_blocks = EXCLUDED.total_blocks, updated_at = now();
    
    INSERT INTO public.security_events_log (event_type, ip_address, event_data, severity)
    VALUES ('rate_limit_exceeded', p_ip_address, jsonb_build_object('endpoint', p_endpoint), 'high');
    
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limited', 'retry_after_seconds', EXTRACT(EPOCH FROM (v_blocked_until - now()))::integer);
  END IF;
  
  INSERT INTO public.public_api_rate_limits (ip_address, calendar_slug, endpoint)
  VALUES (p_ip_address, p_calendar_slug, p_endpoint)
  ON CONFLICT (ip_address, endpoint) DO UPDATE 
  SET request_count = public.public_api_rate_limits.request_count + 1, updated_at = now();
  
  RETURN jsonb_build_object('allowed', true, 'remaining', p_rate_limit - v_current_count - 1);
END;
$$;