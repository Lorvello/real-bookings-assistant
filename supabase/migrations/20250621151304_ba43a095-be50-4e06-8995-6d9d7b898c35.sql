
-- Eerst alle bestaande policies verwijderen
DROP POLICY IF EXISTS "Users can view their own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can create their own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can update their own calendars" ON public.calendars;
DROP POLICY IF EXISTS "Users can delete their own calendars" ON public.calendars;

DROP POLICY IF EXISTS "Users can view own availability schedules" ON public.availability_schedules;
DROP POLICY IF EXISTS "Users can create own availability schedules" ON public.availability_schedules;
DROP POLICY IF EXISTS "Users can update own availability schedules" ON public.availability_schedules;
DROP POLICY IF EXISTS "Users can delete own availability schedules" ON public.availability_schedules;

DROP POLICY IF EXISTS "Users can view own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can create own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can update own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can delete own availability rules" ON public.availability_rules;

DROP POLICY IF EXISTS "Users can view own calendar settings" ON public.calendar_settings;
DROP POLICY IF EXISTS "Users can create own calendar settings" ON public.calendar_settings;
DROP POLICY IF EXISTS "Users can update own calendar settings" ON public.calendar_settings;
DROP POLICY IF EXISTS "Users can delete own calendar settings" ON public.calendar_settings;

-- Nu alle tabellen RLS inschakelen
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies voor Calendars
CREATE POLICY "Users can view their own calendars" 
  ON public.calendars 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendars" 
  ON public.calendars 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendars" 
  ON public.calendars 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendars" 
  ON public.calendars 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies voor Availability Schedules
CREATE POLICY "Users can view own availability schedules" 
  ON public.availability_schedules
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own availability schedules" 
  ON public.availability_schedules
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own availability schedules" 
  ON public.availability_schedules
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own availability schedules" 
  ON public.availability_schedules
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- RLS Policies voor Availability Rules
CREATE POLICY "Users can view own availability rules" 
  ON public.availability_rules
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own availability rules" 
  ON public.availability_rules
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own availability rules" 
  ON public.availability_rules
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own availability rules" 
  ON public.availability_rules
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- RLS Policies voor Calendar Settings
CREATE POLICY "Users can view own calendar settings" 
  ON public.calendar_settings
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_settings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own calendar settings" 
  ON public.calendar_settings
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_settings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own calendar settings" 
  ON public.calendar_settings
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_settings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own calendar settings" 
  ON public.calendar_settings
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_settings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );
