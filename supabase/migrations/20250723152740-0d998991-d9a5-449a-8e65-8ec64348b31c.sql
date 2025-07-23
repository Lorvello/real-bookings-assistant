-- Fix team member invitation by allowing calendar owners to create users for their teams

-- Create a security definer function that allows calendar owners to create users for team invitations
CREATE OR REPLACE FUNCTION public.create_team_member_user(
  p_email text,
  p_full_name text,
  p_calendar_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_new_user_id uuid;
  v_calendar_owner uuid;
BEGIN
  -- Verify that the current user owns the calendar
  SELECT user_id INTO v_calendar_owner
  FROM public.calendars
  WHERE id = p_calendar_id;
  
  IF v_calendar_owner != auth.uid() THEN
    RAISE EXCEPTION 'Only calendar owners can create team members';
  END IF;
  
  -- Check if user already exists
  SELECT id INTO v_new_user_id
  FROM public.users
  WHERE email = p_email;
  
  IF v_new_user_id IS NOT NULL THEN
    RETURN v_new_user_id;
  END IF;
  
  -- Create new user with generated UUID
  v_new_user_id := gen_random_uuid();
  
  INSERT INTO public.users (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    v_new_user_id,
    p_email,
    p_full_name,
    now(),
    now()
  );
  
  RETURN v_new_user_id;
END;
$$;

-- Add a new RLS policy to allow calendar owners to create team member users
CREATE POLICY "Calendar owners can create team member users"
ON public.users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.calendars 
    WHERE user_id = auth.uid()
  )
);

-- Ensure calendar_members policies allow proper team management
DROP POLICY IF EXISTS "calendar_members_owner_manage" ON public.calendar_members;

CREATE POLICY "Calendar owners can manage team members"
ON public.calendar_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = calendar_members.calendar_id 
    AND calendars.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = calendar_members.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);