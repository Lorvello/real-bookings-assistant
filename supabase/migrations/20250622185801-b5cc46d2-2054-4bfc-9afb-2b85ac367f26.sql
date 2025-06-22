
-- Alleen ontbrekende RLS policies toevoegen
-- Check eerst welke policies nog niet bestaan voordat we ze aanmaken

-- RLS policy voor users tabel (INSERT operaties) - alleen als deze nog niet bestaat
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can insert own profile'
    ) THEN
        CREATE POLICY "Users can insert own profile" ON public.users
          FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- RLS policies voor calendar_members tabel - alleen ontbrekende
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendar_members' 
        AND policyname = 'Users can view calendar memberships where they are owner or member'
    ) THEN
        CREATE POLICY "Users can view calendar memberships where they are owner or member" ON public.calendar_members
          FOR SELECT USING (
            auth.uid() = user_id OR 
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = calendar_members.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendar_members' 
        AND policyname = 'Calendar owners can manage memberships'
    ) THEN
        CREATE POLICY "Calendar owners can manage memberships" ON public.calendar_members
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = calendar_members.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendar_members' 
        AND policyname = 'Calendar owners can update memberships'
    ) THEN
        CREATE POLICY "Calendar owners can update memberships" ON public.calendar_members
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = calendar_members.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendar_members' 
        AND policyname = 'Calendar owners and members can delete their own membership'
    ) THEN
        CREATE POLICY "Calendar owners and members can delete their own membership" ON public.calendar_members
          FOR DELETE USING (
            auth.uid() = user_id OR
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = calendar_members.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- RLS policies voor error_logs tabel - alleen ontbrekende
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'error_logs' 
        AND policyname = 'Users can view error logs for their calendars'
    ) THEN
        CREATE POLICY "Users can view error logs for their calendars" ON public.error_logs
          FOR SELECT USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = error_logs.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'error_logs' 
        AND policyname = 'Users can insert error logs for their calendars'
    ) THEN
        CREATE POLICY "Users can insert error logs for their calendars" ON public.error_logs
          FOR INSERT WITH CHECK (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = error_logs.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Enable RLS op tabellen (alleen als nog niet enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Performance indices toevoegen (alleen als ze nog niet bestaan)
CREATE INDEX IF NOT EXISTS idx_calendar_members_user_calendar ON public.calendar_members(user_id, calendar_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_calendar ON public.error_logs(user_id, calendar_id);
