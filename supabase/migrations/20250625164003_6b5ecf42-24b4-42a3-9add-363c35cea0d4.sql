
-- Comprehensive Database Cleanup Migration
-- This migration addresses RLS policy issues, duplicates, and performance problems

-- Step 1: Clean up duplicate and problematic RLS policies
-- First, disable RLS temporarily to avoid conflicts during cleanup
ALTER TABLE public.calendars DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 2: Create clean, consistent RLS policies

-- Users table policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Calendars table policies
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendars_select_own" ON public.calendars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "calendars_insert_own" ON public.calendars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendars_update_own" ON public.calendars
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "calendars_delete_own" ON public.calendars
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "calendars_public_view" ON public.calendars
  FOR SELECT USING (is_active = true);

-- Calendar settings policies
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_settings_owner_all" ON public.calendar_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_settings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Calendar members policies
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_members_select" ON public.calendar_members
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_members.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_members_owner_manage" ON public.calendar_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_members.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_members_owner_update" ON public.calendar_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_members.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_members_owner_or_self_delete" ON public.calendar_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_members.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Service types policies
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_types_owner_all" ON public.service_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = service_types.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "service_types_public_view" ON public.service_types
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = service_types.calendar_id 
      AND calendars.is_active = true
    )
  );

-- Bookings policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_owner_all" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_public_create" ON public.bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.is_active = true
    )
  );

CREATE POLICY "bookings_public_view_by_token" ON public.bookings
  FOR SELECT USING (
    confirmation_token IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.is_active = true
    )
  );

-- Availability schedules policies
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_schedules_owner_all" ON public.availability_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "availability_schedules_public_view" ON public.availability_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.is_active = true
    )
  );

-- Availability rules policies
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_rules_owner_all" ON public.availability_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "availability_rules_public_view" ON public.availability_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.is_active = true
    )
  );

-- Availability overrides policies
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_overrides_owner_all" ON public.availability_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_overrides.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "availability_overrides_public_view" ON public.availability_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_overrides.calendar_id 
      AND calendars.is_active = true
    )
  );

-- Webhook events policies
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_owner_all" ON public.webhook_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = webhook_events.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Webhook endpoints policies
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_endpoints_owner_all" ON public.webhook_endpoints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = webhook_endpoints.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Error logs policies
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "error_logs_owner_view" ON public.error_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = error_logs.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "error_logs_owner_insert" ON public.error_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = error_logs.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Step 3: Add performance indexes for RLS
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON public.calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_settings_calendar_id ON public.calendar_settings(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_user_calendar ON public.calendar_members(user_id, calendar_id);
CREATE INDEX IF NOT EXISTS idx_service_types_calendar_id ON public.service_types(calendar_id);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_id ON public.bookings(calendar_id);
CREATE INDEX IF NOT EXISTS idx_availability_schedules_calendar_id ON public.availability_schedules(calendar_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_schedule_id ON public.availability_rules(schedule_id);
CREATE INDEX IF NOT EXISTS idx_availability_overrides_calendar_id ON public.availability_overrides(calendar_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_calendar_id ON public.webhook_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_calendar_id ON public.webhook_endpoints(calendar_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_calendar_id ON public.error_logs(calendar_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);

-- Step 4: Fix any problematic check constraints
-- Remove overly complex check constraints that might be causing issues
ALTER TABLE public.availability_rules DROP CONSTRAINT IF EXISTS availability_rules_day_of_week_check;
ALTER TABLE public.availability_rules ADD CONSTRAINT availability_rules_day_of_week_check 
  CHECK (day_of_week >= 0 AND day_of_week <= 6);

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show'));

ALTER TABLE public.calendar_members DROP CONSTRAINT IF EXISTS calendar_members_role_check;
ALTER TABLE public.calendar_members ADD CONSTRAINT calendar_members_role_check 
  CHECK (role IN ('owner', 'editor', 'viewer'));

-- Step 5: Clean up any orphaned data that might be causing constraint violations
-- Remove any orphaned calendar_settings
DELETE FROM public.calendar_settings 
WHERE calendar_id NOT IN (SELECT id FROM public.calendars);

-- Remove any orphaned calendar_members
DELETE FROM public.calendar_members 
WHERE calendar_id NOT IN (SELECT id FROM public.calendars);

-- Remove any orphaned service_types
DELETE FROM public.service_types 
WHERE calendar_id NOT IN (SELECT id FROM public.calendars);

-- Remove any orphaned bookings
DELETE FROM public.bookings 
WHERE calendar_id NOT IN (SELECT id FROM public.calendars);

-- Remove any orphaned availability_schedules
DELETE FROM public.availability_schedules 
WHERE calendar_id NOT IN (SELECT id FROM public.calendars);

-- Remove any orphaned availability_overrides
DELETE FROM public.availability_overrides 
WHERE calendar_id NOT IN (SELECT id FROM public.calendars);

-- Remove any orphaned webhook_events
DELETE FROM public.webhook_events 
WHERE calendar_id NOT IN (SELECT id FROM public.calendars);

-- Remove any orphaned webhook_endpoints
DELETE FROM public.webhook_endpoints 
WHERE calendar_id NOT IN (SELECT id FROM public.calendars);

-- Remove any orphaned error_logs with calendar_id
DELETE FROM public.error_logs 
WHERE calendar_id IS NOT NULL AND calendar_id NOT IN (SELECT id FROM public.calendars);

-- Step 6: Ensure data consistency
-- Make sure all calendars have a user_id (should already be enforced but let's be safe)
UPDATE public.calendars 
SET user_id = (
  SELECT cm.user_id 
  FROM public.calendar_members cm 
  WHERE cm.calendar_id = calendars.id 
  AND cm.role = 'owner' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Remove any calendars that still don't have a user_id
DELETE FROM public.calendars WHERE user_id IS NULL;

-- Add NOT NULL constraint back to calendars.user_id if it was removed
ALTER TABLE public.calendars ALTER COLUMN user_id SET NOT NULL;

-- Final step: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
