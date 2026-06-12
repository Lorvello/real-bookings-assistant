-- Extend the booking-agent knowledge base with the three customer-facing fields
-- the agent is most often asked about but previously had no way to answer:
--   * cancellation_policy  — can I cancel/reschedule, until when, any fee?
--   * payment_info         — deposit / upfront / accepted payment methods (plain language)
--   * preparation_info     — what to bring / how to prepare for the appointment
--
-- The agent reads business_overview via a column-agnostic `get` (no field whitelist),
-- so adding the columns here flows them to the WhatsApp agent automatically — no n8n
-- workflow change needed. This mirrors the LR-R16 wiring of the existing 4 KB fields.

-- 1. Source columns on users (where the settings form writes)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cancellation_policy text,
  ADD COLUMN IF NOT EXISTS payment_info text,
  ADD COLUMN IF NOT EXISTS preparation_info text;

-- 2. Projection columns on business_overview (what the agent reads)
ALTER TABLE public.business_overview
  ADD COLUMN IF NOT EXISTS cancellation_policy text,
  ADD COLUMN IF NOT EXISTS payment_info text,
  ADD COLUMN IF NOT EXISTS preparation_info text;

-- 3. Repopulate refresh_business_overview to carry the 3 new fields.
--    Identical to the LR-R16 version except the three added columns (INSERT list + SELECT).
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
      parking_info, public_transport_info, accessibility_info, other_info,
      cancellation_policy, payment_info, preparation_info,
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
      u.parking_info, u.public_transport_info, u.accessibility_info, u.other_info,
      u.cancellation_policy, u.payment_info, u.preparation_info,
      cs.booking_window_days, cs.minimum_notice_hours, cs.slot_duration, cs.buffer_time, cs.max_bookings_per_day,
      cs.allow_waitlist, cs.confirmation_required, cs.whatsapp_bot_active,
      '[]'::jsonb,
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
          ) ORDER BY b.start_time
        )
        FROM bookings b
        LEFT JOIN service_types st ON b.service_type_id = st.id
        WHERE b.calendar_id = c.id
          AND b.start_time >= NOW()
          AND b.status IN ('confirmed', 'pending')
          AND COALESCE(b.is_deleted, false) = false
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

-- 4. Re-fire the projection whenever the new KB fields change on users.
DROP TRIGGER IF EXISTS trigger_users_refresh_business_overview ON public.users;
CREATE TRIGGER trigger_users_refresh_business_overview
  AFTER UPDATE OF
    business_name, business_email, business_phone, business_whatsapp, business_type, business_description,
    business_street, business_number, business_postal, business_city, business_country,
    website, instagram, facebook, linkedin,
    parking_info, public_transport_info, accessibility_info, other_info,
    cancellation_policy, payment_info, preparation_info
  ON public.users
  FOR EACH ROW EXECUTE FUNCTION users_refresh_business_overview();

-- 5. Backfill existing projection rows so the new columns exist & stay consistent.
SELECT refresh_business_overview();
