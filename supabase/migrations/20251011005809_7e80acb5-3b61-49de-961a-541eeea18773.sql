-- ============================================================================
-- TEAM MEMBER SERVICE ARCHITECTURE MIGRATION
-- ============================================================================
-- Dit implementeert de hiërarchie waarbij:
-- 1. Service types zijn BUSINESS-LEVEL (alleen calendar owner kan maken)
-- 2. Team members kunnen worden toegewezen aan bestaande service types
-- 3. Bookings kunnen optioneel aan specifieke team members worden toegewezen
-- ============================================================================

-- Create team_member_services junction table
CREATE TABLE public.team_member_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, calendar_id, service_type_id)
);

-- Indexes for performance
CREATE INDEX idx_team_member_services_user_id ON public.team_member_services(user_id);
CREATE INDEX idx_team_member_services_calendar_id ON public.team_member_services(calendar_id);
CREATE INDEX idx_team_member_services_service_type_id ON public.team_member_services(service_type_id);

-- Enable RLS
ALTER TABLE public.team_member_services ENABLE ROW LEVEL SECURITY;

-- RLS: Team members kunnen hun eigen service assignments zien
CREATE POLICY "Users can view their own service assignments"
ON public.team_member_services
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.calendars
    WHERE calendars.id = team_member_services.calendar_id
    AND calendars.user_id = auth.uid()
  )
);

-- RLS: Alleen calendar owners kunnen service assignments beheren
CREATE POLICY "Calendar owners can manage team member services"
ON public.team_member_services
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars
    WHERE calendars.id = team_member_services.calendar_id
    AND calendars.user_id = auth.uid()
  )
);

-- Add assigned_team_member_id to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS assigned_team_member_id UUID;

CREATE INDEX IF NOT EXISTS idx_bookings_assigned_team_member ON public.bookings(assigned_team_member_id);

-- ============================================================================
-- UPDATE SERVICE TYPES RLS POLICIES
-- ============================================================================
-- Service types zijn BUSINESS-LEVEL:
-- - SELECT: Owner OF team member (read-only voor team members)
-- - INSERT/UPDATE/DELETE: ALLEEN Calendar Owner
-- ============================================================================

-- Drop oude policy
DROP POLICY IF EXISTS "service_types_owner_all" ON public.service_types;

-- SELECT: Owner OF team member (read-only for team members)
CREATE POLICY "service_types_owner_or_member_view"
ON public.service_types
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calendars
    WHERE calendars.id = service_types.calendar_id
    AND (
      calendars.user_id = auth.uid()  -- Owner
      OR EXISTS (
        SELECT 1 FROM public.calendar_members
        WHERE calendar_members.calendar_id = calendars.id
        AND calendar_members.user_id = auth.uid()
      )
    )
  )
);

-- INSERT/UPDATE/DELETE: ALLEEN Calendar Owner
CREATE POLICY "service_types_owner_only_modify"
ON public.service_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars
    WHERE calendars.id = service_types.calendar_id
    AND calendars.user_id = auth.uid()  -- ALLEEN OWNER
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendars
    WHERE calendars.id = service_types.calendar_id
    AND calendars.user_id = auth.uid()  -- ALLEEN OWNER
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_team_member_services()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_team_member_services_updated_at
BEFORE UPDATE ON public.team_member_services
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_team_member_services();