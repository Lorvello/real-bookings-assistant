
-- Maak de availability_schedules tabel (werkschema's)
CREATE TABLE public.availability_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Standaard Schema',
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Maak de availability_rules tabel (werkuren per dag)
CREATE TABLE public.availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.availability_schedules(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(schedule_id, day_of_week)
);

-- Maak de availability_overrides tabel (uitzonderingen/vakanties)
CREATE TABLE public.availability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_available boolean DEFAULT false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(calendar_id, date)
);

-- Functie om automatisch een standaard beschikbaarheidsschema aan te maken bij nieuwe kalender
CREATE OR REPLACE FUNCTION public.handle_new_calendar_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  schedule_id uuid;
BEGIN
  -- Maak automatisch een standaard beschikbaarheidsschema aan voor de nieuwe kalender
  INSERT INTO public.availability_schedules (calendar_id, name, is_default)
  VALUES (new.id, 'Standaard Schema', true)
  RETURNING id INTO schedule_id;
  
  -- Voeg standaard werkuren toe (ma-vr 9:00-17:00)
  INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
  VALUES 
    (schedule_id, 1, '09:00'::time, '17:00'::time, true), -- Maandag
    (schedule_id, 2, '09:00'::time, '17:00'::time, true), -- Dinsdag
    (schedule_id, 3, '09:00'::time, '17:00'::time, true), -- Woensdag
    (schedule_id, 4, '09:00'::time, '17:00'::time, true), -- Donderdag
    (schedule_id, 5, '09:00'::time, '17:00'::time, true), -- Vrijdag
    (schedule_id, 6, '09:00'::time, '17:00'::time, false), -- Zaterdag (niet beschikbaar)
    (schedule_id, 0, '09:00'::time, '17:00'::time, false); -- Zondag (niet beschikbaar)
  
  RETURN new;
END;
$$;

-- Trigger om automatisch beschikbaarheidsschema aan te maken bij nieuwe kalender
CREATE TRIGGER on_calendar_created_availability
  AFTER INSERT ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_calendar_availability();

-- Functie om te controleren of een tijdslot beschikbaar is
CREATE OR REPLACE FUNCTION public.check_availability(
  p_calendar_id uuid,
  p_datetime timestamp with time zone,
  p_duration_minutes integer DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  slot_date date;
  slot_time time;
  slot_end_time time;
  day_of_week integer;
  schedule_record record;
  rule_record record;
  override_record record;
BEGIN
  -- Converteer datetime naar datum en tijd
  slot_date := p_datetime::date;
  slot_time := p_datetime::time;
  slot_end_time := (p_datetime + (p_duration_minutes || ' minutes')::interval)::time;
  day_of_week := EXTRACT(DOW FROM p_datetime)::integer;
  
  -- Controleer eerst of er een override is voor deze datum
  SELECT * INTO override_record
  FROM public.availability_overrides
  WHERE calendar_id = p_calendar_id 
    AND date = slot_date;
  
  IF FOUND THEN
    -- Als er een override is en deze is niet beschikbaar, return false
    IF NOT override_record.is_available THEN
      RETURN false;
    END IF;
    
    -- Als er een override is met specifieke tijden, controleer die
    IF override_record.start_time IS NOT NULL AND override_record.end_time IS NOT NULL THEN
      IF slot_time >= override_record.start_time AND slot_end_time <= override_record.end_time THEN
        RETURN true;
      ELSE
        RETURN false;
      END IF;
    END IF;
    
    -- Als override beschikbaar is zonder specifieke tijden, ga door naar normale regels
  END IF;
  
  -- Haal het standaard schema op voor deze kalender
  SELECT * INTO schedule_record
  FROM public.availability_schedules
  WHERE calendar_id = p_calendar_id 
    AND is_default = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Controleer de beschikbaarheidsregel voor deze dag
  SELECT * INTO rule_record
  FROM public.availability_rules
  WHERE schedule_id = schedule_record.id 
    AND day_of_week = day_of_week;
  
  IF NOT FOUND OR NOT rule_record.is_available THEN
    RETURN false;
  END IF;
  
  -- Controleer of het tijdslot binnen de werkuren valt
  IF slot_time >= rule_record.start_time AND slot_end_time <= rule_record.end_time THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Enable RLS op nieuwe tabellen
ALTER TABLE public.availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_overrides ENABLE ROW LEVEL SECURITY;

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

-- RLS policies voor availability_overrides
CREATE POLICY "Users can view own availability overrides" ON public.availability_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_overrides.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own availability overrides" ON public.availability_overrides
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_overrides.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own availability overrides" ON public.availability_overrides
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_overrides.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own availability overrides" ON public.availability_overrides
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_overrides.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Public policies voor publieke beschikbaarheidscontrole
CREATE POLICY "Public can check availability" ON public.availability_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_schedules.calendar_id 
      AND calendars.is_active = true
    )
  );

CREATE POLICY "Public can view active availability rules" ON public.availability_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.availability_schedules 
      JOIN public.calendars ON calendars.id = availability_schedules.calendar_id
      WHERE availability_schedules.id = availability_rules.schedule_id 
      AND calendars.is_active = true
    )
  );

CREATE POLICY "Public can view active availability overrides" ON public.availability_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = availability_overrides.calendar_id 
      AND calendars.is_active = true
    )
  );
