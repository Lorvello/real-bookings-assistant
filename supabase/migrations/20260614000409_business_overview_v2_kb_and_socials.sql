-- Extend business_overview_v2 (the per-user projection the WhatsApp agent reads,
-- confirmed via the n8n export: agent uses both business_overview V1 and V2) with
-- the Booking-Agent-Knowledge-Base policy fields + the tiktok/youtube/x socials.
-- V2 previously omitted these, so they silently never reached the agent's V2 read
-- (SETTINGS_RESEARCH.md line 73). Adds the columns, projects them from users in
-- refresh_business_overview_v2, and extends the users->V2 refresh trigger WHEN
-- clause so a change to any of them actually re-projects. Verified live: setting
-- users.cancellation_policy / parking_info / tiktok lands in business_overview_v2,
-- then reverts cleanly.

ALTER TABLE public.business_overview_v2
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS youtube text,
  ADD COLUMN IF NOT EXISTS x text,
  ADD COLUMN IF NOT EXISTS cancellation_policy text,
  ADD COLUMN IF NOT EXISTS payment_info text,
  ADD COLUMN IF NOT EXISTS parking_info text,
  ADD COLUMN IF NOT EXISTS public_transport_info text,
  ADD COLUMN IF NOT EXISTS accessibility_info text,
  ADD COLUMN IF NOT EXISTS preparation_info text,
  ADD COLUMN IF NOT EXISTS other_info text;

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
      tiktok, youtube, x,
      cancellation_policy, payment_info, parking_info, public_transport_info, accessibility_info, preparation_info, other_info,
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
      u.tiktok, u.youtube, u.x,
      u.cancellation_policy, u.payment_info, u.parking_info, u.public_transport_info, u.accessibility_info, u.preparation_info, u.other_info,
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
$function$
;

DROP TRIGGER IF EXISTS trigger_users_v2_refresh ON public.users;
CREATE TRIGGER trigger_users_v2_refresh AFTER UPDATE ON public.users FOR EACH ROW
WHEN ( old.business_name IS DISTINCT FROM new.business_name OR old.business_email IS DISTINCT FROM new.business_email OR old.business_phone IS DISTINCT FROM new.business_phone OR old.business_whatsapp IS DISTINCT FROM new.business_whatsapp OR old.business_type IS DISTINCT FROM new.business_type OR old.business_description IS DISTINCT FROM new.business_description OR old.business_street IS DISTINCT FROM new.business_street OR old.business_city IS DISTINCT FROM new.business_city OR old.business_country IS DISTINCT FROM new.business_country OR old.website IS DISTINCT FROM new.website OR old.instagram IS DISTINCT FROM new.instagram OR old.facebook IS DISTINCT FROM new.facebook OR old.linkedin IS DISTINCT FROM new.linkedin OR old.tiktok IS DISTINCT FROM new.tiktok OR old.youtube IS DISTINCT FROM new.youtube OR old.x IS DISTINCT FROM new.x OR old.cancellation_policy IS DISTINCT FROM new.cancellation_policy OR old.payment_info IS DISTINCT FROM new.payment_info OR old.parking_info IS DISTINCT FROM new.parking_info OR old.public_transport_info IS DISTINCT FROM new.public_transport_info OR old.accessibility_info IS DISTINCT FROM new.accessibility_info OR old.preparation_info IS DISTINCT FROM new.preparation_info OR old.other_info IS DISTINCT FROM new.other_info )
EXECUTE FUNCTION trigger_business_overview_v2_refresh();
