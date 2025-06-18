
-- Enable RLS op tabellen die het nog niet hebben (sommige zijn al enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Controleer en maak alleen ontbrekende policies aan
-- Policies voor users (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON public.users
          FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON public.users
          FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Policies voor calendars (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendars' 
        AND policyname = 'Users can manage own calendars'
    ) THEN
        CREATE POLICY "Users can manage own calendars" ON public.calendars
          FOR ALL USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendars' 
        AND policyname = 'Public can view active calendars'
    ) THEN
        CREATE POLICY "Public can view active calendars" ON public.calendars
          FOR SELECT USING (is_active = true);
    END IF;
END $$;

-- Policies voor calendar_settings (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendar_settings' 
        AND policyname = 'Users can view own calendar settings'
    ) THEN
        CREATE POLICY "Users can view own calendar settings" ON public.calendar_settings
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = calendar_settings.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendar_settings' 
        AND policyname = 'Users can update own calendar settings'
    ) THEN
        CREATE POLICY "Users can update own calendar settings" ON public.calendar_settings
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = calendar_settings.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'calendar_settings' 
        AND policyname = 'Users can insert calendar settings for own calendars'
    ) THEN
        CREATE POLICY "Users can insert calendar settings for own calendars" ON public.calendar_settings
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = calendar_settings.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Policies voor service_types (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_types' 
        AND policyname = 'Users can manage own service types'
    ) THEN
        CREATE POLICY "Users can manage own service types" ON public.service_types
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = service_types.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_types' 
        AND policyname = 'Public can view active service types'
    ) THEN
        CREATE POLICY "Public can view active service types" ON public.service_types
          FOR SELECT USING (
            is_active = true AND
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = service_types.calendar_id 
              AND calendars.is_active = true
            )
          );
    END IF;
END $$;

-- Policies voor availability_schedules (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'availability_schedules' 
        AND policyname = 'Users can manage own availability schedules'
    ) THEN
        CREATE POLICY "Users can manage own availability schedules" ON public.availability_schedules
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = availability_schedules.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'availability_schedules' 
        AND policyname = 'Public can view active availability schedules'
    ) THEN
        CREATE POLICY "Public can view active availability schedules" ON public.availability_schedules
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = availability_schedules.calendar_id 
              AND calendars.is_active = true
            )
          );
    END IF;
END $$;

-- Policies voor availability_rules (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'availability_rules' 
        AND policyname = 'Users can manage own availability rules'
    ) THEN
        CREATE POLICY "Users can manage own availability rules" ON public.availability_rules
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.availability_schedules 
              JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
              WHERE availability_schedules.id = availability_rules.schedule_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'availability_rules' 
        AND policyname = 'Public can view active availability rules'
    ) THEN
        CREATE POLICY "Public can view active availability rules" ON public.availability_rules
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.availability_schedules 
              JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
              WHERE availability_schedules.id = availability_rules.schedule_id 
              AND calendars.is_active = true
            )
          );
    END IF;
END $$;

-- Policies voor availability_overrides (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'availability_overrides' 
        AND policyname = 'Users can manage own availability overrides'
    ) THEN
        CREATE POLICY "Users can manage own availability overrides" ON public.availability_overrides
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = availability_overrides.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'availability_overrides' 
        AND policyname = 'Public can view active availability overrides'
    ) THEN
        CREATE POLICY "Public can view active availability overrides" ON public.availability_overrides
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = availability_overrides.calendar_id 
              AND calendars.is_active = true
            )
          );
    END IF;
END $$;

-- Policies voor bookings (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname = 'Users can manage own calendar bookings'
    ) THEN
        CREATE POLICY "Users can manage own calendar bookings" ON public.bookings
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = bookings.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname = 'Public can create bookings for active calendars'
    ) THEN
        CREATE POLICY "Public can create bookings for active calendars" ON public.bookings
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = bookings.calendar_id 
              AND calendars.is_active = true
            )
          );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookings' 
        AND policyname = 'Public can view bookings by confirmation token'
    ) THEN
        CREATE POLICY "Public can view bookings by confirmation token" ON public.bookings
          FOR SELECT USING (
            confirmation_token IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = bookings.calendar_id 
              AND calendars.is_active = true
            )
          );
    END IF;
END $$;

-- Policies voor webhook_endpoints (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_endpoints' 
        AND policyname = 'Users can manage own webhook endpoints'
    ) THEN
        CREATE POLICY "Users can manage own webhook endpoints" ON public.webhook_endpoints
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = webhook_endpoints.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
END $$;

-- Policies voor webhook_events (alleen als ze nog niet bestaan)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_events' 
        AND policyname = 'Users can manage own webhook events'
    ) THEN
        CREATE POLICY "Users can manage own webhook events" ON public.webhook_events
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM public.calendars 
              WHERE calendars.id = webhook_events.calendar_id 
              AND calendars.user_id = auth.uid()
            )
          );
    END IF;
END $$;
