
-- Fix Supabase Security Advisor Issues
-- This migration addresses nullable user_id columns, cleans up duplicate policies, and ensures consistent RLS

-- Step 1: Fix nullable user_id columns in calendars table
-- First, ensure all existing calendars have a user_id (should already be the case due to triggers)
UPDATE public.calendars 
SET user_id = (
  SELECT cm.user_id 
  FROM public.calendar_members cm 
  WHERE cm.calendar_id = calendars.id 
  AND cm.role = 'owner' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Make user_id NOT NULL in calendars table
ALTER TABLE public.calendars 
ALTER COLUMN user_id SET NOT NULL;

-- Step 2: Clean up calendar_id column in error_logs (should reference calendars, not be nullable)
-- Remove any orphaned error logs first
DELETE FROM public.error_logs 
WHERE calendar_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM public.calendars 
  WHERE id = error_logs.calendar_id
);

-- Step 3: Clean up duplicate and conflicting RLS policies
-- Remove old/duplicate policies first
DROP POLICY IF EXISTS "Users can view own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can create own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can update own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can delete own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can manage own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Public can view active calendars" ON public.calendars;
DROP POLICY IF EXISTS "Public can view active calendars by slug" ON public.calendars;

-- Create consistent, secure RLS policies for calendars
CREATE POLICY "calendars_select_own" ON public.calendars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "calendars_insert_own" ON public.calendars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendars_update_own" ON public.calendars
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "calendars_delete_own" ON public.calendars
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "calendars_public_view_active" ON public.calendars
  FOR SELECT USING (is_active = true);

-- Step 4: Clean up error_logs policies
DROP POLICY IF EXISTS "Users can view error logs for their calendars" ON public.error_logs;
DROP POLICY IF EXISTS "Users can insert error logs for their calendars" ON public.error_logs;

-- Create consistent error_logs policies
CREATE POLICY "error_logs_select_own" ON public.error_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = error_logs.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "error_logs_insert_own" ON public.error_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = error_logs.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Step 5: Clean up calendar_members policies for consistency
DROP POLICY IF EXISTS "Users can view calendar members" ON public.calendar_members;
DROP POLICY IF EXISTS "Users can manage calendar members" ON public.calendar_members;
DROP POLICY IF EXISTS "Users can view calendar memberships where they are owner or member" ON public.calendar_members;
DROP POLICY IF EXISTS "Calendar owners can manage memberships" ON public.calendar_members;
DROP POLICY IF EXISTS "Calendar owners can update memberships" ON public.calendar_members;
DROP POLICY IF EXISTS "Calendar owners and members can delete their own membership" ON public.calendar_members;

-- Create consistent calendar_members policies
CREATE POLICY "calendar_members_select_own" ON public.calendar_members
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_members.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_members_insert_owner" ON public.calendar_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_members.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_members_update_owner" ON public.calendar_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_members.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "calendar_members_delete_owner_or_self" ON public.calendar_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_members.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Step 6: Ensure all other critical tables have consistent policies
-- Clean up any remaining old policies that might conflict
DROP POLICY IF EXISTS "Users can manage calendar settings" ON public.calendar_settings;
DROP POLICY IF EXISTS "Users can view own calendar settings" ON public.calendar_settings;
DROP POLICY IF EXISTS "Users can update own calendar settings" ON public.calendar_settings;
DROP POLICY IF EXISTS "Users can insert calendar settings for own calendars" ON public.calendar_settings;

-- Create consistent calendar_settings policies
CREATE POLICY "calendar_settings_manage_own" ON public.calendar_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_settings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Verify RLS is enabled on all critical tables
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add helpful indexes for RLS performance
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON public.calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_calendar_user ON public.calendar_members(calendar_id, user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_calendar_id ON public.error_logs(calendar_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);

-- Clean up any remaining duplicate policies from the massive migration file
-- This ensures we don't have conflicting policy names
DO $$ 
DECLARE
    policy_rec RECORD;
BEGIN
    -- Find and log any remaining duplicate policies
    FOR policy_rec IN 
        SELECT schemaname, tablename, policyname, COUNT(*) as count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename, policyname 
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Found duplicate policy: %.%.%', policy_rec.schemaname, policy_rec.tablename, policy_rec.policyname;
    END LOOP;
END $$;
