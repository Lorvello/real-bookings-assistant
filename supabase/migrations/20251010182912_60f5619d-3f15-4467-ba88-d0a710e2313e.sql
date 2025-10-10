-- Enable RLS on new webhook tables
ALTER TABLE public.webhook_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_security_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhook_rate_limits (service role only)
CREATE POLICY "webhook_rate_limits_service_role_all"
  ON public.webhook_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create RLS policies for webhook_security_logs (service role only)
CREATE POLICY "webhook_security_logs_service_role_all"
  ON public.webhook_security_logs
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON POLICY "webhook_rate_limits_service_role_all" ON public.webhook_rate_limits IS 'Only edge functions (service role) can manage rate limit records';
COMMENT ON POLICY "webhook_security_logs_service_role_all" ON public.webhook_security_logs IS 'Only edge functions (service role) can manage security logs';