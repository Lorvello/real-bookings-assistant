-- Update service_types_overview view to use Dutch day names
DROP VIEW IF EXISTS public.service_types_overview;

CREATE VIEW public.service_types_overview 
WITH (security_invoker = on) AS
SELECT 
    st.id,
    st.name AS service_name,
    st.description,
    st.duration,
    st.price,
    st.color,
    st.is_active,
    st.calendar_id,
    c.name AS calendar_name,
    c.slug AS calendar_slug,
    c.timezone,
    c.is_active AS calendar_active,
    u.business_name,
    COALESCE(cs.buffer_time, 0) AS buffer_time,
    COALESCE(cs.slot_duration, 30) AS slot_duration,
    COALESCE(cs.minimum_notice_hours, 1) AS minimum_notice_hours,
    COALESCE(cs.booking_window_days, 60) AS booking_window_days,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'day_of_week', CASE ar.day_of_week
                    WHEN 1 THEN 'Maandag'
                    WHEN 2 THEN 'Dinsdag'
                    WHEN 3 THEN 'Woensdag'
                    WHEN 4 THEN 'Donderdag'
                    WHEN 5 THEN 'Vrijdag'
                    WHEN 6 THEN 'Zaterdag'
                    WHEN 7 THEN 'Zondag'
                    ELSE 'Onbekend'
                END,
                'start_time', ar.start_time,
                'end_time', ar.end_time,
                'is_available', ar.is_available
            ) ORDER BY ar.day_of_week
        )
        FROM availability_schedules asc_inner
        JOIN availability_rules ar ON ar.schedule_id = asc_inner.id
        WHERE asc_inner.calendar_id = c.id
        AND asc_inner.is_default = true
    ) AS opening_hours,
    st.created_at
FROM service_types st
LEFT JOIN calendars c ON c.id = st.calendar_id
LEFT JOIN calendar_settings cs ON cs.calendar_id = c.id
LEFT JOIN users u ON u.id = c.user_id
WHERE COALESCE(st.is_deleted, false) = false;

-- Update refresh_business_overview function to use Dutch day names
CREATE OR REPLACE FUNCTION public.refresh_business_overview(p_calendar_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_calendar_id UUID;
BEGIN
  FOR v_calendar_id IN
    SELECT id
    FROM calendars
    WHERE is_active = true
      AND COALESCE(is_deleted, false) = false
      AND (p_calendar_id IS NULL OR id = p_calendar_id)
  LOOP
    DELETE FROM business_overview WHERE calendar_id = v_calendar_id;

    INSERT INTO business_overview (
      user_id, calendar_id, calendar_name, calendar_slug, calendar_description, calendar_color, calendar_active, timezone,
      business_name, business_email, business_phone, business_whatsapp, business_type, business_description,
      business_street, business_number, business_postal, business_city, business_country,
      website, instagram, facebook, linkedin,
      booking_window_days, minimum_notice_hours, slot_duration, buffer_time, max_bookings_per_day,
      allow_waitlist, confirmation_required, whatsapp_bot_active,
      available_slots, upcoming_bookings, services, opening_hours,
      total_bookings, total_revenue, created_at, last_updated
    )
    SELECT
      c.user_id, c.id, c.name, c.slug, c.description, c.color, c.is_active, c.timezone,
      u.business_name, u.business_email, u.business_phone, u.business_whatsapp, u.business_type, u.business_description,
      u.business_street, u.business_number, u.business_postal, u.business_city, u.business_country,
      u.website, u.instagram, u.facebook, u.linkedin,
      cs.booking_window_days, cs.minimum_notice_hours, cs.slot_duration, cs.buffer_time, cs.max_bookings_per_day,
      cs.allow_waitlist, cs.confirmation_required, cs.whatsapp_bot_active,
      '[]'::jsonb,
      COALESCE((
        SELECT jsonb_agg(to_jsonb(x))
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
          LIMIT 10
        ) x
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
        WHERE st.calendar_id = c.id
          AND st.is_active = true
          AND COALESCE(st.is_deleted, false) = false
      ), '[]'::jsonb),
      -- Opening hours with Dutch day names
      COALESCE((
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
$function$;

-- Also update refresh_business_overview_v2 function
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

-- Refresh all business_overview data to apply the changes
SELECT refresh_business_overview();
SELECT refresh_business_overview_v2();