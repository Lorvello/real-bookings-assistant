
-- Stap 1: RLS Policies implementeren voor availability tabellen
-- Enable RLS op alle availability tabellen (indien nog niet gedaan)
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;

-- Drop bestaande policies om conflicten te voorkomen
DROP POLICY IF EXISTS "Users can view own availability schedules" ON public.availability_schedules;
DROP POLICY IF EXISTS "Users can create own availability schedules" ON public.availability_schedules;
DROP POLICY IF EXISTS "Users can update own availability schedules" ON public.availability_schedules;
DROP POLICY IF EXISTS "Users can delete own availability schedules" ON public.availability_schedules;

DROP POLICY IF EXISTS "Users can view own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can create own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can update own availability rules" ON public.availability_rules;
DROP POLICY IF EXISTS "Users can delete own availability rules" ON public.availability_rules;

-- RLS policies voor availability_schedules
CREATE POLICY "Users can view own availability schedules" ON public.availability_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own availability schedules" ON public.availability_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own availability schedules" ON public.availability_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own availability schedules" ON public.availability_schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- RLS policies voor availability_rules
CREATE POLICY "Users can view own availability rules" ON public.availability_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own availability rules" ON public.availability_rules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own availability rules" ON public.availability_rules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own availability rules" ON public.availability_rules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Stap 2: Database constraints en validatie toevoegen
-- Check constraint voor geldige dag van de week
ALTER TABLE public.availability_rules 
DROP CONSTRAINT IF EXISTS check_day_of_week;
ALTER TABLE public.availability_rules 
ADD CONSTRAINT check_day_of_week 
CHECK (day_of_week >= 0 AND day_of_week <= 6);

-- Trigger voor tijdvalidatie (vervang check constraint die problemen kan geven)
CREATE OR REPLACE FUNCTION validate_availability_times()
RETURNS TRIGGER AS $$
BEGIN
  -- Valideer dat start_time voor end_time ligt
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  -- Valideer dat tijden binnen een redelijke range liggen (00:00 - 23:59)
  IF NEW.start_time < '00:00'::time OR NEW.start_time > '23:59'::time THEN
    RAISE EXCEPTION 'Start time must be between 00:00 and 23:59';
  END IF;
  
  IF NEW.end_time < '00:00'::time OR NEW.end_time > '23:59'::time THEN
    RAISE EXCEPTION 'End time must be between 00:00 and 23:59';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop en recreate trigger
DROP TRIGGER IF EXISTS validate_availability_rules_trigger ON public.availability_rules;
CREATE TRIGGER validate_availability_rules_trigger
  BEFORE INSERT OR UPDATE ON public.availability_rules
  FOR EACH ROW EXECUTE FUNCTION validate_availability_times();

-- Stap 3: Real-time publicatie enablen voor availability tabellen
ALTER TABLE public.availability_schedules REPLICA IDENTITY FULL;
ALTER TABLE public.availability_rules REPLICA IDENTITY FULL;

-- Voeg tabellen toe aan realtime publicatie
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_rules;

-- Stap 4: Index toevoegen voor betere performance
CREATE INDEX IF NOT EXISTS idx_availability_rules_schedule_day 
ON public.availability_rules(schedule_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_availability_schedules_calendar_default 
ON public.availability_schedules(calendar_id, is_default);
