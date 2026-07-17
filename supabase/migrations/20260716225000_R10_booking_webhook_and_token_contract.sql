-- R10: restore the real booking write path and harden public token access.
--
-- The final historical schema had two active booking webhook triggers, both
-- pointing at trigger_booking_webhook(). That obsolete function referenced the
-- removed webhook_events.booking_id column and omitted the required payload, so
-- every booking INSERT failed before it could commit. Keep one canonical trigger
-- on the payload-producing handle_booking_webhook_trigger() function.
DROP TRIGGER IF EXISTS booking_webhook_trigger ON public.bookings;
DROP TRIGGER IF EXISTS trigger_booking_webhook_on_bookings ON public.bookings;

CREATE TRIGGER booking_webhook_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_webhook_trigger();

DROP FUNCTION IF EXISTS public.trigger_booking_webhook();

-- Public booking management is capability-token based. Keep the intentionally
-- public surface exact, schema-qualify every object and use an empty search path.
CREATE OR REPLACE FUNCTION public.get_booking_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  calendar_id uuid,
  service_type_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  notes text,
  total_price numeric,
  service_name text,
  business_name text,
  confirmation_token text,
  created_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.calendar_id,
    b.service_type_id,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.start_time,
    b.end_time,
    b.status,
    b.notes,
    b.total_price,
    b.service_name,
    b.business_name,
    b.confirmation_token,
    b.created_at,
    b.cancelled_at,
    b.cancellation_reason
  FROM public.bookings b
  JOIN public.calendars c ON c.id = b.calendar_id
  WHERE b.confirmation_token = p_token
    AND c.is_active = true
    AND COALESCE(c.is_deleted, false) = false
    AND COALESCE(b.is_deleted, false) = false
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking_by_token(
  p_token text,
  p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking_id uuid;
  v_status text;
  v_calendar_id uuid;
  v_start_time timestamptz;
  v_allow boolean;
  v_deadline numeric;
  v_hours numeric;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  SELECT b.id, b.status, b.calendar_id, b.start_time
  INTO v_booking_id, v_status, v_calendar_id, v_start_time
  FROM public.bookings b
  JOIN public.calendars c ON c.id = b.calendar_id
  WHERE b.confirmation_token = p_token
    AND c.is_active = true
    AND COALESCE(c.is_deleted, false) = false
    AND COALESCE(b.is_deleted, false) = false;

  IF v_booking_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking already cancelled');
  END IF;

  SELECT cs.allow_cancellations, cs.cancellation_deadline_hours
  INTO v_allow, v_deadline
  FROM public.calendar_settings cs
  WHERE cs.calendar_id = v_calendar_id;

  IF v_allow IS NOT NULL AND v_allow = false THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      'Cancellations are not allowed for this calendar. Please contact the business.'
    );
  END IF;

  v_hours := EXTRACT(EPOCH FROM (v_start_time - now())) / 3600;
  IF v_deadline IS NOT NULL AND v_hours < v_deadline THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      format(
        'Too late to cancel: this must be done at least %s hours in advance. Please contact the business.',
        v_deadline
      )
    );
  END IF;

  UPDATE public.bookings
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = COALESCE(p_reason, 'Cancelled by customer'),
    updated_at = now()
  WHERE public.bookings.id = v_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_booking_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_by_token(text)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_token(text, text)
  TO anon, authenticated, service_role;
