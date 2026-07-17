-- R26: claiming a Stripe event by inserting its id is not enough. A concurrent
-- delivery must distinguish completed work from in-flight work, failures must
-- remain retryable, and only the worker holding the current lease token may
-- complete the event.

ALTER TABLE public.processed_stripe_events
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error_code text;

UPDATE public.processed_stripe_events
SET status = 'completed',
    completed_at = COALESCE(completed_at, processed_at),
    attempt_count = GREATEST(attempt_count, 1)
WHERE status IS NULL;

ALTER TABLE public.processed_stripe_events
  ALTER COLUMN status SET DEFAULT 'completed',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.processed_stripe_events
  DROP CONSTRAINT IF EXISTS processed_stripe_events_status_check;

ALTER TABLE public.processed_stripe_events
  ADD CONSTRAINT processed_stripe_events_status_check
  CHECK (status IN ('processing', 'completed', 'failed'));

CREATE OR REPLACE FUNCTION public.claim_stripe_event(
  p_event_id text,
  p_event_type text,
  p_lease_seconds integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_event public.processed_stripe_events%ROWTYPE;
  v_token uuid := gen_random_uuid();
  v_lease_seconds integer := LEAST(GREATEST(p_lease_seconds, 30), 900);
BEGIN
  IF p_event_id IS NULL OR btrim(p_event_id) = ''
     OR p_event_type IS NULL OR btrim(p_event_type) = '' THEN
    RAISE EXCEPTION 'STRIPE_EVENT_ID_AND_TYPE_REQUIRED'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.processed_stripe_events (
    event_id,
    event_type,
    status,
    claim_token,
    claimed_at,
    completed_at,
    processed_at,
    attempt_count,
    last_error_code
  )
  VALUES (
    p_event_id,
    p_event_type,
    'processing',
    v_token,
    now(),
    NULL,
    NULL,
    1,
    NULL
  )
  ON CONFLICT (event_id) DO NOTHING;

  SELECT *
  INTO v_event
  FROM public.processed_stripe_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF v_event.event_type IS DISTINCT FROM p_event_type THEN
    RAISE EXCEPTION 'STRIPE_EVENT_TYPE_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  IF v_event.status = 'completed' THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'completed', true,
      'reason', 'already_completed'
    );
  END IF;

  IF v_event.status = 'processing'
     AND v_event.claim_token IS DISTINCT FROM v_token
     AND v_event.claimed_at > now() - make_interval(secs => v_lease_seconds) THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'completed', false,
      'reason', 'in_progress'
    );
  END IF;

  IF v_event.claim_token IS DISTINCT FROM v_token THEN
    v_token := gen_random_uuid();
    UPDATE public.processed_stripe_events
    SET status = 'processing',
        claim_token = v_token,
        claimed_at = now(),
        completed_at = NULL,
        processed_at = NULL,
        attempt_count = attempt_count + 1,
        last_error_code = NULL
    WHERE event_id = p_event_id
    RETURNING * INTO v_event;
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'completed', false,
    'claim_token', v_token,
    'attempt_count', v_event.attempt_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_stripe_event(
  p_event_id text,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.processed_stripe_events
  SET status = 'completed',
      processed_at = now(),
      completed_at = now(),
      claim_token = NULL,
      claimed_at = NULL,
      last_error_code = NULL
  WHERE event_id = p_event_id
    AND status = 'processing'
    AND claim_token = p_claim_token
  RETURNING true;
$function$;

CREATE OR REPLACE FUNCTION public.fail_stripe_event(
  p_event_id text,
  p_claim_token uuid,
  p_error_code text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.processed_stripe_events
  SET status = 'failed',
      claim_token = NULL,
      claimed_at = NULL,
      last_error_code = left(COALESCE(NULLIF(btrim(p_error_code), ''), 'processing_failed'), 80)
  WHERE event_id = p_event_id
    AND status = 'processing'
    AND claim_token = p_claim_token
  RETURNING true;
$function$;

REVOKE ALL ON FUNCTION public.claim_stripe_event(text, text, integer)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_stripe_event(text, uuid)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_stripe_event(text, uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_event(text, text, integer)
TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_event(text, uuid)
TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_stripe_event(text, uuid, text)
TO service_role;

COMMENT ON FUNCTION public.claim_stripe_event(text, text, integer) IS
  'R26 service-only atomic Stripe event lease. Completed duplicates return success; active leases return in_progress and must receive a non-2xx HTTP response.';
