
-- Maak de bookings tabel
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  service_type_id uuid REFERENCES public.service_types(id),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no-show')),
  notes text,
  internal_notes text, -- alleen zichtbaar voor eigenaar
  total_price decimal(10,2),
  confirmation_token text UNIQUE,
  confirmed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index voor snelle queries
CREATE INDEX idx_bookings_calendar_time ON bookings(calendar_id, start_time);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Functie voor conflict checking
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(
  p_calendar_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  conflict_count integer;
BEGIN
  -- Tel het aantal conflicterende boekingen
  SELECT COUNT(*) INTO conflict_count
  FROM public.bookings
  WHERE calendar_id = p_calendar_id
    AND status NOT IN ('cancelled', 'no-show')
    AND (
      -- Nieuwe booking start tijdens bestaande booking
      (p_start_time >= start_time AND p_start_time < end_time)
      OR
      -- Nieuwe booking eindigt tijdens bestaande booking
      (p_end_time > start_time AND p_end_time <= end_time)
      OR
      -- Nieuwe booking omvat bestaande booking volledig
      (p_start_time <= start_time AND p_end_time >= end_time)
    )
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
  
  -- Return true als er conflicten zijn
  RETURN conflict_count > 0;
END;
$$;

-- Functie om automatisch confirmation token te genereren
CREATE OR REPLACE FUNCTION public.generate_confirmation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;

-- Trigger functie om confirmation token automatisch te genereren bij nieuwe booking
CREATE OR REPLACE FUNCTION public.handle_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Genereer confirmation token als deze niet is opgegeven
  IF NEW.confirmation_token IS NULL THEN
    NEW.confirmation_token := public.generate_confirmation_token();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger om confirmation token automatisch te genereren
CREATE TRIGGER on_booking_created
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_booking();

-- Trigger voor updated_at timestamp
CREATE TRIGGER on_booking_updated
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS op bookings tabel
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies voor bookings
CREATE POLICY "Users can view own calendar bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings for own calendars" ON public.bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own calendar bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own calendar bookings" ON public.bookings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Public policy voor het maken van boekingen via publieke links
CREATE POLICY "Public can create bookings for active calendars" ON public.bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.is_active = true
    )
  );

-- Public policy voor het bekijken van eigen bookings via confirmation token
CREATE POLICY "Public can view bookings by confirmation token" ON public.bookings
  FOR SELECT USING (
    confirmation_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = bookings.calendar_id 
      AND calendars.is_active = true
    )
  );

-- Validatie functie om te controleren of booking tijden geldig zijn
CREATE OR REPLACE FUNCTION public.validate_booking_times()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Controleer of start_time voor end_time ligt
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  -- Controleer of booking niet in het verleden ligt
  IF NEW.start_time < now() THEN
    RAISE EXCEPTION 'Cannot create booking in the past';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger voor tijd validatie
CREATE TRIGGER validate_booking_times_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_times();
