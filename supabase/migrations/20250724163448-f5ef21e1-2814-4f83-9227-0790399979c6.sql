-- Security Fix: Final batch of function security updates

-- Fix the remaining functions with search_path issues
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

CREATE OR REPLACE FUNCTION public.check_whatsapp_contact_limit(p_user_id uuid, p_calendar_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_count integer;
  v_max_contacts integer;
  v_subscription_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get max contacts based on subscription tier
  SELECT max_whatsapp_contacts INTO v_max_contacts
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::subscription_tier;
  
  -- If unlimited (null), return true
  IF v_max_contacts IS NULL THEN
    RETURN true;
  END IF;
  
  -- Count current WhatsApp contacts for this user's calendars
  SELECT COUNT(DISTINCT wc.id) INTO v_current_count
  FROM public.whatsapp_contacts wc
  JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
  JOIN public.calendars cal ON conv.calendar_id = cal.id
  WHERE cal.user_id = p_user_id;
  
  -- Return true if under limit
  RETURN v_current_count < v_max_contacts;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get user details
  SELECT * INTO v_user
  FROM public.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  
  -- Check for active paid subscription
  IF v_user.subscription_status = 'active' AND 
     (v_user.subscription_end_date IS NULL OR v_user.subscription_end_date > v_now) THEN
    RETURN 'paid_subscriber';
  END IF;
  
  -- Check for canceled but still active subscription
  IF v_user.subscription_status = 'canceled' AND 
     v_user.subscription_end_date IS NOT NULL AND 
     v_user.subscription_end_date > v_now THEN
    RETURN 'canceled_but_active';
  END IF;
  
  -- Check for canceled and inactive subscription
  IF v_user.subscription_status = 'canceled' AND 
     v_user.subscription_end_date IS NOT NULL AND 
     v_user.subscription_end_date <= v_now THEN
    RETURN 'canceled_and_inactive';
  END IF;
  
  -- Check for active trial
  IF v_user.subscription_status = 'trial' AND 
     v_user.trial_end_date IS NOT NULL AND 
     v_user.trial_end_date > v_now THEN
    RETURN 'active_trial';
  END IF;
  
  -- Check for expired trial
  IF v_user.subscription_status = 'trial' AND 
     v_user.trial_end_date IS NOT NULL AND 
     v_user.trial_end_date <= v_now THEN
    RETURN 'expired_trial';
  END IF;
  
  -- Check for setup incomplete (no business_name or business_type)
  IF v_user.business_name IS NULL OR v_user.business_type IS NULL THEN
    RETURN 'setup_incomplete';
  END IF;
  
  -- Default fallback
  RETURN 'unknown';
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_invitation RECORD;
  v_user_id uuid;
  v_new_calendar_id uuid;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;
  
  -- Get or create user
  SELECT public.create_team_member_user(
    v_invitation.email,
    v_invitation.full_name,
    v_invitation.calendar_id
  ) INTO v_user_id;
  
  -- Create personal calendar for the new team member
  INSERT INTO public.calendars (
    user_id,
    name,
    slug,
    description,
    is_default
  ) VALUES (
    v_user_id,
    COALESCE(v_invitation.full_name, 'Mijn Kalender'),
    'cal-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
    'Persoonlijke kalender',
    true
  ) RETURNING id INTO v_new_calendar_id;
  
  -- Add team member to the inviting calendar
  INSERT INTO public.calendar_members (
    calendar_id,
    user_id,
    role,
    invited_by,
    accepted_at
  ) VALUES (
    v_invitation.calendar_id,
    v_user_id,
    v_invitation.role,
    v_invitation.invited_by,
    now()
  ) ON CONFLICT (calendar_id, user_id) DO UPDATE SET
    role = v_invitation.role,
    accepted_at = now();
  
  -- Mark invitation as accepted
  UPDATE public.team_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invitation.id;
  
  -- Create webhook event
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    v_invitation.calendar_id,
    'team.invitation.accepted',
    jsonb_build_object(
      'user_id', v_user_id,
      'email', v_invitation.email,
      'role', v_invitation.role,
      'personal_calendar_id', v_new_calendar_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'personal_calendar_id', v_new_calendar_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_clear_user_data(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Clear all user-related data
  DELETE FROM public.bookings 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.availability_overrides 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.availability_rules 
  WHERE schedule_id IN (
    SELECT id FROM public.availability_schedules 
    WHERE calendar_id IN (
      SELECT id FROM public.calendars WHERE user_id = p_user_id
    )
  );
  
  DELETE FROM public.availability_schedules 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.service_types 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.calendar_settings 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.whatsapp_conversations 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.calendars WHERE user_id = p_user_id;
  
  -- Clear user business data
  UPDATE public.users 
  SET 
    business_name = NULL,
    business_type = NULL,
    business_phone = NULL,
    business_email = NULL,
    business_whatsapp = NULL,
    business_street = NULL,
    business_number = NULL,
    business_postal = NULL,
    business_city = NULL,
    business_country = NULL,
    business_description = NULL,
    parking_info = NULL,
    public_transport_info = NULL,
    accessibility_info = NULL,
    other_info = NULL,
    opening_hours_note = NULL,
    business_type_other = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User data cleared successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to clear user data: ' || SQLERRM
    );
END;
$function$;