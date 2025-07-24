-- Function to check team member limits for a user
CREATE OR REPLACE FUNCTION public.check_team_member_limit(p_user_id uuid, p_calendar_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

-- Update the invite_team_member function to check limits
CREATE OR REPLACE FUNCTION public.invite_team_member(p_calendar_id uuid, p_email text, p_full_name text, p_role text DEFAULT 'viewer'::text)
RETURNS jsonb  
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;