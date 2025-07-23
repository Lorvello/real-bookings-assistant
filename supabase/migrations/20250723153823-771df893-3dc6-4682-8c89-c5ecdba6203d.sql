-- Team Member Invitation System Database Extensions

-- Create invitation tokens table for secure team member invitations
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
  token text UNIQUE NOT NULL,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  UNIQUE(calendar_id, email)
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for team invitations
CREATE POLICY "Calendar owners can manage invitations"
  ON public.team_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = team_invitations.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Policy for invited users to view their invitation
CREATE POLICY "Users can view invitations sent to their email"
  ON public.team_invitations
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email OR invited_by = auth.uid());

-- Function to handle team member invitation
CREATE OR REPLACE FUNCTION public.invite_team_member(
  p_calendar_id uuid,
  p_email text,
  p_full_name text,
  p_role text DEFAULT 'viewer'
)
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
  
  -- Generate secure token
  v_token := encode(gen_random_bytes(32), 'base64url');
  
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

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
$$;

-- Create function to cleanup expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.team_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at <= now();
END;
$$;