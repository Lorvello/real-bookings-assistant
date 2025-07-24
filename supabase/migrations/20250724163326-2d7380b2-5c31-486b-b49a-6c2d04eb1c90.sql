-- Security Fix: Continue fixing remaining database functions

-- Fix remaining functions with search_path issues
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

CREATE OR REPLACE FUNCTION public.export_whatsapp_data(p_calendar_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
  v_result jsonb;
BEGIN
  -- Stel datumbereik in
  v_start_date := COALESCE(p_start_date::timestamp with time zone, NOW() - interval '30 days');
  v_end_date := COALESCE(p_end_date::timestamp with time zone, NOW());
  
  -- Export conversatie data
  SELECT jsonb_build_object(
    'conversations', jsonb_agg(
      jsonb_build_object(
        'conversation_id', wc.id,
        'contact_phone', wco.phone_number,
        'contact_name', wco.display_name,
        'messages', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'message_id', wm.message_id,
              'direction', wm.direction,
              'content', wm.content,
              'created_at', wm.created_at
            ) ORDER BY wm.created_at
          )
          FROM public.whatsapp_messages wm
          WHERE wm.conversation_id = wc.id
            AND wm.created_at BETWEEN v_start_date AND v_end_date
        )
      )
    )
  ) INTO v_result
  FROM public.whatsapp_conversations wc
  JOIN public.whatsapp_contacts wco ON wco.id = wc.contact_id
  WHERE wc.calendar_id = p_calendar_id
    AND wc.created_at BETWEEN v_start_date AND v_end_date;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_existing_users_retroactively()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Update existing users without trial dates
  UPDATE public.users 
  SET 
    trial_start_date = COALESCE(trial_start_date, created_at),
    trial_end_date = COALESCE(trial_end_date, created_at + interval '7 days')
  WHERE trial_start_date IS NULL OR trial_end_date IS NULL;
  
  -- Update subscription status for expired trials
  UPDATE public.users 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial' 
    AND trial_end_date <= NOW()
    AND subscription_status != 'expired';
  
  -- Set default subscription tier for existing users
  UPDATE public.users 
  SET subscription_tier = 'starter'
  WHERE subscription_tier IS NULL 
    AND subscription_status IN ('active', 'paid');
    
  -- Log the update
  RAISE NOTICE 'Updated existing users retroactively';
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_team_member_limit(p_user_id uuid, p_calendar_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_count integer;
  v_max_members integer;
  v_subscription_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get max team members based on subscription tier
  SELECT max_team_members INTO v_max_members
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::subscription_tier;
  
  -- Count current team members for this calendar (including owner)
  SELECT COUNT(*) + 1 INTO v_current_count -- +1 for owner
  FROM public.calendar_members cm
  WHERE cm.calendar_id = p_calendar_id;
  
  -- Return true if under limit
  RETURN v_current_count < v_max_members;
END;
$function$;

CREATE OR REPLACE FUNCTION public.invite_team_member(p_calendar_id uuid, p_email text, p_full_name text, p_role text DEFAULT 'viewer'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_token text;
  v_invitation_id uuid;
  v_calendar_owner uuid;
  v_business_name text;
  v_limit_check boolean;
BEGIN
  -- Verify that the current user owns the calendar
  SELECT c.user_id, u.business_name 
  INTO v_calendar_owner, v_business_name
  FROM public.calendars c
  JOIN public.users u ON c.user_id = u.id
  WHERE c.id = p_calendar_id;
  
  IF v_calendar_owner != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only calendar owners can invite team members'
    );
  END IF;
  
  -- Check team member limit
  SELECT public.check_team_member_limit(v_calendar_owner, p_calendar_id) INTO v_limit_check;
  
  IF NOT v_limit_check THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Team member limit reached for this subscription tier',
      'error_code', 'TEAM_MEMBER_LIMIT_REACHED'
    );
  END IF;
  
  -- Generate secure token using gen_random_uuid as base64
  v_token := encode(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 'base64url');
  
  -- Create invitation (will update if exists due to UNIQUE constraint)
  INSERT INTO public.team_invitations (
    calendar_id,
    email,
    full_name,
    role,
    token,
    invited_by,
    status,
    expires_at
  ) VALUES (
    p_calendar_id,
    p_email,
    p_full_name,
    p_role,
    v_token,
    auth.uid(),
    'pending',
    now() + interval '48 hours'
  )
  ON CONFLICT (calendar_id, email) 
  DO UPDATE SET
    full_name = p_full_name,
    role = p_role,
    token = v_token,
    status = 'pending',
    expires_at = now() + interval '48 hours',
    created_at = now()
  RETURNING id INTO v_invitation_id;
  
  -- Create webhook event for email sending
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    p_calendar_id,
    'team.invitation.created',
    jsonb_build_object(
      'invitation_id', v_invitation_id,
      'email', p_email,
      'full_name', p_full_name,
      'role', p_role,
      'token', v_token,
      'business_name', v_business_name,
      'invited_by', auth.uid()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'token', v_token
  );
END;
$function$;