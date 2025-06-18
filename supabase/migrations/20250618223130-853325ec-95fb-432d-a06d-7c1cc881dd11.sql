
-- Maak de calendar_settings tabel
CREATE TABLE public.calendar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  booking_window_days integer DEFAULT 60, -- hoever vooruit kan geboekt worden
  minimum_notice_hours integer DEFAULT 24, -- minimale tijd voor boeking
  slot_duration integer DEFAULT 30, -- standaard slot duur in minuten
  buffer_time integer DEFAULT 0, -- buffer tussen afspraken
  max_bookings_per_day integer, -- optioneel dagelijks limiet
  allow_waitlist boolean DEFAULT false,
  confirmation_required boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(calendar_id)
);

-- Maak de service_types tabel
CREATE TABLE public.service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration integer NOT NULL, -- in minuten
  price decimal(10,2),
  color text DEFAULT '#3B82F6', -- voor UI weergave
  is_active boolean DEFAULT true,
  max_attendees integer DEFAULT 1, -- voor groepssessies
  preparation_time integer DEFAULT 0, -- voorbereidingstijd
  cleanup_time integer DEFAULT 0, -- opruimtijd
  created_at timestamp with time zone DEFAULT now()
);

-- Functie om automatisch calendar_settings aan te maken bij nieuwe kalender
CREATE OR REPLACE FUNCTION public.handle_new_calendar_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Maak automatisch standaard instellingen aan voor de nieuwe kalender
  INSERT INTO public.calendar_settings (calendar_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;

-- Trigger om automatisch calendar_settings aan te maken bij nieuwe kalender
CREATE TRIGGER on_calendar_created_settings
  AFTER INSERT ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_calendar_settings();

-- Enable RLS op nieuwe tabellen
ALTER TABLE public.calendar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- RLS policies voor calendar_settings
CREATE POLICY "Users can view own calendar settings" ON public.calendar_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_settings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own calendar settings" ON public.calendar_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = calendar_settings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- RLS policies voor service_types
CREATE POLICY "Users can view own service types" ON public.service_types
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = service_types.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own service types" ON public.service_types
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = service_types.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own service types" ON public.service_types
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = service_types.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own service types" ON public.service_types
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = service_types.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Public policies voor booking URL toegang
CREATE POLICY "Public can view active service types" ON public.service_types
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = service_types.calendar_id 
      AND calendars.is_active = true
    )
  );
