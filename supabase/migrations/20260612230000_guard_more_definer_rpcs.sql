-- SECURITY: add authorization guards to 5 more SECURITY DEFINER RPCs that took a
-- caller-supplied calendar_id/user_id with no ownership check (continuation of the
-- R52-54 SECURITY DEFINER sweep). All are called by the frontend with the caller's
-- OWN id, so we guard rather than revoke; service_role / internal chains
-- (auth.uid() NULL) and admins keep working.
--   create_default_whatsapp_templates / test_webhook_system: cross-tenant INSERT
--     (template spam / injected webhook events into another tenant's calendar).
--   manual_process_webhooks: NULL form counted ALL tenants' pending events.
--   create_default_whatsapp_templates also had a latent 42P18 bug (untyped
--     empty ARRAY[] in two rows AND an ON CONFLICT target that didn't match the
--     (calendar_id, template_key, language) unique constraint) -> the "create
--     default templates" button failed for everyone; fixed both alongside the guard.
--   get_user_status_type / complete_user_setup: cross-tenant subscription-status
--     read / setup-state probe by user_id.

CREATE OR REPLACE FUNCTION public.create_default_whatsapp_templates(p_calendar_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- SECURITY: authenticated callers must own the calendar; service_role /
  -- internal (auth.uid() NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
  -- Insert standaard templates
  INSERT INTO public.whatsapp_templates (calendar_id, template_key, content, variables, quick_replies) VALUES
    (p_calendar_id, 'welcome', 'Hallo {{name}}! Welkom bij {{business_name}}. Waarmee kan ik u helpen?', 
     ARRAY['name', 'business_name'],
     '[{"text": "Afspraak maken", "payload": "book_appointment"}, {"text": "Beschikbaarheid", "payload": "check_availability"}]'::jsonb),
    
    (p_calendar_id, 'booking_confirm', 'Uw afspraak voor {{service}} op {{date}} om {{time}} is bevestigd! Tot dan!', 
     ARRAY['service', 'date', 'time'],
     '[{"text": "Wijzigen", "payload": "modify_booking"}, {"text": "Annuleren", "payload": "cancel_booking"}]'::jsonb),
    
    (p_calendar_id, 'reminder', 'Herinnering: U heeft morgen om {{time}} een afspraak voor {{service}}. Tot dan!', 
     ARRAY['time', 'service'],
     '[{"text": "Bevestigen", "payload": "confirm_reminder"}, {"text": "Wijzigen", "payload": "modify_booking"}]'::jsonb),
    
    (p_calendar_id, 'booking_request', 'Ik begrijp dat u een afspraak wilt maken. Voor welke service heeft u interesse?',
     ARRAY[]::text[],
     NULL),
    
    (p_calendar_id, 'availability_check', 'Ik ga voor u kijken naar beschikbare tijden. Voor welke datum heeft u voorkeur?',
     ARRAY[]::text[],
     '[{"text": "Deze week", "payload": "this_week"}, {"text": "Volgende week", "payload": "next_week"}]'::jsonb)
  ON CONFLICT (calendar_id, template_key, language) DO NOTHING;
END;
$function$;

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
  -- SECURITY: authenticated callers must own the calendar; service_role /
  -- internal (auth.uid() NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
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

CREATE OR REPLACE FUNCTION public.manual_process_webhooks(p_calendar_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result_count integer := 0;
BEGIN
  -- SECURITY: authenticated callers must own a specific calendar; the
  -- all-tenants (NULL) form is service_role / internal only.
  IF auth.uid() IS NOT NULL AND (p_calendar_id IS NULL OR NOT public.caller_owns_calendar(p_calendar_id)) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
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

CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user RECORD;
  v_subscriber RECORD;
  v_now timestamptz := now();
  v_has_calendar boolean;
  v_has_service boolean;
  v_has_availability boolean;
BEGIN
  -- SECURITY: authenticated callers may only query themselves; admins and
  -- service_role / internal (auth.uid() NULL) bypass.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: not your user record' USING ERRCODE = '42501';
  END IF;
  -- Get user data
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  
  -- Check if FULL setup is complete (all 4 requirements):
  -- 1. Business name AND business type
  -- 2. At least one calendar
  -- 3. At least one active service type
  -- 4. At least one availability rule
  
  -- Check for calendar
  SELECT EXISTS(
    SELECT 1 FROM calendars 
    WHERE user_id = p_user_id 
    AND (is_deleted IS NULL OR is_deleted = false)
  ) INTO v_has_calendar;
  
  -- Check for active service type
  SELECT EXISTS(
    SELECT 1 FROM service_types st
    JOIN calendars c ON st.calendar_id = c.id
    WHERE c.user_id = p_user_id 
    AND st.is_active = true
    AND (c.is_deleted IS NULL OR c.is_deleted = false)
  ) INTO v_has_service;
  
  -- Check for availability rules
  SELECT EXISTS(
    SELECT 1 FROM availability_rules ar
    JOIN availability_schedules asch ON ar.schedule_id = asch.id
    JOIN calendars c ON asch.calendar_id = c.id
    WHERE c.user_id = p_user_id
    AND (c.is_deleted IS NULL OR c.is_deleted = false)
  ) INTO v_has_availability;
  
  -- If ANY setup requirement is missing, return setup_incomplete
  IF v_user.business_name IS NULL 
     OR v_user.business_type IS NULL 
     OR NOT v_has_calendar 
     OR NOT v_has_service 
     OR NOT v_has_availability THEN
    RETURN 'setup_incomplete';
  END IF;
  
  -- Check for missed payment with grace period
  IF v_user.subscription_status IN ('past_due', 'incomplete', 'missed_payment') THEN
    IF v_user.grace_period_end IS NOT NULL AND v_user.grace_period_end > v_now THEN
      RETURN 'missed_payment_grace';
    ELSE
      RETURN 'missed_payment';
    END IF;
  END IF;
  
  -- Check if user is an active paid subscriber
  SELECT * INTO v_subscriber 
  FROM subscribers 
  WHERE user_id = p_user_id;
  
  IF FOUND AND v_subscriber.subscribed = true THEN
    RETURN 'paid_subscriber';
  END IF;
  
  -- Check cancellation status
  IF v_user.subscription_status = 'canceled' THEN
    IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
      RETURN 'canceled_but_active';
    ELSE
      RETURN 'canceled_and_inactive';
    END IF;
  END IF;
  
  -- Check trial status
  IF v_user.subscription_status = 'trial' THEN
    IF v_user.trial_end_date IS NOT NULL THEN
      IF v_user.trial_end_date > v_now THEN
        RETURN 'active_trial';
      ELSE
        RETURN 'expired_trial';
      END IF;
    ELSE
      RETURN 'active_trial';
    END IF;
  END IF;
  
  -- Check if trial has expired
  IF v_user.trial_end_date IS NOT NULL AND v_user.trial_end_date <= v_now THEN
    RETURN 'expired_trial';
  END IF;
  
  -- Default to setup_incomplete if no valid subscription status
  RETURN 'setup_incomplete';
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_user_setup(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- SECURITY: authenticated callers may only query themselves; admins and
  -- service_role / internal (auth.uid() NULL) bypass.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: not your user record' USING ERRCODE = '42501';
  END IF;
  -- Only allow transition if user is currently in setup_incomplete state
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_user_id 
      AND (business_name IS NULL OR business_type IS NULL)
      AND subscription_status = 'trial'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is not in setup incomplete state'
    );
  END IF;
  
  -- User should already have business_name and business_type set by this point
  -- This function just confirms the setup is complete
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Setup completed, user is now in active trial'
  );
END;
$function$;

