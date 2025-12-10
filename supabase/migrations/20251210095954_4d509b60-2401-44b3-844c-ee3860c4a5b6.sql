-- 1. Add trigger on service_types to refresh business_overview
CREATE TRIGGER trigger_service_types_business_overview_refresh
  AFTER INSERT OR UPDATE OR DELETE ON service_types
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_refresh();

-- 2. Update the refresh_business_overview function to fetch services directly
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
      -- FIXED: Fetch services directly from service_types by calendar_id instead of via calendar_service_types
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
$function$;

-- 3. Refresh all existing business_overview records with the new logic
SELECT refresh_business_overview(NULL);