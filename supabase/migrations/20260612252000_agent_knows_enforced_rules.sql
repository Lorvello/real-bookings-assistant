-- Give the WhatsApp agent the ENFORCED payment & cancellation rules (not just the
-- free-text policy from LR-R28). Customers ask "do I pay now?" / "can I cancel?" —
-- the agent should answer with the exact values the booking service enforces:
--   from calendar_settings: allow_cancellations, cancellation_deadline_hours
--   from payment_settings:  payment_required_for_booking, payment_optional,
--                           allowed_payment_timing, refund_policy_text,
--                           secure_payments_enabled
-- These flow to the agent automatically (column-agnostic get on business_overview).

-- 1. Projection columns on business_overview (the agent's table).
ALTER TABLE public.business_overview
  ADD COLUMN IF NOT EXISTS allow_cancellations boolean,
  ADD COLUMN IF NOT EXISTS cancellation_deadline_hours integer,
  ADD COLUMN IF NOT EXISTS payment_required_for_booking boolean,
  ADD COLUMN IF NOT EXISTS payment_optional boolean,
  ADD COLUMN IF NOT EXISTS allowed_payment_timing jsonb,
  ADD COLUMN IF NOT EXISTS refund_policy_text text,
  ADD COLUMN IF NOT EXISTS secure_payments_enabled boolean;

-- 2. Rebuild refresh_business_overview: LR-R28 version + the 7 enforced-rule fields
--    and a LEFT JOIN to payment_settings.
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
      allow_cancellations, cancellation_deadline_hours,
      payment_required_for_booking, payment_optional, allowed_payment_timing, refund_policy_text, secure_payments_enabled,
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
      cs.allow_cancellations, cs.cancellation_deadline_hours,
      ps.payment_required_for_booking, ps.payment_optional, ps.allowed_payment_timing, ps.refund_policy_text, ps.secure_payments_enabled,
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
    LEFT JOIN payment_settings ps ON c.id = ps.calendar_id
    WHERE c.id = v_calendar_id;
  END LOOP;
END;
$function$;

-- 3. payment_settings changes must also refresh the agent's table. Extend the
--    LR-R30 freshness trigger function to resolve payment_settings.calendar_id,
--    and add the trigger.
CREATE OR REPLACE FUNCTION public.refresh_v1_business_overview_for_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_calendar_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('service_types', 'calendar_settings', 'bookings', 'payment_settings') THEN
    v_calendar_id := COALESCE(NEW.calendar_id, OLD.calendar_id);
  ELSIF TG_TABLE_NAME = 'calendars' THEN
    v_calendar_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'availability_rules' THEN
    SELECT s.calendar_id INTO v_calendar_id
    FROM availability_schedules s
    WHERE s.id = COALESCE(NEW.schedule_id, OLD.schedule_id);
  END IF;

  IF v_calendar_id IS NOT NULL THEN
    BEGIN
      PERFORM refresh_business_overview(v_calendar_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'refresh_business_overview failed for calendar %: %', v_calendar_id, SQLERRM;
    END;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_payment_settings_refresh_bo_v1 ON public.payment_settings;
CREATE TRIGGER trg_payment_settings_refresh_bo_v1
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION refresh_v1_business_overview_for_row();

-- 4. Backfill existing rows so the new enforced-rule columns populate now.
SELECT refresh_business_overview();
