-- Fix admin_ensure_user_has_calendar so developer status simulation works.
--
-- Two bugs broke every "past-setup" dev status (active_trial, expired_trial,
-- paid_subscriber, canceled_*, missed_payment):
--   1. The function inserted into service_types with a non-existent `user_id`
--      column -> exception -> the whole insert (incl. the calendar) rolled back,
--      so NOTHING was created.
--   2. Even when it "worked" it never created an availability schedule/rule, and
--      only ran when the user had 0 calendars.
--
-- get_user_status_type() gates on a COMPLETE setup (business name+type AND a
-- calendar AND an active service AND an availability rule) before it ever looks
-- at subscription status — so an incomplete setup always collapses to
-- 'setup_incomplete', and the dev dashboard could never show paid/trial/canceled
-- states.
--
-- Rewrite it to idempotently ensure a complete minimal setup: a calendar, an
-- active service type (correct columns), and a default Mon–Fri availability
-- schedule + rules. Creates only what's missing.

CREATE OR REPLACE FUNCTION public.admin_ensure_user_has_calendar(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_schedule_id uuid;
  d int;
BEGIN
  -- 1. Ensure a calendar (reuse an existing active one, else create).
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE user_id = p_user_id
    AND is_active = true
    AND (is_deleted IS NULL OR is_deleted = false)
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1;

  IF v_calendar_id IS NULL THEN
    INSERT INTO public.calendars (user_id, name, slug, description, timezone, color, is_active, is_default)
    VALUES (
      p_user_id, 'Personal Calendar', 'personal-' || substr(p_user_id::text, 1, 8),
      'Your personal appointment calendar', 'Europe/Amsterdam', '#3B82F6', true, true
    )
    RETURNING id INTO v_calendar_id;
  END IF;

  -- 2. Ensure an active service type (service_types has NO user_id column).
  IF NOT EXISTS (
    SELECT 1 FROM public.service_types
    WHERE calendar_id = v_calendar_id
      AND is_active = true
      AND (is_deleted IS NULL OR is_deleted = false)
  ) THEN
    INSERT INTO public.service_types (calendar_id, name, duration, price, description, color, is_active)
    VALUES (v_calendar_id, 'Standaard Afspraak', 30, 50.00, 'Standaard service type voor afspraken', '#3B82F6', true);
  END IF;

  -- 3. Ensure an availability schedule + Mon–Fri 09:00–17:00 rules.
  SELECT id INTO v_schedule_id
  FROM public.availability_schedules
  WHERE calendar_id = v_calendar_id
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1;

  IF v_schedule_id IS NULL THEN
    INSERT INTO public.availability_schedules (calendar_id, name, is_default)
    VALUES (v_calendar_id, 'Standaard Schema', true)
    RETURNING id INTO v_schedule_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.availability_rules WHERE schedule_id = v_schedule_id) THEN
    FOR d IN 1..5 LOOP
      INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
      VALUES (v_schedule_id, d, '09:00', '17:00', true);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Complete setup ensured', 'calendar_id', v_calendar_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to ensure setup: ' || SQLERRM);
END;
$function$;
