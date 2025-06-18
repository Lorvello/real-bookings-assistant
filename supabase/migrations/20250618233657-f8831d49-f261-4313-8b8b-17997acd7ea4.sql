
-- Remove unique constraint on user_id if it exists and update calendars table
-- First, let's check if there are any constraints we need to remove
ALTER TABLE public.calendars DROP CONSTRAINT IF EXISTS calendars_user_id_key;

-- Add some useful columns for calendar management
ALTER TABLE public.calendars 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Create index for better performance when querying calendars by user
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON public.calendars(user_id);

-- Add RLS policies for calendars table
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own calendars
CREATE POLICY "Users can view their own calendars" 
  ON public.calendars 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can create their own calendars
CREATE POLICY "Users can create their own calendars" 
  ON public.calendars 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own calendars
CREATE POLICY "Users can update their own calendars" 
  ON public.calendars 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own calendars (but not if it's their last one)
CREATE POLICY "Users can delete their own calendars" 
  ON public.calendars 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create calendar_members table for sharing functionality
CREATE TABLE IF NOT EXISTS public.calendar_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by uuid REFERENCES public.users(id),
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(calendar_id, user_id)
);

-- Add RLS policies for calendar_members table
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view memberships for calendars they own or are members of
CREATE POLICY "Users can view relevant calendar memberships" 
  ON public.calendar_members 
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT c.user_id FROM public.calendars c WHERE c.id = calendar_id
    )
  );

-- Policy: Calendar owners can manage memberships
CREATE POLICY "Calendar owners can manage memberships" 
  ON public.calendar_members 
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT c.user_id FROM public.calendars c WHERE c.id = calendar_id
    )
  );

-- Update the trigger function to set first calendar as default
CREATE OR REPLACE FUNCTION public.handle_new_user_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  calendar_slug text;
  new_calendar_id uuid;
BEGIN
  -- Genereer een unieke slug voor de kalender
  calendar_slug := 'cal-' || substr(new.id::text, 1, 8);
  
  -- Maak automatisch een kalender aan voor de nieuwe user
  INSERT INTO public.calendars (user_id, name, slug, is_default)
  VALUES (
    new.id,
    'Mijn Kalender',
    calendar_slug,
    true
  )
  RETURNING id INTO new_calendar_id;
  
  -- Add the user as owner of their calendar
  INSERT INTO public.calendar_members (calendar_id, user_id, role, accepted_at)
  VALUES (new_calendar_id, new.id, 'owner', now());
  
  RETURN new;
END;
$function$;
