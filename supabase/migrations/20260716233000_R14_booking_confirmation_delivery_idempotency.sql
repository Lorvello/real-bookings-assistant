-- R14: durable, single-send booking confirmation delivery.
--
-- Stripe can deliver both checkout.session.completed and
-- payment_intent.succeeded for one payment. The old mail endpoint had no claim or
-- delivery ledger, so both events (or a public direct call) could send duplicates.

CREATE TABLE IF NOT EXISTS public.booking_confirmation_deliveries (
  booking_id uuid PRIMARY KEY
    REFERENCES public.bookings(id) ON DELETE CASCADE,
  status text NOT NULL
    CHECK (status IN ('sending', 'delivered', 'skipped', 'failed')),
  claim_token uuid,
  attempt_count integer NOT NULL DEFAULT 0
    CHECK (attempt_count >= 0),
  claimed_at timestamptz,
  delivered_at timestamptz,
  provider_message_id text,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_confirmation_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_confirmation_deliveries FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.booking_confirmation_deliveries
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.booking_confirmation_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.claim_booking_confirmation_delivery(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_claim_token uuid := gen_random_uuid();
  v_status text;
  v_attempt_count integer;
BEGIN
  INSERT INTO public.booking_confirmation_deliveries (
    booking_id,
    status,
    claim_token,
    attempt_count,
    claimed_at,
    updated_at
  )
  VALUES (
    p_booking_id,
    'sending',
    v_claim_token,
    1,
    now(),
    now()
  )
  ON CONFLICT (booking_id) DO UPDATE
  SET
    status = 'sending',
    claim_token = v_claim_token,
    attempt_count =
      public.booking_confirmation_deliveries.attempt_count + 1,
    claimed_at = now(),
    delivered_at = NULL,
    provider_message_id = NULL,
    last_error_code = NULL,
    updated_at = now()
  WHERE public.booking_confirmation_deliveries.status = 'failed'
  RETURNING status, attempt_count
  INTO v_status, v_attempt_count;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'claimed', true,
      'claim_token', v_claim_token,
      'status', v_status,
      'attempt_count', v_attempt_count
    );
  END IF;

  SELECT status, attempt_count
  INTO v_status, v_attempt_count
  FROM public.booking_confirmation_deliveries
  WHERE booking_id = p_booking_id;

  RETURN jsonb_build_object(
    'claimed', false,
    'status', COALESCE(v_status, 'missing'),
    'attempt_count', COALESCE(v_attempt_count, 0)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_booking_confirmation_delivery(
  p_booking_id uuid,
  p_claim_token uuid,
  p_status text,
  p_provider_message_id text DEFAULT NULL,
  p_error_code text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_updated integer;
BEGIN
  IF p_status NOT IN ('delivered', 'skipped', 'failed') THEN
    RAISE EXCEPTION 'invalid booking confirmation delivery status';
  END IF;

  UPDATE public.booking_confirmation_deliveries
  SET
    status = p_status,
    claim_token = NULL,
    delivered_at = CASE
      WHEN p_status = 'delivered' THEN now()
      ELSE NULL
    END,
    provider_message_id = CASE
      WHEN p_status = 'delivered' THEN p_provider_message_id
      ELSE NULL
    END,
    last_error_code = CASE
      WHEN p_status = 'failed' THEN left(p_error_code, 120)
      ELSE NULL
    END,
    updated_at = now()
  WHERE booking_id = p_booking_id
    AND status = 'sending'
    AND claim_token = p_claim_token;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_booking_confirmation_delivery(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_confirmation_delivery(uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.finalize_booking_confirmation_delivery(
  uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_booking_confirmation_delivery(
  uuid, uuid, text, text, text
) TO service_role;

COMMENT ON TABLE public.booking_confirmation_deliveries IS
  'Durable single-send claim and outcome ledger for booking confirmation email.';
