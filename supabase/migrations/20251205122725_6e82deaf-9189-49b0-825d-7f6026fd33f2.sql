-- ============================================
-- FIX 1: Secure Booking Token Access
-- ============================================

-- Create secure RPC function to get booking by token
CREATE OR REPLACE FUNCTION public.get_booking_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  calendar_id uuid,
  service_type_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  notes text,
  total_price numeric,
  service_name text,
  business_name text,
  confirmation_token text,
  created_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate token format
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN;
  END IF;
  
  -- Return booking only if token matches exactly
  RETURN QUERY
  SELECT 
    b.id,
    b.calendar_id,
    b.service_type_id,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.start_time,
    b.end_time,
    b.status,
    b.notes,
    b.total_price,
    b.service_name,
    b.business_name,
    b.confirmation_token,
    b.created_at,
    b.cancelled_at,
    b.cancellation_reason
  FROM bookings b
  JOIN calendars c ON b.calendar_id = c.id
  WHERE b.confirmation_token = p_token
    AND c.is_active = true
    AND COALESCE(b.is_deleted, false) = false
  LIMIT 1;
END;
$$;

-- Create secure RPC function to cancel booking by token
CREATE OR REPLACE FUNCTION public.cancel_booking_by_token(p_token text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_status text;
BEGIN
  -- Validate token format
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;
  
  -- Find and validate booking
  SELECT b.id, b.status INTO v_booking_id, v_status
  FROM bookings b
  JOIN calendars c ON b.calendar_id = c.id
  WHERE b.confirmation_token = p_token
    AND c.is_active = true
    AND COALESCE(b.is_deleted, false) = false;
  
  IF v_booking_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;
  
  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking already cancelled');
  END IF;
  
  -- Cancel the booking
  UPDATE bookings
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = COALESCE(p_reason, 'Cancelled by customer'),
    updated_at = NOW()
  WHERE id = v_booking_id;
  
  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;

-- Drop the vulnerable RLS policy that exposes all bookings with tokens
DROP POLICY IF EXISTS "bookings_view_own_by_token" ON bookings;

-- ============================================
-- FIX 2: Contact Meetings Data Exposure
-- ============================================

-- Drop the policy that allows anyone to read all contact meetings
DROP POLICY IF EXISTS "Anyone can check meeting availability" ON contact_meetings;

-- ============================================
-- FIX 3: Server-Side Auth Rate Limiting
-- ============================================

-- Create auth_rate_limits table
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  ip_address inet,
  attempt_count integer DEFAULT 0,
  first_attempt_at timestamptz DEFAULT NOW(),
  last_attempt_at timestamptz DEFAULT NOW(),
  blocked_until timestamptz,
  total_blocks integer DEFAULT 0,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(identifier)
);

-- Enable RLS on auth_rate_limits (no public access)
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_identifier ON auth_rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked_until ON auth_rate_limits(blocked_until) WHERE blocked_until IS NOT NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_auth_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_auth_rate_limits_updated_at ON auth_rate_limits;
CREATE TRIGGER update_auth_rate_limits_updated_at
  BEFORE UPDATE ON auth_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at_auth_rate_limits();

-- Create RPC function to check auth rate limit
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(p_email text, p_ip inet DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_max_attempts integer := 5;
  v_window_minutes integer := 15;
  v_window_start timestamptz;
  v_current_attempts integer := 0;
BEGIN
  -- Normalize email
  p_email := lower(trim(p_email));
  
  IF p_email IS NULL OR p_email = '' THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Invalid email');
  END IF;
  
  v_window_start := NOW() - (v_window_minutes || ' minutes')::interval;
  
  -- Get or create rate limit record
  SELECT * INTO v_record
  FROM auth_rate_limits
  WHERE identifier = p_email;
  
  IF v_record IS NULL THEN
    -- First attempt, allow it
    INSERT INTO auth_rate_limits (identifier, ip_address, attempt_count, first_attempt_at)
    VALUES (p_email, p_ip, 0, NOW());
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining_attempts', v_max_attempts,
      'blocked_until', null
    );
  END IF;
  
  -- Check if currently blocked
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining_attempts', 0,
      'blocked_until', v_record.blocked_until,
      'error', 'Too many failed attempts. Please try again later.'
    );
  END IF;
  
  -- Reset counter if window has passed
  IF v_record.first_attempt_at < v_window_start THEN
    UPDATE auth_rate_limits
    SET attempt_count = 0,
        first_attempt_at = NOW(),
        blocked_until = NULL
    WHERE identifier = p_email;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining_attempts', v_max_attempts,
      'blocked_until', null
    );
  END IF;
  
  -- Check if limit exceeded
  v_current_attempts := v_record.attempt_count;
  
  IF v_current_attempts >= v_max_attempts THEN
    -- Calculate block duration with exponential backoff: 5min, 15min, 1hr, 4hr, 24hr
    DECLARE
      v_block_minutes integer;
      v_block_until timestamptz;
    BEGIN
      v_block_minutes := CASE v_record.total_blocks
        WHEN 0 THEN 5
        WHEN 1 THEN 15
        WHEN 2 THEN 60
        WHEN 3 THEN 240
        ELSE 1440
      END;
      
      v_block_until := NOW() + (v_block_minutes || ' minutes')::interval;
      
      UPDATE auth_rate_limits
      SET blocked_until = v_block_until,
          total_blocks = total_blocks + 1
      WHERE identifier = p_email;
      
      RETURN jsonb_build_object(
        'allowed', false,
        'remaining_attempts', 0,
        'blocked_until', v_block_until,
        'error', 'Too many failed attempts. Please try again later.'
      );
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining_attempts', v_max_attempts - v_current_attempts,
    'blocked_until', null
  );
END;
$$;

-- Create RPC function to record auth attempt
CREATE OR REPLACE FUNCTION public.record_auth_attempt(p_email text, p_ip inet DEFAULT NULL, p_success boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalize email
  p_email := lower(trim(p_email));
  
  IF p_email IS NULL OR p_email = '' THEN
    RETURN;
  END IF;
  
  IF p_success THEN
    -- Reset counter on successful login
    UPDATE auth_rate_limits
    SET attempt_count = 0,
        blocked_until = NULL,
        last_attempt_at = NOW()
    WHERE identifier = p_email;
  ELSE
    -- Increment counter on failed attempt
    INSERT INTO auth_rate_limits (identifier, ip_address, attempt_count, first_attempt_at, last_attempt_at)
    VALUES (p_email, p_ip, 1, NOW(), NOW())
    ON CONFLICT (identifier) DO UPDATE
    SET attempt_count = auth_rate_limits.attempt_count + 1,
        last_attempt_at = NOW(),
        ip_address = COALESCE(p_ip, auth_rate_limits.ip_address);
  END IF;
END;
$$;