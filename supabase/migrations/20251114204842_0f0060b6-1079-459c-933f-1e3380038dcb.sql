-- Create business_overview view with denormalized data structure
-- This provides a spreadsheet-like view of all business information

CREATE OR REPLACE FUNCTION get_business_overview(
  p_business_name TEXT DEFAULT NULL,
  p_business_type TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_calendar_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  business_name TEXT,
  business_email TEXT,
  business_phone TEXT,
  business_whatsapp TEXT,
  business_type TEXT,
  business_description TEXT,
  business_street TEXT,
  business_number TEXT,
  business_postal TEXT,
  business_city TEXT,
  business_country TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  linkedin TEXT,
  calendar_id UUID,
  calendar_name TEXT,
  calendar_slug TEXT,
  timezone TEXT,
  calendar_active BOOLEAN,
  calendar_description TEXT,
  calendar_color TEXT,
  booking_window_days INTEGER,
  minimum_notice_hours INTEGER,
  slot_duration INTEGER,
  buffer_time INTEGER,
  max_bookings_per_day INTEGER,
  allow_waitlist BOOLEAN,
  confirmation_required BOOLEAN,
  whatsapp_bot_active BOOLEAN,
  available_slots JSONB,
  upcoming_bookings JSONB,
  services JSONB,
  opening_hours JSONB,
  total_bookings INTEGER,
  total_revenue NUMERIC,
  created_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.business_name,
    u.business_email,
    u.business_phone,
    u.business_whatsapp,
    u.business_type,
    u.business_description,
    u.business_street,
    u.business_number,
    u.business_postal,
    u.business_city,
    u.business_country,
    u.website,
    u.instagram,
    u.facebook,
    u.linkedin,
    c.id as calendar_id,
    c.name as calendar_name,
    c.slug as calendar_slug,
    c.timezone,
    c.is_active as calendar_active,
    c.description as calendar_description,
    c.color as calendar_color,
    cs.booking_window_days,
    cs.minimum_notice_hours,
    cs.slot_duration,
    cs.buffer_time,
    cs.max_bookings_per_day,
    cs.allow_waitlist,
    cs.confirmation_required,
    cs.whatsapp_bot_active,
    
    -- Available slots (next 7 days) as JSON array
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
        WHERE asv.calendar_id = c.id
          AND asv.slot_start >= NOW()
          AND asv.slot_start < NOW() + INTERVAL '7 days'
          AND asv.is_available = true
        ORDER BY slot_date, start_time
        LIMIT 50
      ) slots
    ), '[]'::jsonb) as available_slots,
    
    -- Upcoming bookings as JSON array
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'booking_id', b.id,
        'customer_name', b.customer_name,
        'service_name', b.service_name,
        'start_time', b.start_time,
        'end_time', b.end_time,
        'status', b.status,
        'total_price', b.total_price
      ))
      FROM bookings b
      WHERE b.calendar_id = c.id
        AND b.start_time >= NOW()
        AND b.is_deleted = false
      ORDER BY b.start_time
      LIMIT 20
    ), '[]'::jsonb) as upcoming_bookings,
    
    -- Services as JSON array
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
      WHERE st.calendar_id = c.id
        AND st.is_active = true
      ORDER BY st.name
    ), '[]'::jsonb) as services,
    
    -- Opening hours as JSON
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
        WHERE asch.calendar_id = c.id
          AND asch.is_default = true
        ORDER BY ar.day_of_week
      ) rules
    ), '{}'::jsonb) as opening_hours,
    
    -- Statistics
    (
      SELECT COUNT(*)::integer
      FROM bookings b
      WHERE b.calendar_id = c.id
        AND b.is_deleted = false
    ) as total_bookings,
    
    (
      SELECT COALESCE(SUM(b.total_price), 0)
      FROM bookings b
      WHERE b.calendar_id = c.id
        AND b.is_deleted = false
        AND b.status = 'confirmed'
    ) as total_revenue,
    
    c.created_at,
    NOW() as last_updated
    
  FROM users u
  JOIN calendars c ON c.user_id = u.id
  LEFT JOIN calendar_settings cs ON cs.calendar_id = c.id
  WHERE c.is_active = true
    AND c.is_deleted = false
    AND (p_business_name IS NULL OR u.business_name ILIKE '%' || p_business_name || '%')
    AND (p_business_type IS NULL OR u.business_type = p_business_type)
    AND (p_city IS NULL OR u.business_city ILIKE '%' || p_city || '%')
    AND (p_calendar_slug IS NULL OR c.slug = p_calendar_slug)
  ORDER BY u.business_name, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_business_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_overview TO anon;