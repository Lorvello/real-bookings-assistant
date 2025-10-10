-- Create webhook rate limiting table
CREATE TABLE IF NOT EXISTS public.webhook_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ip_address, window_start)
);

CREATE INDEX idx_webhook_rate_limits_ip ON public.webhook_rate_limits(ip_address);
CREATE INDEX idx_webhook_rate_limits_window ON public.webhook_rate_limits(window_start);

-- Create webhook security logging table
CREATE TABLE IF NOT EXISTS public.webhook_security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('verification_success', 'verification_failed', 'signature_invalid', 'rate_limit_exceeded')),
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_security_logs_type ON public.webhook_security_logs(event_type);
CREATE INDEX idx_webhook_security_logs_created ON public.webhook_security_logs(created_at DESC);

COMMENT ON TABLE public.webhook_rate_limits IS 'Rate limiting for webhook endpoints to prevent flooding';
COMMENT ON TABLE public.webhook_security_logs IS 'Security event logging for webhook verification and authentication';