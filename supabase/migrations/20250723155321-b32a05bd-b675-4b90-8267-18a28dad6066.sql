-- Fix the invite_team_member function to use gen_random_uuid instead of gen_random_bytes
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
BEGIN
  -- Verify that the current user owns the calendar
  SELECT c.user_id, u.business_name 
  INTO v_calendar_owner, v_business_name
  FROM public.calendars c
  JOIN public.users u ON c.user_id = u.id
  WHERE c.id = p_calendar_id;
  
  IF v_calendar_owner != auth.uid() THEN
    RAISE EXCEPTION 'Only calendar owners can invite team members';
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