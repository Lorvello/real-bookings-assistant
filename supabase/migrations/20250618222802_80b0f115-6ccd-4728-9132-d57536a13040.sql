
-- Maak de users tabel (uitbreiding op Supabase auth.users)
CREATE TABLE public.users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  business_name text,
  business_type text, -- 'salon', 'clinic', 'consultant', 'trainer', etc.
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Maak de calendars tabel
CREATE TABLE public.calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name text DEFAULT 'Mijn Kalender',
  slug text UNIQUE, -- voor publieke booking URL
  timezone text DEFAULT 'Europe/Amsterdam',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Functie om automatisch een user profiel aan te maken
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Voeg user toe aan public.users tabel
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );
  
  RETURN new;
END;
$$;

-- Trigger om automatisch user profiel aan te maken bij signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Functie om automatisch een kalender aan te maken voor nieuwe users
CREATE OR REPLACE FUNCTION public.handle_new_user_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  calendar_slug text;
BEGIN
  -- Genereer een unieke slug voor de kalender
  calendar_slug := 'cal-' || substr(new.id::text, 1, 8);
  
  -- Maak automatisch een kalender aan voor de nieuwe user
  INSERT INTO public.calendars (user_id, name, slug)
  VALUES (
    new.id,
    'Mijn Kalender',
    calendar_slug
  );
  
  RETURN new;
END;
$$;

-- Trigger om automatisch kalender aan te maken bij nieuwe user
CREATE TRIGGER on_user_created_calendar
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_calendar();

-- Row Level Security (RLS) policies
-- Enable RLS op beide tabellen
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- RLS policies voor users tabel
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS policies voor calendars tabel
CREATE POLICY "Users can view own calendars" ON public.calendars
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendars" ON public.calendars
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendars" ON public.calendars
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendars" ON public.calendars
  FOR DELETE USING (auth.uid() = user_id);

-- Public access policy voor calendars (voor booking URLs)
CREATE POLICY "Public can view active calendars by slug" ON public.calendars
  FOR SELECT USING (is_active = true);

-- Functie om updated_at automatisch bij te werken
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger voor updated_at op users tabel
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
