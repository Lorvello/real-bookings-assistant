-- R16: make outbound webhook delivery tenant-scoped, per-endpoint and atomic.
--
-- Before this migration every browser selected the same pending event and sent it
-- without a database claim. Two concurrent requests therefore duplicated every
-- outbound call. The event was also marked sent when only one of multiple active
-- endpoints succeeded, permanently hiding the failed delivery.

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL
    REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  endpoint_id uuid
    REFERENCES public.webhook_endpoints(id) ON DELETE SET NULL,
  endpoint_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  claim_token uuid,
  claimed_at timestamptz,
  next_attempt_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  last_http_status integer
    CHECK (last_http_status IS NULL OR last_http_status BETWEEN 100 AND 599),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, endpoint_id)
);

CREATE INDEX webhook_deliveries_claim_queue_idx
  ON public.webhook_deliveries (status, next_attempt_at, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX webhook_deliveries_event_status_idx
  ON public.webhook_deliveries (event_id, status);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_deliveries_owner_select
  ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_owner_select
  ON public.webhook_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.webhook_events event
      JOIN public.calendars calendar ON calendar.id = event.calendar_id
      WHERE event.id = webhook_deliveries.event_id
        AND calendar.user_id = auth.uid()
    )
  );

REVOKE ALL ON TABLE public.webhook_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.webhook_deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.webhook_deliveries TO service_role;

-- Owners may inspect their event history, but browsers must never forge queue
-- state or delivery results. Booking/database triggers are SECURITY DEFINER and
-- Edge processing uses service_role.
REVOKE ALL ON TABLE public.webhook_events FROM anon;
REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.webhook_events FROM authenticated;
GRANT SELECT ON TABLE public.webhook_events TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE
  ON TABLE public.webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_webhook_event_delivery_status(
  p_event_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer;
  v_sent integer;
  v_in_flight integer;
  v_retryable integer;
  v_attempts integer;
  v_last_attempt timestamptz;
  v_status text;
BEGIN
  SELECT
    count(*) FILTER (WHERE delivery.status <> 'cancelled'),
    count(*) FILTER (WHERE delivery.status = 'sent'),
    count(*) FILTER (WHERE delivery.status IN ('pending', 'processing')),
    count(*) FILTER (
      WHERE delivery.status = 'failed'
        AND delivery.attempts < 5
        AND delivery.next_attempt_at IS NOT NULL
    ),
    COALESCE(max(delivery.attempts), 0),
    max(delivery.last_attempt_at)
  INTO
    v_total,
    v_sent,
    v_in_flight,
    v_retryable,
    v_attempts,
    v_last_attempt
  FROM public.webhook_deliveries delivery
  WHERE delivery.event_id = p_event_id;

  v_status := CASE
    WHEN v_total = 0 THEN 'failed'
    WHEN v_sent = v_total THEN 'sent'
    WHEN v_in_flight > 0 OR v_retryable > 0 THEN 'pending'
    ELSE 'failed'
  END;

  UPDATE public.webhook_events event
  SET
    status = v_status,
    attempts = v_attempts,
    last_attempt_at = v_last_attempt
  WHERE event.id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_webhook_event_after_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.refresh_webhook_event_delivery_status(
    CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS webhook_delivery_status_refresh
  ON public.webhook_deliveries;
CREATE TRIGGER webhook_delivery_status_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.webhook_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_webhook_event_after_delivery();

CREATE OR REPLACE FUNCTION public.cancel_deleted_webhook_endpoint_delivery()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.endpoint_id IS NOT NULL AND NEW.endpoint_id IS NULL THEN
    NEW.status := 'cancelled';
    NEW.claim_token := NULL;
    NEW.claimed_at := NULL;
    NEW.next_attempt_at := NULL;
    NEW.last_error_code := 'endpoint_deleted';
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS webhook_delivery_endpoint_delete_cancel
  ON public.webhook_deliveries;
CREATE TRIGGER webhook_delivery_endpoint_delete_cancel
  BEFORE UPDATE OF endpoint_id ON public.webhook_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_deleted_webhook_endpoint_delivery();

CREATE OR REPLACE FUNCTION public.enqueue_webhook_deliveries_for_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.webhook_deliveries (
    event_id,
    endpoint_id,
    endpoint_url,
    status,
    next_attempt_at
  )
  SELECT
    NEW.id,
    endpoint.id,
    endpoint.webhook_url,
    'pending',
    now()
  FROM public.webhook_endpoints endpoint
  WHERE endpoint.calendar_id = NEW.calendar_id
    AND endpoint.is_active = true
  ON CONFLICT ON CONSTRAINT webhook_deliveries_event_id_endpoint_id_key
    DO NOTHING;

  PERFORM public.refresh_webhook_event_delivery_status(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS webhook_event_enqueue_deliveries
  ON public.webhook_events;
CREATE TRIGGER webhook_event_enqueue_deliveries
  AFTER INSERT ON public.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_webhook_deliveries_for_event();

-- Preserve pending/failed events across the additive migration. Sent events are
-- intentionally not backfilled because that would redeliver historical data.
INSERT INTO public.webhook_deliveries (
  event_id,
  endpoint_id,
  endpoint_url,
  status,
  next_attempt_at
)
SELECT
  event.id,
  endpoint.id,
  endpoint.webhook_url,
  'pending',
  now()
FROM public.webhook_events event
JOIN public.webhook_endpoints endpoint
  ON endpoint.calendar_id = event.calendar_id
 AND endpoint.is_active = true
WHERE event.status IN ('pending', 'failed')
ON CONFLICT ON CONSTRAINT webhook_deliveries_event_id_endpoint_id_key
  DO NOTHING;

DO $$
DECLARE
  v_event_id uuid;
BEGIN
  FOR v_event_id IN
    SELECT event.id
    FROM public.webhook_events event
    WHERE event.status IN ('pending', 'failed')
  LOOP
    PERFORM public.refresh_webhook_event_delivery_status(v_event_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_webhook_deliveries(
  p_user_id uuid,
  p_calendar_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_retry_failed boolean DEFAULT false,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  delivery_id uuid,
  delivery_claim_token uuid,
  event_id uuid,
  endpoint_id uuid,
  endpoint_url text,
  event_type text,
  event_payload jsonb,
  calendar_id uuid,
  event_created_at timestamptz,
  delivery_attempt integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'Invalid webhook claim limit' USING ERRCODE = '22023';
  END IF;

  IF p_user_id IS NOT NULL
     AND p_calendar_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.calendars calendar
       WHERE calendar.id = p_calendar_id
         AND calendar.user_id = p_user_id
     ) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  IF p_retry_failed
     AND p_user_id IS NOT NULL
     AND p_event_id IS NULL
     AND p_calendar_id IS NULL THEN
    RAISE EXCEPTION 'A calendar or event is required for browser retries'
      USING ERRCODE = '22023';
  END IF;

  -- A deleted or disabled endpoint must not leave an event permanently pending.
  UPDATE public.webhook_deliveries delivery
  SET
    status = 'cancelled',
    claim_token = NULL,
    claimed_at = NULL,
    next_attempt_at = NULL,
    last_error_code = 'endpoint_inactive',
    updated_at = now()
  WHERE delivery.status NOT IN ('sent', 'cancelled')
    AND EXISTS (
      SELECT 1
      FROM public.webhook_events event
      JOIN public.calendars calendar ON calendar.id = event.calendar_id
      WHERE event.id = delivery.event_id
        AND (p_user_id IS NULL OR calendar.user_id = p_user_id)
        AND (p_calendar_id IS NULL OR event.calendar_id = p_calendar_id)
        AND (p_event_id IS NULL OR event.id = p_event_id)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.webhook_endpoints endpoint
      WHERE endpoint.id = delivery.endpoint_id
        AND endpoint.is_active = true
    );

  -- A worker that disappeared after claiming a row releases it after two minutes.
  UPDATE public.webhook_deliveries delivery
  SET
    status = 'failed',
    claim_token = NULL,
    claimed_at = NULL,
    next_attempt_at = now(),
    last_error_code = 'claim_timeout',
    updated_at = now()
  WHERE delivery.status = 'processing'
    AND delivery.claimed_at < now() - interval '2 minutes'
    AND EXISTS (
      SELECT 1
      FROM public.webhook_events event
      JOIN public.calendars calendar ON calendar.id = event.calendar_id
      WHERE event.id = delivery.event_id
        AND (p_user_id IS NULL OR calendar.user_id = p_user_id)
        AND (p_calendar_id IS NULL OR event.calendar_id = p_calendar_id)
        AND (p_event_id IS NULL OR event.id = p_event_id)
    );

  -- Add any active endpoints missing from pending/failed events. This also lets
  -- an owner add an endpoint and explicitly retry an event that previously had
  -- no destination.
  INSERT INTO public.webhook_deliveries (
    event_id,
    endpoint_id,
    endpoint_url,
    status,
    next_attempt_at
  )
  SELECT
    event.id,
    endpoint.id,
    endpoint.webhook_url,
    'pending',
    now()
  FROM public.webhook_events event
  JOIN public.calendars calendar ON calendar.id = event.calendar_id
  JOIN public.webhook_endpoints endpoint
    ON endpoint.calendar_id = event.calendar_id
   AND endpoint.is_active = true
  WHERE event.status IN ('pending', 'failed')
    AND (p_user_id IS NULL OR calendar.user_id = p_user_id)
    AND (p_calendar_id IS NULL OR event.calendar_id = p_calendar_id)
    AND (p_event_id IS NULL OR event.id = p_event_id)
  ON CONFLICT ON CONSTRAINT webhook_deliveries_event_id_endpoint_id_key
    DO NOTHING;

  -- Re-enable a delivery when the same endpoint was disabled and later enabled.
  UPDATE public.webhook_deliveries delivery
  SET
    status = 'pending',
    endpoint_url = endpoint.webhook_url,
    next_attempt_at = now(),
    last_error_code = NULL,
    updated_at = now()
  FROM public.webhook_endpoints endpoint,
       public.webhook_events event,
       public.calendars calendar
  WHERE delivery.status = 'cancelled'
    AND endpoint.id = delivery.endpoint_id
    AND endpoint.is_active = true
    AND event.id = delivery.event_id
    AND event.status IN ('pending', 'failed')
    AND calendar.id = event.calendar_id
    AND (p_user_id IS NULL OR calendar.user_id = p_user_id)
    AND (p_calendar_id IS NULL OR event.calendar_id = p_calendar_id)
    AND (p_event_id IS NULL OR event.id = p_event_id);

  IF p_retry_failed THEN
    UPDATE public.webhook_deliveries delivery
    SET
      status = 'pending',
      next_attempt_at = now(),
      last_error_code = NULL,
      updated_at = now()
    WHERE delivery.status = 'failed'
      AND delivery.attempts < 8
      AND EXISTS (
        SELECT 1
        FROM public.webhook_events event
        JOIN public.calendars calendar ON calendar.id = event.calendar_id
        WHERE event.id = delivery.event_id
          AND (p_user_id IS NULL OR calendar.user_id = p_user_id)
          AND (p_calendar_id IS NULL OR event.calendar_id = p_calendar_id)
          AND (p_event_id IS NULL OR event.id = p_event_id)
      );
  END IF;

  UPDATE public.webhook_events event
  SET status = 'failed'
  WHERE event.status = 'pending'
    AND (p_calendar_id IS NULL OR event.calendar_id = p_calendar_id)
    AND (p_event_id IS NULL OR event.id = p_event_id)
    AND EXISTS (
      SELECT 1
      FROM public.calendars calendar
      WHERE calendar.id = event.calendar_id
        AND (p_user_id IS NULL OR calendar.user_id = p_user_id)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.webhook_deliveries delivery
      WHERE delivery.event_id = event.id
        AND delivery.status <> 'cancelled'
    );

  RETURN QUERY
  WITH candidates AS (
    SELECT delivery.id, endpoint.webhook_url
    FROM public.webhook_deliveries delivery
    JOIN public.webhook_events event ON event.id = delivery.event_id
    JOIN public.calendars calendar ON calendar.id = event.calendar_id
    JOIN public.webhook_endpoints endpoint
      ON endpoint.id = delivery.endpoint_id
     AND endpoint.is_active = true
    WHERE event.status IN ('pending', 'failed')
      AND delivery.status IN ('pending', 'failed')
      AND (delivery.status = 'pending' OR delivery.next_attempt_at <= now())
      AND delivery.attempts < CASE WHEN p_retry_failed THEN 8 ELSE 5 END
      AND (p_user_id IS NULL OR calendar.user_id = p_user_id)
      AND (p_calendar_id IS NULL OR event.calendar_id = p_calendar_id)
      AND (p_event_id IS NULL OR event.id = p_event_id)
    ORDER BY delivery.created_at, delivery.id
    FOR UPDATE OF delivery SKIP LOCKED
    LIMIT p_limit
  ),
  claimed AS (
    UPDATE public.webhook_deliveries delivery
    SET
      status = 'processing',
      attempts = delivery.attempts + 1,
      claim_token = gen_random_uuid(),
      claimed_at = now(),
      last_attempt_at = now(),
      endpoint_url = candidates.webhook_url,
      updated_at = now()
    FROM candidates
    WHERE delivery.id = candidates.id
    RETURNING delivery.*
  )
  SELECT
    claimed.id,
    claimed.claim_token,
    event.id,
    claimed.endpoint_id,
    claimed.endpoint_url,
    event.event_type,
    event.payload,
    event.calendar_id,
    event.created_at,
    claimed.attempts
  FROM claimed
  JOIN public.webhook_events event ON event.id = claimed.event_id
  ORDER BY event.created_at, claimed.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_webhook_delivery(
  p_delivery_id uuid,
  p_claim_token uuid,
  p_success boolean,
  p_http_status integer DEFAULT NULL,
  p_error_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id uuid;
  v_delivery_status text;
  v_event_status text;
  v_attempts integer;
  v_next_attempt timestamptz;
BEGIN
  IF p_http_status IS NOT NULL
     AND (p_http_status < 100 OR p_http_status > 599) THEN
    RAISE EXCEPTION 'Invalid HTTP status' USING ERRCODE = '22023';
  END IF;

  UPDATE public.webhook_deliveries delivery
  SET
    status = CASE WHEN p_success THEN 'sent' ELSE 'failed' END,
    claim_token = NULL,
    claimed_at = NULL,
    delivered_at = CASE WHEN p_success THEN now() ELSE delivery.delivered_at END,
    next_attempt_at = CASE
      WHEN p_success OR delivery.attempts >= 5 THEN NULL
      WHEN delivery.attempts = 1 THEN now() + interval '1 minute'
      WHEN delivery.attempts = 2 THEN now() + interval '5 minutes'
      WHEN delivery.attempts = 3 THEN now() + interval '15 minutes'
      ELSE now() + interval '1 hour'
    END,
    last_http_status = p_http_status,
    last_error_code = CASE
      WHEN p_success THEN NULL
      ELSE left(
        regexp_replace(
          COALESCE(NULLIF(p_error_code, ''), 'delivery_failed'),
          '[^a-zA-Z0-9_.:-]',
          '_',
          'g'
        ),
        80
      )
    END,
    updated_at = now()
  WHERE delivery.id = p_delivery_id
    AND delivery.status = 'processing'
    AND delivery.claim_token = p_claim_token
  RETURNING
    delivery.event_id,
    delivery.status,
    delivery.attempts,
    delivery.next_attempt_at
  INTO
    v_event_id,
    v_delivery_status,
    v_attempts,
    v_next_attempt;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object(
      'accepted', false,
      'reason', 'claim_not_current'
    );
  END IF;

  SELECT event.status
  INTO v_event_status
  FROM public.webhook_events event
  WHERE event.id = v_event_id;

  RETURN jsonb_build_object(
    'accepted', true,
    'event_id', v_event_id,
    'delivery_status', v_delivery_status,
    'event_status', v_event_status,
    'attempts', v_attempts,
    'retry_scheduled', v_next_attempt IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_webhook_event_delivery_status(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_webhook_deliveries(
  uuid, uuid, uuid, boolean, integer
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_webhook_delivery(
  uuid, uuid, boolean, integer, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_webhook_event_delivery_status(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_webhook_deliveries(
  uuid, uuid, uuid, boolean, integer
) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_webhook_delivery(
  uuid, uuid, boolean, integer, text
) TO service_role;

-- Retire uncallable or cross-tenant legacy queue mutators. The Edge processor is
-- now the sole delivery path; manual/test UI paths invoke it with a scoped JWT.
DROP FUNCTION IF EXISTS public.process_webhook_queue();
DROP FUNCTION IF EXISTS public.process_booking_webhook_events();
DROP FUNCTION IF EXISTS public.resend_all_booking_webhooks(uuid);
DROP FUNCTION IF EXISTS public.link_existing_bookings_to_whatsapp();
