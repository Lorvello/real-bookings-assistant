-- Update refresh_business_overview_v2 function to include calendar_id in services JSONB
CREATE OR REPLACE FUNCTION public.refresh_business_overview_v2(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT DISTINCT u.id
    FROM users u
    JOIN calendars c ON c.user_id = u.id
    WHERE c.is_active = true
      AND COALESCE(c.is_deleted, false) = false
      AND (p_user_id IS NULL OR u.id = p_user_id)
  LOOP
    DELETE FROM business_overview_v2 WHERE user_id = v_user_id;

    INSERT INTO business_overview_v2 (
      user_id,
      business_name, business_email, business_phone, business_whatsapp,
      business_type, business_description,
      business_street, business_number, business_postal, business_city, business_country,
      website, instagram, facebook, linkedin,
      calendars,
      total_calendars, total_bookings, total_revenue,
      created_at, last_updated
    )
    SELECT
      u.id,
      u.business_name, u.business_email, u.business_phone, u.business_whatsapp,
      u.business_type, u.business_description,
      u.business_street, u.business_number, u.business_postal, u.business_city, u.business_country,
      u.website, u.instagram, u.facebook, u.linkedin,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'calendar_id', c.id,
            'calendar_name', c.name,
            'calendar_slug', c.slug,
            'calendar_color', c.color,
            'calendar_description', c.description,
            'calendar_active', c.is_active,
            'timezone', c.timezone,
            'services', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'service_id', st.id,
                  'calendar_id', st.calendar_id,
                  'name', st.name,
                  'description', st.description,
                  'duration', st.duration,
                  'price', st.price,
                  'color', st.color,
                  'is_active', st.is_active
                )
              )
              FROM service_types st
              WHERE st.calendar_id = c.id
                AND st.is_active = true
                AND COALESCE(st.is_deleted, false) = false
            ), '[]'::jsonb),
            'opening_hours', COALESCE((
              SELECT jsonb_object_agg(
                CASE ar.day_of_week
                  WHEN 1 THEN 'Maandag'
                  WHEN 2 THEN 'Dinsdag'
                  WHEN 3 THEN 'Woensdag'
                  WHEN 4 THEN 'Donderdag'
                  WHEN 5 THEN 'Vrijdag'
                  WHEN 6 THEN 'Zaterdag'
                  WHEN 7 THEN 'Zondag'
                  ELSE 'Onbekend'
                END,
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
            'upcoming_bookings', COALESCE((
              SELECT jsonb_agg(to_jsonb(bk))
              FROM (
                SELECT
                  b.id AS booking_id,
                  b.customer_name,
                  COALESCE(st.name, b.service_name) AS service_name,
                  b.start_time,
                  b.end_time,
                  b.status,
                  COALESCE(b.total_amount_cents::numeric / 100, b.total_price) AS total_price
                FROM bookings b
                LEFT JOIN service_types st ON b.service_type_id = st.id
                WHERE b.calendar_id = c.id
                  AND b.start_time >= NOW()
                  AND b.status IN ('confirmed', 'pending')
                  AND COALESCE(b.is_deleted, false) = false
                ORDER BY b.start_time
                LIMIT 5
              ) bk
            ), '[]'::jsonb),
            'settings', jsonb_build_object(
              'booking_window_days', cs.booking_window_days,
              'minimum_notice_hours', cs.minimum_notice_hours,
              'slot_duration', cs.slot_duration,
              'buffer_time', cs.buffer_time,
              'max_bookings_per_day', cs.max_bookings_per_day,
              'allow_waitlist', cs.allow_waitlist,
              'confirmation_required', cs.confirmation_required,
              'whatsapp_bot_active', cs.whatsapp_bot_active
            ),
            'calendar_bookings', COALESCE((
              SELECT COUNT(*)::integer
              FROM bookings b
              WHERE b.calendar_id = c.id
                AND COALESCE(b.is_deleted, false) = false
            ), 0),
            'calendar_revenue', COALESCE((
              SELECT SUM(COALESCE(b.total_amount_cents::numeric / 100, b.total_price))
              FROM bookings b
              WHERE b.calendar_id = c.id
                AND b.status = 'confirmed'
                AND COALESCE(b.is_deleted, false) = false
            ), 0)
          )
        )
        FROM calendars c
        LEFT JOIN calendar_settings cs ON c.id = cs.calendar_id
        WHERE c.user_id = u.id
          AND c.is_active = true
          AND COALESCE(c.is_deleted, false) = false
      ), '[]'::jsonb),
      (SELECT COUNT(*)::integer FROM calendars c WHERE c.user_id = u.id AND c.is_active = true AND COALESCE(c.is_deleted, false) = false),
      COALESCE((
        SELECT SUM(booking_count)::integer
        FROM (
          SELECT COUNT(*) as booking_count
          FROM bookings b
          JOIN calendars c ON b.calendar_id = c.id
          WHERE c.user_id = u.id
            AND COALESCE(b.is_deleted, false) = false
        ) sub
      ), 0),
      COALESCE((
        SELECT SUM(COALESCE(b.total_amount_cents::numeric / 100, b.total_price))
        FROM bookings b
        JOIN calendars c ON b.calendar_id = c.id
        WHERE c.user_id = u.id
          AND b.status = 'confirmed'
          AND COALESCE(b.is_deleted, false) = false
      ), 0),
      (SELECT MIN(c.created_at) FROM calendars c WHERE c.user_id = u.id),
      NOW()
    FROM users u
    WHERE u.id = v_user_id;
  END LOOP;
END;
$function$;

-- Refresh all data to include the new calendar_id field in services
SELECT refresh_business_overview_v2();