-- Drop the function approach and create a materialized table instead
DROP FUNCTION IF EXISTS public.get_business_overview(text, text, text, text);

-- Create business_overview table with denormalized data
CREATE TABLE IF NOT EXISTS public.business_overview (
  -- Primary identifiers
  user_id uuid NOT NULL,
  calendar_id uuid PRIMARY KEY,
  
  -- Business info
  business_name text,
  business_email text,
  business_phone text,
  business_whatsapp text,
  business_type text,
  business_description text,
  business_street text,
  business_number text,
  business_postal text,
  business_city text,
  business_country text,
  website text,
  instagram text,
  facebook text,
  linkedin text,
  
  -- Calendar info
  calendar_name text,
  calendar_slug text,
  timezone text,
  calendar_active boolean,
  calendar_description text,
  calendar_color text,
  
  -- Settings
  booking_window_days integer,
  minimum_notice_hours integer,
  slot_duration integer,
  buffer_time integer,
  max_bookings_per_day integer,
  allow_waitlist boolean,
  confirmation_required boolean,
  whatsapp_bot_active boolean,
  
  -- Denormalized data as JSONB
  available_slots jsonb DEFAULT '[]'::jsonb,
  upcoming_bookings jsonb DEFAULT '[]'::jsonb,
  services jsonb DEFAULT '[]'::jsonb,
  opening_hours jsonb DEFAULT '{}'::jsonb,
  
  -- Statistics
  total_bookings integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  last_updated timestamptz DEFAULT now(),
  
  CONSTRAINT fk_business_overview_calendar
    FOREIGN KEY (calendar_id)
    REFERENCES calendars(id)
    ON DELETE CASCADE
);

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_business_overview_business_name ON business_overview(business_name);
CREATE INDEX IF NOT EXISTS idx_business_overview_business_type ON business_overview(business_type);
CREATE INDEX IF NOT EXISTS idx_business_overview_city ON business_overview(business_city);
CREATE INDEX IF NOT EXISTS idx_business_overview_slug ON business_overview(calendar_slug);
CREATE INDEX IF NOT EXISTS idx_business_overview_active ON business_overview(calendar_active) WHERE calendar_active = true;

-- Enable RLS
ALTER TABLE business_overview ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "business_overview_public_read"
  ON business_overview
  FOR SELECT
  USING (calendar_active = true);

CREATE POLICY "business_overview_owner_all"
  ON business_overview
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendars c
      WHERE c.id = business_overview.calendar_id
      AND c.user_id = auth.uid()
    )
  );

-- Function to refresh business overview for a specific calendar
CREATE OR REPLACE FUNCTION public.refresh_business_overview(p_calendar_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user users%ROWTYPE;
  v_calendar calendars%ROWTYPE;
  v_settings calendar_settings%ROWTYPE;
BEGIN
  -- Get calendar info
  SELECT * INTO v_calendar FROM calendars WHERE id = p_calendar_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- Get user info
  SELECT * INTO v_user FROM users WHERE id = v_calendar.user_id;
  
  -- Get settings
  SELECT * INTO v_settings FROM calendar_settings WHERE calendar_id = p_calendar_id;
  
  -- Upsert business overview
  INSERT INTO business_overview (
    user_id, calendar_id,
    business_name, business_email, business_phone, business_whatsapp,
    business_type, business_description, business_street, business_number,
    business_postal, business_city, business_country,
    website, instagram, facebook, linkedin,
    calendar_name, calendar_slug, timezone, calendar_active,
    calendar_description, calendar_color,
    booking_window_days, minimum_notice_hours, slot_duration,
    buffer_time, max_bookings_per_day, allow_waitlist,
    confirmation_required, whatsapp_bot_active,
    available_slots, upcoming_bookings, services, opening_hours,
    total_bookings, total_revenue,
    last_updated
  )
  VALUES (
    v_calendar.user_id, p_calendar_id,
    v_user.business_name, v_user.business_email, v_user.business_phone, v_user.business_whatsapp,
    v_user.business_type, v_user.business_description, v_user.business_street, v_user.business_number,
    v_user.business_postal, v_user.business_city, v_user.business_country,
    v_user.website, v_user.instagram, v_user.facebook, v_user.linkedin,
    v_calendar.name, v_calendar.slug, v_calendar.timezone, v_calendar.is_active,
    v_calendar.description, v_calendar.color,
    v_settings.booking_window_days, v_settings.minimum_notice_hours, v_settings.slot_duration,
    v_settings.buffer_time, v_settings.max_bookings_per_day, v_settings.allow_waitlist,
    v_settings.confirmation_required, v_settings.whatsapp_bot_active,
    
    -- Available slots
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', slot_date::date,
        'start_time', start_time,
        'end_time', end_time,
        'service_name', service_name,
        'is_available', true
      ))
      FROM (
        SELECT DISTINCT
          DATE(slot_start) as slot_date,
          slot_start::time as start_time,
          slot_end::time as end_time,
          st.name as service_name
        FROM available_slots_view asv
        JOIN service_types st ON st.id = asv.service_type_id
        WHERE asv.calendar_id = p_calendar_id
          AND asv.slot_start >= NOW()
          AND asv.slot_start < NOW() + INTERVAL '7 days'
          AND asv.is_available = true
        ORDER BY slot_date, start_time
        LIMIT 50
      ) slots
    ), '[]'::jsonb),
    
    -- Upcoming bookings
    COALESCE((
      SELECT jsonb_agg(booking_json)
      FROM (
        SELECT jsonb_build_object(
          'booking_id', b.id,
          'customer_name', b.customer_name,
          'service_name', b.service_name,
          'start_time', b.start_time,
          'end_time', b.end_time,
          'status', b.status,
          'total_price', b.total_price
        ) as booking_json
        FROM bookings b
        WHERE b.calendar_id = p_calendar_id
          AND b.start_time >= NOW()
          AND b.is_deleted = false
        ORDER BY b.start_time
        LIMIT 20
      ) ordered_bookings
    ), '[]'::jsonb),
    
    -- Services
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'service_id', st.id,
        'name', st.name,
        'description', st.description,
        'duration', st.duration,
        'price', st.price,
        'color', st.color,
        'is_active', st.is_active
      ))
      FROM service_types st
      WHERE st.calendar_id = p_calendar_id
        AND st.is_active = true
      ORDER BY st.name
    ), '[]'::jsonb),
    
    -- Opening hours
    COALESCE((
      SELECT jsonb_object_agg(
        day_of_week::text,
        jsonb_build_object(
          'start_time', start_time,
          'end_time', end_time,
          'is_available', is_available
        )
      )
      FROM (
        SELECT 
          ar.day_of_week,
          ar.start_time,
          ar.end_time,
          ar.is_available
        FROM availability_rules ar
        JOIN availability_schedules asch ON asch.id = ar.schedule_id
        WHERE asch.calendar_id = p_calendar_id
          AND asch.is_default = true
        ORDER BY ar.day_of_week
      ) rules
    ), '{}'::jsonb),
    
    -- Statistics
    (SELECT COUNT(*)::integer FROM bookings b WHERE b.calendar_id = p_calendar_id AND b.is_deleted = false),
    (SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b WHERE b.calendar_id = p_calendar_id AND b.is_deleted = false AND b.status = 'confirmed'),
    
    NOW()
  )
  ON CONFLICT (calendar_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    business_email = EXCLUDED.business_email,
    business_phone = EXCLUDED.business_phone,
    business_whatsapp = EXCLUDED.business_whatsapp,
    business_type = EXCLUDED.business_type,
    business_description = EXCLUDED.business_description,
    business_street = EXCLUDED.business_street,
    business_number = EXCLUDED.business_number,
    business_postal = EXCLUDED.business_postal,
    business_city = EXCLUDED.business_city,
    business_country = EXCLUDED.business_country,
    website = EXCLUDED.website,
    instagram = EXCLUDED.instagram,
    facebook = EXCLUDED.facebook,
    linkedin = EXCLUDED.linkedin,
    calendar_name = EXCLUDED.calendar_name,
    calendar_slug = EXCLUDED.calendar_slug,
    timezone = EXCLUDED.timezone,
    calendar_active = EXCLUDED.calendar_active,
    calendar_description = EXCLUDED.calendar_description,
    calendar_color = EXCLUDED.calendar_color,
    booking_window_days = EXCLUDED.booking_window_days,
    minimum_notice_hours = EXCLUDED.minimum_notice_hours,
    slot_duration = EXCLUDED.slot_duration,
    buffer_time = EXCLUDED.buffer_time,
    max_bookings_per_day = EXCLUDED.max_bookings_per_day,
    allow_waitlist = EXCLUDED.allow_waitlist,
    confirmation_required = EXCLUDED.confirmation_required,
    whatsapp_bot_active = EXCLUDED.whatsapp_bot_active,
    available_slots = EXCLUDED.available_slots,
    upcoming_bookings = EXCLUDED.upcoming_bookings,
    services = EXCLUDED.services,
    opening_hours = EXCLUDED.opening_hours,
    total_bookings = EXCLUDED.total_bookings,
    total_revenue = EXCLUDED.total_revenue,
    last_updated = EXCLUDED.last_updated;
END;
$$;

-- Trigger function to auto-refresh on changes
CREATE OR REPLACE FUNCTION trigger_business_overview_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Schedule refresh in background to avoid blocking
  PERFORM pg_notify('refresh_business_overview', 'refresh_needed');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Grant permissions
GRANT SELECT ON business_overview TO authenticated;
GRANT SELECT ON business_overview TO anon;
GRANT EXECUTE ON FUNCTION refresh_business_overview TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_business_overview TO anon;