-- Critical Security Fixes - Phase 1: Database Protection

-- 1. Fix remaining database functions missing SET search_path = ''
DROP FUNCTION IF EXISTS public.get_formatted_business_hours(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_formatted_business_hours(p_calendar_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result text := '';
  v_rule record;
  v_day_name text;
BEGIN
  FOR v_rule IN 
    SELECT ar.day_of_week, ar.start_time, ar.end_time, ar.is_available
    FROM public.availability_rules ar
    JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
    WHERE sch.calendar_id = p_calendar_id
      AND sch.is_default = true
    ORDER BY ar.day_of_week
  LOOP
    v_day_name := CASE v_rule.day_of_week
      WHEN 1 THEN 'Maandag'
      WHEN 2 THEN 'Dinsdag'
      WHEN 3 THEN 'Woensdag'
      WHEN 4 THEN 'Donderdag'
      WHEN 5 THEN 'Vrijdag'
      WHEN 6 THEN 'Zaterdag'
      WHEN 7 THEN 'Zondag'
      ELSE 'Onbekend'
    END;
    
    IF v_rule.is_available THEN
      v_result := v_result || v_day_name || ': ' || 
                  v_rule.start_time::text || ' - ' || 
                  v_rule.end_time::text || E'\n';
    ELSE
      v_result := v_result || v_day_name || ': Gesloten' || E'\n';
    END IF;
  END LOOP;
  
  RETURN TRIM(v_result);
END;
$function$;

DROP FUNCTION IF EXISTS public.create_team_member_user(text, text, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.create_team_member_user(p_email text, p_full_name text, p_calendar_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_user_id uuid;
  v_calendar_owner uuid;
BEGIN
  SELECT user_id INTO v_calendar_owner
  FROM public.calendars
  WHERE id = p_calendar_id;
  
  IF v_calendar_owner != auth.uid() THEN
    RAISE EXCEPTION 'Only calendar owners can create team members';
  END IF;
  
  SELECT id INTO v_new_user_id
  FROM public.users
  WHERE email = p_email;
  
  IF v_new_user_id IS NOT NULL THEN
    RETURN v_new_user_id;
  END IF;
  
  v_new_user_id := gen_random_uuid();
  
  INSERT INTO public.users (
    id, email, full_name, created_at, updated_at
  ) VALUES (
    v_new_user_id, p_email, p_full_name, now(), now()
  );
  
  RETURN v_new_user_id;
END;
$function$;

-- 2. Secure public table access - Update RLS policies
DROP POLICY IF EXISTS "calendars_public_view" ON public.calendars;
CREATE POLICY "calendars_public_view" ON public.calendars
FOR SELECT USING (
  is_active = true AND 
  id IN (
    SELECT DISTINCT calendar_id 
    FROM public.service_types 
    WHERE is_active = true
  )
);

DROP POLICY IF EXISTS "service_types_public_view" ON public.service_types;
CREATE POLICY "service_types_public_view" ON public.service_types
FOR SELECT USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM public.calendars c 
    WHERE c.id = service_types.calendar_id 
    AND c.is_active = true
  )
);

-- 3. Secure booking creation with validation
DROP POLICY IF EXISTS "bookings_public_create" ON public.bookings;
CREATE POLICY "bookings_public_create" ON public.bookings
FOR INSERT WITH CHECK (
  -- Calendar must be active
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE id = calendar_id AND is_active = true
  ) AND
  -- Service type must be active and belong to calendar
  EXISTS (
    SELECT 1 FROM public.service_types st
    WHERE st.id = service_type_id 
    AND st.calendar_id = bookings.calendar_id
    AND st.is_active = true
  ) AND
  -- Start time must be in the future
  start_time > NOW() AND
  -- End time must be after start time
  end_time > start_time AND
  -- Customer name and email must be provided
  customer_name IS NOT NULL AND 
  customer_name != '' AND
  customer_email IS NOT NULL AND 
  customer_email != '' AND
  -- Valid email format
  customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- 4. Create secure booking validation function
CREATE OR REPLACE FUNCTION public.validate_booking_security(
  p_calendar_id uuid,
  p_service_type_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_customer_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking_count integer;
  v_calendar_active boolean;
  v_service_active boolean;
BEGIN
  -- Check calendar is active
  SELECT is_active INTO v_calendar_active
  FROM public.calendars
  WHERE id = p_calendar_id;
  
  IF NOT v_calendar_active THEN
    RETURN false;
  END IF;
  
  -- Check service type is active and belongs to calendar
  SELECT is_active INTO v_service_active
  FROM public.service_types
  WHERE id = p_service_type_id AND calendar_id = p_calendar_id;
  
  IF NOT v_service_active THEN
    RETURN false;
  END IF;
  
  -- Check for conflicts
  SELECT COUNT(*) INTO v_booking_count
  FROM public.bookings
  WHERE calendar_id = p_calendar_id
    AND status NOT IN ('cancelled', 'no-show')
    AND (
      (p_start_time >= start_time AND p_start_time < end_time) OR
      (p_end_time > start_time AND p_end_time <= end_time) OR
      (p_start_time <= start_time AND p_end_time >= end_time)
    );
  
  -- No conflicts allowed
  RETURN v_booking_count = 0;
END;
$function$;

-- 5. Add rate limiting table for booking creation
CREATE TABLE IF NOT EXISTS public.booking_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  calendar_id uuid NOT NULL,
  attempt_count integer DEFAULT 1,
  first_attempt_at timestamp with time zone DEFAULT NOW(),
  last_attempt_at timestamp with time zone DEFAULT NOW(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on rate limiting table
ALTER TABLE public.booking_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "booking_rate_limits_system_only" ON public.booking_rate_limits
FOR ALL USING (auth.role() = 'service_role');

-- 6. Create booking rate limit check function
CREATE OR REPLACE FUNCTION public.check_booking_rate_limit(
  p_ip_address inet,
  p_calendar_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_rate_limit record;
  v_max_attempts integer := 5;
  v_window_minutes integer := 60;
  v_block_minutes integer := 30;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := NOW() - (v_window_minutes || ' minutes')::interval;
  
  -- Get or create rate limit record
  SELECT * INTO v_rate_limit
  FROM public.booking_rate_limits
  WHERE ip_address = p_ip_address AND calendar_id = p_calendar_id;
  
  -- Check if currently blocked
  IF v_rate_limit.blocked_until IS NOT NULL AND v_rate_limit.blocked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'blocked_until', v_rate_limit.blocked_until
    );
  END IF;
  
  -- Reset if window has passed
  IF v_rate_limit.first_attempt_at IS NULL OR v_rate_limit.first_attempt_at < v_window_start THEN
    INSERT INTO public.booking_rate_limits (ip_address, calendar_id, attempt_count)
    VALUES (p_ip_address, p_calendar_id, 1)
    ON CONFLICT (ip_address, calendar_id) DO UPDATE SET
      attempt_count = 1,
      first_attempt_at = NOW(),
      last_attempt_at = NOW(),
      blocked_until = NULL,
      updated_at = NOW();
    
    RETURN jsonb_build_object('allowed', true);
  END IF;
  
  -- Check rate limit
  IF v_rate_limit.attempt_count >= v_max_attempts THEN
    -- Block for specified duration
    UPDATE public.booking_rate_limits
    SET blocked_until = NOW() + (v_block_minutes || ' minutes')::interval,
        updated_at = NOW()
    WHERE ip_address = p_ip_address AND calendar_id = p_calendar_id;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'blocked_until', NOW() + (v_block_minutes || ' minutes')::interval
    );
  END IF;
  
  -- Increment counter
  UPDATE public.booking_rate_limits
  SET attempt_count = attempt_count + 1,
      last_attempt_at = NOW(),
      updated_at = NOW()
  WHERE ip_address = p_ip_address AND calendar_id = p_calendar_id;
  
  RETURN jsonb_build_object('allowed', true);
END;
$function$;

-- Add unique constraint for rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_rate_limits_ip_calendar 
ON public.booking_rate_limits(ip_address, calendar_id);

-- 7. Create security event logging
CREATE TABLE IF NOT EXISTS public.security_events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text DEFAULT 'medium',
  ip_address inet,
  user_agent text,
  calendar_id uuid,
  user_id uuid,
  event_data jsonb DEFAULT '{}',
  blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT NOW()
);

ALTER TABLE public.security_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_events_system_only" ON public.security_events_log
FOR ALL USING (auth.role() = 'service_role');

-- 8. Remove materialized view public access (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'dashboard_metrics_mv') THEN
    ALTER MATERIALIZED VIEW public.dashboard_metrics_mv OWNER TO postgres;
    REVOKE ALL ON public.dashboard_metrics_mv FROM anon, authenticated;
  END IF;
END $$;