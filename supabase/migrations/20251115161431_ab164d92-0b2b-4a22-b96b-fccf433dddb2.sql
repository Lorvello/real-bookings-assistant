-- Completely rebuild the refresh_business_overview function with simplified logic
DROP FUNCTION IF EXISTS refresh_business_overview(UUID);

CREATE OR REPLACE FUNCTION refresh_business_overview(p_calendar_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing entry if exists
  DELETE FROM business_overview WHERE calendar_id = p_calendar_id;
  
  -- Insert new overview data with simplified aggregations
  INSERT INTO business_overview (
    user_id,
    calendar_id,
    calendar_name,
    calendar_slug,
    calendar_description,
    calendar_color,
    calendar_active,
    timezone,
    business_name,
    business_email,
    business_phone,
    business_whatsapp,
    business_type,
    business_description,
    business_street,
    business_number,
    business_postal,
    business_city,
    business_country,
    website,
    instagram,
    facebook,
    linkedin,
    booking_window_days,
    minimum_notice_hours,
    slot_duration,
    buffer_time,
    max_bookings_per_day,
    allow_waitlist,
    confirmation_required,
    whatsapp_bot_active,
    available_slots,
    upcoming_bookings,
    services,
    opening_hours,
    total_bookings,
    total_revenue,
    created_at,
    last_updated
  )
  SELECT
    c.user_id,
    c.id,
    c.name,
    c.slug,
    c.description,
    c.color,
    c.is_active,
    c.timezone,
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
    COALESCE(cs.booking_window_days, 60),
    COALESCE(cs.minimum_notice_hours, 1),
    COALESCE(cs.slot_duration, 30),
    COALESCE(cs.buffer_time, 0),
    cs.max_bookings_per_day,
    COALESCE(cs.allow_waitlist, false),
    COALESCE(cs.confirmation_required, true),
    COALESCE(cs.whatsapp_bot_active, false),
    -- Available slots: simplified direct aggregation from view
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', (slot_start AT TIME ZONE COALESCE(c.timezone, 'UTC'))::date,
          'start_time', (slot_start AT TIME ZONE COALESCE(c.timezone, 'UTC'))::time,
          'end_time', (slot_end AT TIME ZONE COALESCE(c.timezone, 'UTC'))::time,
          'service_name', service_name,
          'is_available', is_available
        )
      )
      FROM available_slots_view av
      WHERE av.calendar_id = c.id
        AND av.slot_start >= NOW()
        AND av.slot_start <= NOW() + INTERVAL '30 days'
      LIMIT 50
    ), '[]'::jsonb),
    -- Upcoming bookings: simplified aggregation
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'booking_id', b.id,
          'customer_name', b.customer_name,
          'service_name', b.service_name,
          'start_time', b.start_time,
          'end_time', b.end_time,
          'status', b.status,
          'total_price', b.total_price
        )
      )
      FROM bookings b
      WHERE b.calendar_id = c.id
        AND b.start_time >= NOW()
        AND b.status NOT IN ('cancelled', 'rejected')
        AND COALESCE(b.is_deleted, false) = false
      ORDER BY b.start_time
      LIMIT 20
    ), '[]'::jsonb),
    -- Services: direct aggregation from service_types with calendar join
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'service_id', st.id,
          'name', st.name,
          'description', st.description,
          'duration', st.duration,
          'price', st.price,
          'color', st.color,
          'is_active', st.is_active
        )
      )
      FROM service_types st
      INNER JOIN calendar_service_types cst ON cst.service_type_id = st.id
      WHERE cst.calendar_id = c.id
        AND st.is_active = true
    ), '[]'::jsonb),
    -- Opening hours: simplified object construction from availability_rules
    COALESCE((
      SELECT jsonb_object_agg(
        CASE ar.day_of_week
          WHEN 0 THEN 'monday'
          WHEN 1 THEN 'tuesday'
          WHEN 2 THEN 'wednesday'
          WHEN 3 THEN 'thursday'
          WHEN 4 THEN 'friday'
          WHEN 5 THEN 'saturday'
          WHEN 6 THEN 'sunday'
        END,
        jsonb_build_object(
          'start_time', ar.start_time::text,
          'end_time', ar.end_time::text,
          'is_available', ar.is_available
        )
      )
      FROM availability_rules ar
      INNER JOIN availability_schedules asch ON asch.id = ar.schedule_id
      WHERE asch.calendar_id = c.id
        AND asch.is_default = true
    ), '{}'::jsonb),
    -- Total bookings count
    COALESCE((
      SELECT COUNT(*)
      FROM bookings b
      WHERE b.calendar_id = c.id
        AND COALESCE(b.is_deleted, false) = false
    ), 0),
    -- Total revenue
    COALESCE((
      SELECT SUM(b.total_price)
      FROM bookings b
      WHERE b.calendar_id = c.id
        AND b.status = 'completed'
        AND COALESCE(b.is_deleted, false) = false
    ), 0),
    c.created_at,
    NOW()
  FROM calendars c
  LEFT JOIN users u ON u.id = c.user_id
  LEFT JOIN calendar_settings cs ON cs.calendar_id = c.id
  WHERE c.id = p_calendar_id
    AND c.is_active = true
    AND COALESCE(c.is_deleted, false) = false;
END;
$$;

-- Re-populate the business_overview table with the fixed function
DO $$
DECLARE
  cal_record RECORD;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR cal_record IN 
    SELECT id FROM public.calendars 
    WHERE is_active = true AND COALESCE(is_deleted, false) = false
  LOOP
    BEGIN
      PERFORM public.refresh_business_overview(cal_record.id);
      success_count := success_count + 1;
      RAISE NOTICE 'Successfully refreshed calendar %', cal_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'ERROR refreshing calendar %: %', cal_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Completed: % successful, % errors', success_count, error_count;
END $$;