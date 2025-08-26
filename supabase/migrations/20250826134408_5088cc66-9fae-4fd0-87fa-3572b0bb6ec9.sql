-- Security Enhancement: Anti-Card Testing Protection
-- Create comprehensive security infrastructure to prevent payment abuse

-- 1. Payment Rate Limits Table
CREATE TABLE public.payment_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  blocked_until TIMESTAMP WITH TIME ZONE,
  first_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_blocks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Payment Security Logs Table
CREATE TABLE public.payment_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'rate_limit', 'suspicious_amount', 'geo_block', 'captcha_fail', etc.
  ip_address INET,
  user_id UUID REFERENCES auth.users(id),
  booking_id UUID REFERENCES public.bookings(id),
  amount_cents INTEGER,
  currency TEXT,
  user_agent TEXT,
  request_data JSONB,
  block_reason TEXT,
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Security Settings Table
CREATE TABLE public.payment_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE,
  rate_limit_attempts INTEGER DEFAULT 3,
  rate_limit_window_minutes INTEGER DEFAULT 10,
  min_payment_amount_cents INTEGER DEFAULT 500, -- €5.00 minimum
  max_payment_amount_cents INTEGER DEFAULT 50000, -- €500.00 maximum
  blocked_countries TEXT[] DEFAULT ARRAY[]::TEXT[],
  require_captcha_threshold INTEGER DEFAULT 2,
  card_testing_detection_enabled BOOLEAN DEFAULT true,
  suspicious_amount_threshold_cents INTEGER DEFAULT 100, -- Flag amounts under €1.00
  max_cards_per_user_per_day INTEGER DEFAULT 3,
  new_user_payment_delay_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Blocked IPs Table
CREATE TABLE public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  blocked_until TIMESTAMP WITH TIME ZONE,
  block_reason TEXT NOT NULL,
  blocked_by TEXT DEFAULT 'system',
  permanent_block BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payment_rate_limits_ip ON public.payment_rate_limits(ip_address);
CREATE INDEX idx_payment_rate_limits_blocked_until ON public.payment_rate_limits(blocked_until);
CREATE INDEX idx_payment_security_logs_ip ON public.payment_security_logs(ip_address);
CREATE INDEX idx_payment_security_logs_event_type ON public.payment_security_logs(event_type);
CREATE INDEX idx_payment_security_logs_created_at ON public.payment_security_logs(created_at);
CREATE INDEX idx_blocked_ips_ip ON public.blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_blocked_until ON public.blocked_ips(blocked_until);

-- Security validation functions
CREATE OR REPLACE FUNCTION public.check_payment_rate_limit(p_ip_address INET, p_calendar_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.validate_payment_security(
  p_ip_address INET,
  p_calendar_id UUID,
  p_amount_cents INTEGER,
  p_currency TEXT,
  p_user_email TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_settings RECORD;
  v_validation_result JSONB := jsonb_build_object('valid', true, 'warnings', '[]'::jsonb);
  v_warnings JSONB := '[]'::jsonb;
  v_user_id UUID;
  v_user_created_at TIMESTAMP WITH TIME ZONE;
  v_recent_cards INTEGER;
BEGIN
  -- Get security settings
  SELECT * INTO v_settings
  FROM public.payment_security_settings
  WHERE calendar_id = p_calendar_id;
  
  -- Use defaults if no settings
  IF v_settings IS NULL THEN
    v_settings := ROW(
      gen_random_uuid(), p_calendar_id, 3, 10, 500, 50000, 
      ARRAY[]::TEXT[], 2, true, 100, 3, 24, NOW(), NOW()
    );
  END IF;
  
  -- 1. Amount validation
  IF p_amount_cents < v_settings.min_payment_amount_cents THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'amount_too_low',
      'message', 'Payment amount below minimum threshold',
      'amount', p_amount_cents,
      'minimum', v_settings.min_payment_amount_cents
    );
  END IF;
  
  IF p_amount_cents > v_settings.max_payment_amount_cents THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'amount_too_high',
      'message', 'Payment amount above maximum threshold',
      'amount', p_amount_cents,
      'maximum', v_settings.max_payment_amount_cents
    );
  END IF;
  
  -- 2. Suspicious amount detection (card testing pattern)
  IF v_settings.card_testing_detection_enabled AND p_amount_cents <= v_settings.suspicious_amount_threshold_cents THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'suspicious_amount',
      'message', 'Small amount payment detected (possible card testing)',
      'amount', p_amount_cents,
      'severity', 'high'
    );
  END IF;
  
  -- 3. Country blocking
  IF p_country_code IS NOT NULL AND p_country_code = ANY(v_settings.blocked_countries) THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'geo_blocked',
      'message', 'Payment from blocked country',
      'country', p_country_code
    );
  END IF;
  
  -- 4. User age validation (new user protection)
  SELECT id, created_at INTO v_user_id, v_user_created_at
  FROM auth.users
  WHERE email = p_user_email;
  
  IF v_user_created_at IS NOT NULL AND 
     v_user_created_at > NOW() - (v_settings.new_user_payment_delay_hours || ' hours')::INTERVAL THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'new_user_warning',
      'message', 'Payment from newly created user account',
      'user_age_hours', EXTRACT(EPOCH FROM (NOW() - v_user_created_at))/3600,
      'severity', 'medium'
    );
  END IF;
  
  -- 5. Check for disposable email domains
  IF p_user_email SIMILAR TO '%@(10minutemail|guerrillamail|tempmail|mailinator|throwaway)%' THEN
    v_validation_result := jsonb_set(v_validation_result, '{valid}', 'false');
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'disposable_email',
      'message', 'Disposable email address detected',
      'email', p_user_email
    );
  END IF;
  
  -- Set warnings in result
  v_validation_result := jsonb_set(v_validation_result, '{warnings}', v_warnings);
  
  -- Log validation result if there are warnings
  IF jsonb_array_length(v_warnings) > 0 THEN
    INSERT INTO public.payment_security_logs (
      event_type, ip_address, amount_cents, currency, user_agent, 
      request_data, severity
    ) VALUES (
      'payment_validation', p_ip_address, p_amount_cents, p_currency, p_user_agent,
      jsonb_build_object(
        'email', p_user_email,
        'country', p_country_code,
        'validation_result', v_validation_result
      ),
      CASE WHEN (v_validation_result->>'valid')::boolean THEN 'medium' ELSE 'high' END
    );
  END IF;
  
  RETURN v_validation_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_payment_attempt(
  p_ip_address INET,
  p_calendar_id UUID,
  p_success BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at_payment_security_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_payment_security_settings_updated_at
  BEFORE UPDATE ON public.payment_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_payment_security_settings();

CREATE OR REPLACE FUNCTION public.handle_updated_at_payment_rate_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_payment_rate_limits_updated_at
  BEFORE UPDATE ON public.payment_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_payment_rate_limits();

-- Enable RLS on security tables
ALTER TABLE public.payment_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security tables
CREATE POLICY "payment_security_settings_access" ON public.payment_security_settings
  FOR ALL USING (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "payment_security_logs_read" ON public.payment_security_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.calendars c
      JOIN public.booking_payments bp ON bp.booking_id IN (
        SELECT id FROM public.bookings WHERE calendar_id = c.id
      )
      WHERE c.user_id = auth.uid()
    )
  );

-- Service role can access all security data
CREATE POLICY "service_role_all_access_payment_rate_limits" ON public.payment_rate_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "service_role_all_access_payment_security_logs" ON public.payment_security_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "service_role_all_access_blocked_ips" ON public.blocked_ips
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');