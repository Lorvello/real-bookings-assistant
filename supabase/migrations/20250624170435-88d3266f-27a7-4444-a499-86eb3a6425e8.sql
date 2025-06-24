
-- Stap 1: Uitbreiden van users tabel met alle ontbrekende velden
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'nl',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Amsterdam',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_postal TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_country TEXT DEFAULT 'Nederland',
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT,
ADD COLUMN IF NOT EXISTS business_phone TEXT,
ADD COLUMN IF NOT EXISTS business_email TEXT,
ADD COLUMN IF NOT EXISTS business_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS business_street TEXT,
ADD COLUMN IF NOT EXISTS business_number TEXT,
ADD COLUMN IF NOT EXISTS business_postal TEXT,
ADD COLUMN IF NOT EXISTS business_city TEXT,
ADD COLUMN IF NOT EXISTS business_country TEXT DEFAULT 'Nederland',
ADD COLUMN IF NOT EXISTS business_description TEXT,
ADD COLUMN IF NOT EXISTS parking_info TEXT,
ADD COLUMN IF NOT EXISTS public_transport_info TEXT,
ADD COLUMN IF NOT EXISTS accessibility_info TEXT,
ADD COLUMN IF NOT EXISTS other_info TEXT,
ADD COLUMN IF NOT EXISTS show_opening_hours BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS opening_hours_note TEXT,
ADD COLUMN IF NOT EXISTS team_size TEXT DEFAULT '1',
ADD COLUMN IF NOT EXISTS business_type_other TEXT;

-- Update updated_at trigger voor users tabel als deze nog niet bestaat
CREATE OR REPLACE FUNCTION public.handle_updated_at_users()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_users();

-- Zorg ervoor dat alle bestaande kalenders standaard service types hebben
CREATE OR REPLACE FUNCTION public.ensure_default_service_types()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calendar_record RECORD;
BEGIN
  -- Loop door alle kalenders die geen service types hebben
  FOR calendar_record IN 
    SELECT c.* FROM public.calendars c
    LEFT JOIN public.service_types st ON c.id = st.calendar_id
    WHERE st.id IS NULL AND c.is_active = true
  LOOP
    -- Voeg standaard service type toe
    INSERT INTO public.service_types (
      calendar_id, 
      name, 
      duration, 
      price, 
      description,
      color,
      is_active
    ) VALUES (
      calendar_record.id,
      'Standaard Afspraak',
      30,
      50.00,
      'Standaard service type',
      '#3B82F6',
      true
    );
  END LOOP;
END;
$$;

-- Voer de functie uit om missing service types toe te voegen
SELECT public.ensure_default_service_types();

-- Verbeter de dashboard metrics functie voor betere error handling
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_safe(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_today_bookings integer := 0;
  v_pending_bookings integer := 0;
  v_total_revenue numeric := 0;
  v_week_bookings integer := 0;
  v_month_bookings integer := 0;
BEGIN
  -- Veilige queries met COALESCE voor null handling
  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_today_bookings
    FROM bookings 
    WHERE calendar_id = p_calendar_id 
      AND DATE(start_time) = CURRENT_DATE
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_today_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_pending_bookings
    FROM bookings 
    WHERE calendar_id = p_calendar_id 
      AND status = 'pending';
  EXCEPTION WHEN OTHERS THEN
    v_pending_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_week_bookings
    FROM bookings 
    WHERE calendar_id = p_calendar_id 
      AND start_time >= date_trunc('week', CURRENT_DATE)
      AND start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_week_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_month_bookings
    FROM bookings 
    WHERE calendar_id = p_calendar_id 
      AND start_time >= date_trunc('month', CURRENT_DATE)
      AND start_time < date_trunc('month', CURRENT_DATE) + interval '1 month'
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_month_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(SUM(COALESCE(b.total_price, st.price, 0)), 0) INTO v_total_revenue
    FROM bookings b
    LEFT JOIN service_types st ON b.service_type_id = st.id
    WHERE b.calendar_id = p_calendar_id 
      AND b.start_time >= date_trunc('month', CURRENT_DATE)
      AND b.status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_total_revenue := 0;
  END;

  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'conversion_rate', 0,
    'avg_response_time', 0,
    'last_updated', now()
  );

  RETURN v_result;
END;
$$;
