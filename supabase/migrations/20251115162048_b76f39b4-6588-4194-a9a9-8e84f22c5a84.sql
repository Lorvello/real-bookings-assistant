-- Drop and recreate refresh_business_overview without available_slots dependency
DROP FUNCTION IF EXISTS refresh_business_overview(UUID);

CREATE OR REPLACE FUNCTION refresh_business_overview(p_calendar_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calendar_id UUID;
BEGIN
  -- If specific calendar_id provided, refresh that one, otherwise refresh all active calendars
  FOR v_calendar_id IN 
    SELECT id FROM calendars 
    WHERE is_active = true 
    AND COALESCE(is_deleted, false) = false
    AND (p_calendar_id IS NULL OR id = p_calendar_id)
  LOOP
    -- Delete existing overview for this calendar
    DELETE FROM business_overview WHERE calendar_id = v_calendar_id;
    
    -- Insert fresh overview data WITHOUT available_slots (set to empty array for now)
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
      cs.booking_window_days,
      cs.minimum_notice_hours,
      cs.slot_duration,
      cs.buffer_time,
      cs.max_bookings_per_day,
      cs.allow_waitlist,
      cs.confirmation_required,
      cs.whatsapp_bot_active,
      '[]'::jsonb, -- Empty array for available_slots (to be implemented separately)
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'booking_id', b.id,
            'customer_name', b.customer_name,
            'service_name', COALESCE(st.name, b.service_name),
            'start_time', b.start_time,
            'end_time', b.end_time,
            'status', b.status,
            'total_price', COALESCE(b.total_amount_cents::numeric / 100, b.total_price)
          )
        )
        FROM bookings b
        LEFT JOIN service_types st ON b.service_type_id = st.id
        WHERE b.calendar_id = c.id
        AND b.start_time >= NOW()
        AND b.status IN ('confirmed', 'pending')
        AND COALESCE(b.is_deleted, false) = false
        ORDER BY b.start_time
        LIMIT 10
      ), '[]'::jsonb),
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
        JOIN calendar_service_types cst ON st.id = cst.service_type_id
        WHERE cst.calendar_id = c.id
        AND st.is_active = true
      ), '[]'::jsonb),
      COALESCE((
        SELECT jsonb_object_agg(
          ar.day_of_week::text,
          jsonb_build_object(
            'start_time', ar.start_time::text,
            'end_time', ar.end_time::text,
            'is_available', ar.is_available
          )
        )
        FROM availability_rules ar
        JOIN availability_schedules avs ON ar.schedule_id = avs.id
        WHERE avs.calendar_id = c.id
        AND avs.is_default = true
      ), '{}'::jsonb),
      COALESCE((
        SELECT COUNT(*)::integer
        FROM bookings b
        WHERE b.calendar_id = c.id
        AND COALESCE(b.is_deleted, false) = false
      ), 0),
      COALESCE((
        SELECT SUM(COALESCE(b.total_amount_cents::numeric / 100, b.total_price))
        FROM bookings b
        WHERE b.calendar_id = c.id
        AND b.status = 'confirmed'
        AND COALESCE(b.is_deleted, false) = false
      ), 0),
      c.created_at,
      NOW()
    FROM calendars c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN calendar_settings cs ON c.id = cs.calendar_id
    WHERE c.id = v_calendar_id;
    
  END LOOP;
END;
$$;

-- Refresh all active calendars to populate data
DO $$
DECLARE
  v_calendar RECORD;
  v_error_count INTEGER := 0;
BEGIN
  FOR v_calendar IN 
    SELECT id, name FROM calendars 
    WHERE is_active = true 
    AND COALESCE(is_deleted, false) = false
  LOOP
    BEGIN
      PERFORM refresh_business_overview(v_calendar.id);
      RAISE NOTICE 'Successfully refreshed calendar: % (ID: %)', v_calendar.name, v_calendar.id;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING 'Failed to refresh calendar % (ID: %): %', v_calendar.name, v_calendar.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Refresh complete. Errors: %', v_error_count;
END $$;