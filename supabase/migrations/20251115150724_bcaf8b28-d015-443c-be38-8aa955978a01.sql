-- Fix get_business_overview function - remove ORDER BY from jsonb_agg to fix GROUP BY error
CREATE OR REPLACE FUNCTION public.get_business_overview(
  p_business_name text DEFAULT NULL,
  p_business_type text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_calendar_slug text DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
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
  calendar_id uuid,
  calendar_name text,
  calendar_slug text,
  timezone text,
  calendar_active boolean,
  calendar_description text,
  calendar_color text,
  booking_window_days integer,
  minimum_notice_hours integer,
  slot_duration integer,
  buffer_time integer,
  max_bookings_per_day integer,
  allow_waitlist boolean,
  confirmation_required boolean,
  whatsapp_bot_active boolean,
  available_slots jsonb,
  upcoming_bookings jsonb,
  services jsonb,
  opening_hours jsonb,
  total_bookings integer,
  total_revenue numeric,
  created_at timestamp with time zone,
  last_updated timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    
    -- Upcoming bookings as JSON array - FIX: moved ORDER BY outside jsonb_agg
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
        WHERE b.calendar_id = c.id
          AND b.start_time >= NOW()
          AND b.is_deleted = false
        ORDER BY b.start_time
        LIMIT 20
      ) ordered_bookings
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
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_business_overview TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_overview TO anon;