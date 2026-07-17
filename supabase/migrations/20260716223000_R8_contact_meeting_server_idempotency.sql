-- R8: make contact-meeting creation server-side, idempotent and race-safe.
--
-- Reproduced final-schema defect:
--   * Contact.tsx attempted a direct anon INSERT, but anon had no table INSERT
--     privilege, so every meeting submission failed before email delivery;
--   * the permissive INSERT policy was misleading and bypassed the Edge rate limit
--     if a future blanket grant re-enabled it;
--   * availability check + insert were separate client operations with no unique
--     active-slot constraint.

ALTER TABLE public.contact_meetings
  ADD COLUMN IF NOT EXISTS submission_id uuid,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS delivery_updated_at timestamp with time zone;

UPDATE public.contact_meetings
SET
  submission_id = COALESCE(submission_id, gen_random_uuid()),
  delivery_status = COALESCE(delivery_status, 'legacy'),
  delivery_updated_at = COALESCE(delivery_updated_at, updated_at, created_at)
WHERE submission_id IS NULL
   OR delivery_status IS NULL
   OR delivery_updated_at IS NULL;

ALTER TABLE public.contact_meetings
  ALTER COLUMN submission_id SET NOT NULL,
  ALTER COLUMN delivery_status SET DEFAULT 'pending',
  ALTER COLUMN delivery_status SET NOT NULL;

ALTER TABLE public.contact_meetings
  DROP CONSTRAINT IF EXISTS contact_meetings_delivery_status_check;
ALTER TABLE public.contact_meetings
  ADD CONSTRAINT contact_meetings_delivery_status_check
  CHECK (delivery_status IN ('pending', 'delivered', 'recorded', 'failed', 'legacy'));

CREATE UNIQUE INDEX IF NOT EXISTS contact_meetings_submission_id_uidx
  ON public.contact_meetings(submission_id);

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.contact_meetings
    WHERE status <> 'cancelled'
    GROUP BY meeting_date, meeting_time
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce unique active contact meeting slots: duplicate active slots exist';
  END IF;
END;
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS contact_meetings_active_slot_uidx
  ON public.contact_meetings(meeting_date, meeting_time)
  WHERE status <> 'cancelled';

DROP POLICY IF EXISTS "Anyone can create contact meetings"
ON public.contact_meetings;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON public.contact_meetings
FROM anon, authenticated;

-- Admins can use the existing is_admin() SELECT policy. All writes are server-side.
GRANT SELECT ON public.contact_meetings TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_contact_meeting(
  p_submission_id uuid,
  p_name text,
  p_email text,
  p_company text,
  p_country text,
  p_subject text,
  p_budget text,
  p_message text,
  p_meeting_date date,
  p_meeting_time time without time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_existing public.contact_meetings%ROWTYPE;
  v_id uuid;
  v_today date := (now() AT TIME ZONE 'Europe/Amsterdam')::date;
BEGIN
  IF p_submission_id IS NULL
     OR p_name IS NULL
     OR p_email IS NULL
     OR p_subject IS NULL
     OR p_message IS NULL
     OR p_meeting_date IS NULL
     OR p_meeting_time IS NULL
     OR length(btrim(p_name)) NOT BETWEEN 2 AND 100
     OR length(btrim(p_email)) NOT BETWEEN 3 AND 254
     OR length(btrim(p_subject)) NOT BETWEEN 1 AND 100
     OR length(btrim(p_message)) NOT BETWEEN 10 AND 2000
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PAYLOAD'
    );
  END IF;

  IF p_meeting_date < v_today OR p_meeting_date > v_today + 30 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DATE'
    );
  END IF;

  IF extract(isodow FROM p_meeting_date) NOT BETWEEN 1 AND 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DATE'
    );
  END IF;

  IF extract(hour FROM p_meeting_time) NOT BETWEEN 9 AND 17
     OR extract(minute FROM p_meeting_time) <> 0
     OR extract(second FROM p_meeting_time) <> 0
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TIME'
    );
  END IF;

  SELECT *
  INTO v_existing
  FROM public.contact_meetings
  WHERE submission_id = p_submission_id;

  IF FOUND THEN
    IF v_existing.name IS NOT DISTINCT FROM btrim(p_name)
       AND v_existing.email IS NOT DISTINCT FROM lower(btrim(p_email))
       AND v_existing.company IS NOT DISTINCT FROM nullif(btrim(p_company), '')
       AND v_existing.country IS NOT DISTINCT FROM nullif(btrim(p_country), '')
       AND v_existing.subject IS NOT DISTINCT FROM btrim(p_subject)
       AND v_existing.budget IS NOT DISTINCT FROM nullif(btrim(p_budget), '')
       AND v_existing.message IS NOT DISTINCT FROM btrim(p_message)
       AND v_existing.meeting_date IS NOT DISTINCT FROM p_meeting_date
       AND v_existing.meeting_time IS NOT DISTINCT FROM p_meeting_time
    THEN
      RETURN jsonb_build_object(
        'success', true,
        'meeting_id', v_existing.id,
        'replayed', true
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'IDEMPOTENCY_CONFLICT'
    );
  END IF;

  INSERT INTO public.contact_meetings (
    submission_id,
    name,
    email,
    company,
    country,
    subject,
    budget,
    message,
    meeting_date,
    meeting_time,
    status,
    delivery_status,
    delivery_updated_at
  )
  VALUES (
    p_submission_id,
    btrim(p_name),
    lower(btrim(p_email)),
    nullif(btrim(p_company), ''),
    nullif(btrim(p_country), ''),
    btrim(p_subject),
    nullif(btrim(p_budget), ''),
    btrim(p_message),
    p_meeting_date,
    p_meeting_time,
    'scheduled',
    'pending',
    now()
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'success', true,
    'meeting_id', v_id,
    'replayed', false
  );
EXCEPTION
  WHEN unique_violation THEN
    -- A concurrent replay may have won the submission-id race. Re-read it and
    -- distinguish that from a different submission winning the active slot.
    SELECT *
    INTO v_existing
    FROM public.contact_meetings
    WHERE submission_id = p_submission_id;

    IF FOUND
       AND v_existing.name IS NOT DISTINCT FROM btrim(p_name)
       AND v_existing.email IS NOT DISTINCT FROM lower(btrim(p_email))
       AND v_existing.company IS NOT DISTINCT FROM nullif(btrim(p_company), '')
       AND v_existing.country IS NOT DISTINCT FROM nullif(btrim(p_country), '')
       AND v_existing.subject IS NOT DISTINCT FROM btrim(p_subject)
       AND v_existing.budget IS NOT DISTINCT FROM nullif(btrim(p_budget), '')
       AND v_existing.message IS NOT DISTINCT FROM btrim(p_message)
       AND v_existing.meeting_date IS NOT DISTINCT FROM p_meeting_date
       AND v_existing.meeting_time IS NOT DISTINCT FROM p_meeting_time
    THEN
      RETURN jsonb_build_object(
        'success', true,
        'meeting_id', v_existing.id,
        'replayed', true
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SLOT_UNAVAILABLE'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_contact_meeting_delivery(
  p_submission_id uuid,
  p_delivery_status text,
  p_provider_message_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_meeting_id uuid;
BEGIN
  IF p_delivery_status NOT IN ('delivered', 'recorded', 'failed') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_DELIVERY_STATUS'
    );
  END IF;

  UPDATE public.contact_meetings
  SET
    delivery_status = p_delivery_status,
    provider_message_id = CASE
      WHEN p_delivery_status = 'delivered' THEN p_provider_message_id
      ELSE NULL
    END,
    delivery_updated_at = now(),
    updated_at = now()
  WHERE submission_id = p_submission_id
  RETURNING id INTO v_meeting_id;

  IF v_meeting_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MEETING_NOT_FOUND'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'meeting_id', v_meeting_id
  );
END;
$function$;

-- Availability stays deliberately public but exposes only occupied dates/times.
CREATE OR REPLACE FUNCTION public.check_meeting_slot_available(
  p_date date,
  p_time time without time zone
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.contact_meetings
    WHERE meeting_date = p_date
      AND meeting_time = p_time
      AND status <> 'cancelled'
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_booked_meeting_slots(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(meeting_date date, meeting_time time without time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT cm.meeting_date, cm.meeting_time
  FROM public.contact_meetings cm
  WHERE cm.meeting_date BETWEEN p_start_date AND p_end_date
    AND cm.status <> 'cancelled'
  ORDER BY cm.meeting_date, cm.meeting_time;
$function$;

REVOKE ALL ON FUNCTION public.reserve_contact_meeting(
  uuid, text, text, text, text, text, text, text, date, time without time zone
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_contact_meeting(
  uuid, text, text, text, text, text, text, text, date, time without time zone
) TO service_role;

REVOKE ALL ON FUNCTION public.record_contact_meeting_delivery(uuid, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_contact_meeting_delivery(uuid, text, text)
TO service_role;

REVOKE ALL ON FUNCTION public.check_meeting_slot_available(
  date, time without time zone
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_meeting_slot_available(
  date, time without time zone
) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_booked_meeting_slots(date, date)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booked_meeting_slots(date, date)
TO anon, authenticated, service_role;
