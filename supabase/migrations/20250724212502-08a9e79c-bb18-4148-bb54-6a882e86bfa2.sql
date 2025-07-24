-- Critical Security Fixes Migration (Fixed)

-- 1. Add search_path security to remaining functions
CREATE OR REPLACE FUNCTION public.test_webhook_system(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  test_webhook_id uuid;
  endpoint_count integer;
  result jsonb;
BEGIN
  -- Check actieve webhook endpoints
  SELECT COUNT(*) INTO endpoint_count
  FROM public.webhook_endpoints
  WHERE calendar_id = p_calendar_id AND is_active = true;
  
  -- Maak test webhook event
  INSERT INTO public.webhook_events (calendar_id, event_type, payload, status)
  VALUES (
    p_calendar_id,
    'webhook.test',
    jsonb_build_object(
      'test', true,
      'timestamp', NOW(),
      'message', 'Test webhook event'
    ),
    'pending'
  ) RETURNING id INTO test_webhook_id;
  
  -- Trigger processing
  PERFORM pg_notify('process_webhooks', 
    json_build_object(
      'source', 'test_webhook',
      'calendar_id', p_calendar_id,
      'test_webhook_id', test_webhook_id
    )::text
  );
  
  RETURN json_build_object(
    'success', true,
    'test_webhook_id', test_webhook_id,
    'active_endpoints', endpoint_count,
    'message', 'Test webhook created and processing triggered'
  );
END;
$function$;

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

-- 2. Add strict RLS policy to prevent subscription privilege escalation
DROP POLICY IF EXISTS "users_cannot_modify_subscription_directly" ON public.users;
CREATE POLICY "users_prevent_subscription_escalation" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent direct modification of subscription fields by checking unchanged values
  subscription_status = COALESCE((SELECT subscription_status FROM public.users WHERE id = auth.uid()), subscription_status) AND
  subscription_tier = COALESCE((SELECT subscription_tier FROM public.users WHERE id = auth.uid()), subscription_tier) AND
  trial_end_date = COALESCE((SELECT trial_end_date FROM public.users WHERE id = auth.uid()), trial_end_date) AND
  subscription_end_date = COALESCE((SELECT subscription_end_date FROM public.users WHERE id = auth.uid()), subscription_end_date)
);

-- 3. Create audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own logs
CREATE POLICY "users_view_own_audit_logs" 
ON public.security_audit_log 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow system inserts (functions will handle this)
CREATE POLICY "system_insert_audit_logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 4. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_event_details jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    event_details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_details,
    p_ip_address,
    p_user_agent
  );
END;
$function$;

-- 5. Create input validation function
CREATE OR REPLACE FUNCTION public.validate_user_input(
  p_input text,
  p_type text DEFAULT 'text',
  p_max_length integer DEFAULT 1000
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Null check
  IF p_input IS NULL THEN
    RETURN false;
  END IF;
  
  -- Length check
  IF length(p_input) > p_max_length THEN
    RETURN false;
  END IF;
  
  -- Type-specific validation
  CASE p_type
    WHEN 'email' THEN
      RETURN p_input ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
    WHEN 'phone' THEN
      RETURN p_input ~ '^\+?[1-9]\d{1,14}$';
    WHEN 'slug' THEN
      RETURN p_input ~ '^[a-z0-9-]+$';
    WHEN 'url' THEN
      RETURN p_input ~* '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}';
    ELSE
      -- Basic text validation - no script tags or SQL injection patterns
      RETURN NOT (p_input ~* '<script|javascript:|vbscript:|on\w+\s*=|union\s+select|insert\s+into|delete\s+from|drop\s+table');
  END CASE;
END;
$function$;