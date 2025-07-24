-- Critical Security Fixes Migration

-- 1. Add search_path security to all functions missing it
CREATE OR REPLACE FUNCTION public.manual_process_webhooks(p_calendar_id uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  result_count integer := 0;
BEGIN
  -- Tel pending webhook events
  SELECT COUNT(*) INTO result_count
  FROM public.webhook_events
  WHERE status = 'pending'
    AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id);
  
  -- Trigger processing via notify
  PERFORM pg_notify('process_webhooks', 
    json_build_object(
      'source', 'manual_trigger',
      'calendar_id', p_calendar_id,
      'pending_count', result_count,
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN json_build_object(
    'success', true,
    'pending_webhooks', result_count,
    'message', 'Processing triggered'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.team_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at <= now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_to_waitlist(p_calendar_slug text, p_service_type_id uuid, p_customer_name text, p_customer_email text, p_preferred_date date, p_preferred_time_start time without time zone DEFAULT NULL::time without time zone, p_preferred_time_end time without time zone DEFAULT NULL::time without time zone, p_flexibility text DEFAULT 'anytime'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_waitlist_id uuid;
BEGIN
  -- Get calendar ID
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE slug = p_calendar_slug 
    AND is_active = true;
    
  IF v_calendar_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Calendar not found'
    );
  END IF;
  
  -- Check if service type exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.service_types
    WHERE id = p_service_type_id 
      AND calendar_id = v_calendar_id
      AND is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Service type not found'
    );
  END IF;
  
  -- Add to waitlist
  INSERT INTO public.waitlist (
    calendar_id,
    service_type_id,
    customer_name,
    customer_email,
    preferred_date,
    preferred_time_start,
    preferred_time_end,
    flexibility
  ) VALUES (
    v_calendar_id,
    p_service_type_id,
    p_customer_name,
    p_customer_email,
    p_preferred_date,
    p_preferred_time_start,
    p_preferred_time_end,
    p_flexibility
  ) RETURNING id INTO v_waitlist_id;
  
  RETURN json_build_object(
    'success', true,
    'waitlist_id', v_waitlist_id,
    'message', 'Successfully added to waitlist'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_calendar_statistics(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_user_id uuid;
BEGIN
  -- Check if user owns this calendar
  SELECT user_id INTO v_user_id
  FROM public.calendars
  WHERE id = p_calendar_id;
  
  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied to calendar statistics';
  END IF;
  
  -- Get statistics for owned calendar
  SELECT jsonb_build_object(
    'total_bookings', COUNT(*),
    'completed_bookings', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled_bookings', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'pending_bookings', COUNT(*) FILTER (WHERE status = 'pending'),
    'total_revenue', COALESCE(SUM(total_price), 0),
    'this_month', jsonb_build_object(
      'bookings', COUNT(*) FILTER (WHERE start_time >= date_trunc('month', CURRENT_DATE)),
      'revenue', COALESCE(SUM(total_price) FILTER (WHERE start_time >= date_trunc('month', CURRENT_DATE)), 0)
    )
  ) INTO v_result
  FROM public.bookings
  WHERE calendar_id = p_calendar_id;
  
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_today_bookings integer;
  v_pending_bookings integer;
  v_total_revenue numeric;
  v_week_bookings integer;
  v_month_bookings integer;
  v_conversion_rate numeric;
  v_avg_response_time numeric;
BEGIN
  -- Today's bookings
  SELECT COUNT(*) INTO v_today_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND DATE(start_time) = CURRENT_DATE
    AND status != 'cancelled';

  -- Pending confirmations
  SELECT COUNT(*) INTO v_pending_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND status = 'pending';

  -- This week's bookings
  SELECT COUNT(*) INTO v_week_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND start_time >= date_trunc('week', CURRENT_DATE)
    AND start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
    AND status != 'cancelled';

  -- This month's bookings  
  SELECT COUNT(*) INTO v_month_bookings
  FROM public.bookings 
  WHERE calendar_id = p_calendar_id 
    AND start_time >= date_trunc('month', CURRENT_DATE)
    AND start_time < date_trunc('month', CURRENT_DATE) + interval '1 month'
    AND status != 'cancelled';

  -- Total revenue this month
  SELECT COALESCE(SUM(COALESCE(b.total_price, st.price, 0)), 0) INTO v_total_revenue
  FROM public.bookings b
  LEFT JOIN public.service_types st ON b.service_type_id = st.id
  WHERE b.calendar_id = p_calendar_id 
    AND b.start_time >= date_trunc('month', CURRENT_DATE)
    AND b.status != 'cancelled';

  -- WhatsApp conversion rate (if WhatsApp data exists)
  SELECT COALESCE(
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100)
      ELSE 0 
    END, 0
  ) INTO v_conversion_rate
  FROM public.booking_intents bi
  JOIN public.whatsapp_conversations wc ON bi.conversation_id = wc.id
  WHERE wc.calendar_id = p_calendar_id
    AND bi.created_at >= CURRENT_DATE - interval '30 days';

  -- Average WhatsApp response time (in minutes)
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      SELECT MIN(m2.created_at) 
      FROM public.whatsapp_messages m2 
      WHERE m2.conversation_id = m1.conversation_id 
        AND m2.direction = 'outbound' 
        AND m2.created_at > m1.created_at
    ) - m1.created_at) / 60
  ), 0) INTO v_avg_response_time
  FROM public.whatsapp_messages m1
  JOIN public.whatsapp_conversations wc ON m1.conversation_id = wc.id
  WHERE wc.calendar_id = p_calendar_id
    AND m1.direction = 'inbound'
    AND m1.created_at >= CURRENT_DATE - interval '7 days';

  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'conversion_rate', ROUND(v_conversion_rate, 1),
    'avg_response_time', ROUND(v_avg_response_time, 1),
    'last_updated', now()
  );

  RETURN v_result;
END;
$function$;

-- 2. Add strict RLS policy to prevent subscription privilege escalation
CREATE POLICY "users_cannot_modify_subscription_directly" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  -- Prevent direct modification of subscription fields
  (OLD.subscription_status = NEW.subscription_status OR NEW.subscription_status IS NULL) AND
  (OLD.subscription_tier = NEW.subscription_tier OR NEW.subscription_tier IS NULL) AND
  (OLD.trial_end_date = NEW.trial_end_date OR NEW.trial_end_date IS NULL) AND
  (OLD.subscription_end_date = NEW.subscription_end_date OR NEW.subscription_end_date IS NULL)
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

-- Only allow system/admin to insert, users can only view their own logs
CREATE POLICY "users_view_own_audit_logs" 
ON public.security_audit_log 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "system_insert_audit_logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true); -- System-level function will handle this

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

-- 5. Create trigger to log subscription changes
CREATE OR REPLACE FUNCTION public.audit_subscription_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Log any subscription-related changes
  IF (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status OR
      OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier OR
      OLD.trial_end_date IS DISTINCT FROM NEW.trial_end_date OR
      OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date) THEN
    
    PERFORM public.log_security_event(
      NEW.id,
      'subscription_modified',
      jsonb_build_object(
        'old_status', OLD.subscription_status,
        'new_status', NEW.subscription_status,
        'old_tier', OLD.subscription_tier,
        'new_tier', NEW.subscription_tier,
        'modified_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply the audit trigger
DROP TRIGGER IF EXISTS audit_subscription_changes_trigger ON public.users;
CREATE TRIGGER audit_subscription_changes_trigger
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_subscription_changes();