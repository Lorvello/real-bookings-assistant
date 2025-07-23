-- Create junction table for many-to-many relationship between calendars and service types
CREATE TABLE IF NOT EXISTS public.calendar_service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  service_type_id uuid NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(calendar_id, service_type_id)
);

-- Enable RLS on the junction table
ALTER TABLE public.calendar_service_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for calendar_service_types
CREATE POLICY "calendar_service_types_owner_all"
  ON public.calendar_service_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars c
      WHERE c.id = calendar_service_types.calendar_id
      AND c.user_id = auth.uid()
    )
  );

-- Create index for performance
CREATE INDEX idx_calendar_service_types_calendar_id ON public.calendar_service_types(calendar_id);
CREATE INDEX idx_calendar_service_types_service_type_id ON public.calendar_service_types(service_type_id);

-- Migrate existing data: copy calendar_id relationships to junction table
INSERT INTO public.calendar_service_types (calendar_id, service_type_id)
SELECT DISTINCT st.calendar_id, st.id
FROM public.service_types st
WHERE st.calendar_id IS NOT NULL
ON CONFLICT (calendar_id, service_type_id) DO NOTHING;

-- Remove calendar_id from service_types (make service types global per user)
-- First, we need to add a user_id to service_types to make them global per user
ALTER TABLE public.service_types ADD COLUMN IF NOT EXISTS user_id uuid;

-- Update existing service types to have user_id from their calendar
UPDATE public.service_types 
SET user_id = c.user_id
FROM public.calendars c
WHERE public.service_types.calendar_id = c.id
AND public.service_types.user_id IS NULL;

-- Make user_id NOT NULL after populating it
ALTER TABLE public.service_types ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint for user_id
-- (Note: we can't reference auth.users directly, so we'll use the user_id from calendars)

-- Update RLS policies for service_types to use user_id instead of calendar_id
DROP POLICY IF EXISTS "service_types_owner_all" ON public.service_types;
DROP POLICY IF EXISTS "service_types_public_view" ON public.service_types;

CREATE POLICY "service_types_owner_all"
  ON public.service_types
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "service_types_public_view"
  ON public.service_types
  FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.calendar_service_types cst
      JOIN public.calendars c ON c.id = cst.calendar_id
      WHERE cst.service_type_id = service_types.id
      AND c.is_active = true
    )
  );

-- Remove calendar_id column from service_types (this should be done last)
ALTER TABLE public.service_types DROP COLUMN IF EXISTS calendar_id;