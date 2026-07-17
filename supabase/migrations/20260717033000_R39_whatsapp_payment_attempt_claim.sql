-- R39: claim one durable local WhatsApp booking-payment attempt before Stripe
-- Checkout creation. The claim serializes by booking, rejects refund/retained-money
-- states, and permits only an exact replay of the locally stored provider session.

CREATE TABLE public.whatsapp_payment_attempts (
  booking_id uuid PRIMARY KEY
    REFERENCES public.bookings(id) ON DELETE RESTRICT,
  conversation_id uuid NOT NULL
    REFERENCES public.whatsapp_conversations(id) ON DELETE RESTRICT,
  service_type_id uuid NOT NULL
    REFERENCES public.service_types(id) ON DELETE RESTRICT,
  calendar_id uuid NOT NULL
    REFERENCES public.calendars(id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  payment_type text NOT NULL CHECK (payment_type IN ('full', 'installment')),
  installment_plan jsonb,
  request_fingerprint text NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'claimed'
    CHECK (state IN ('claimed', 'completed')),
  claim_token uuid NOT NULL,
  claim_expires_at timestamptz NOT NULL,
  payment_session_id uuid UNIQUE
    REFERENCES public.whatsapp_payment_sessions(id) ON DELETE RESTRICT,
  stripe_session_id text UNIQUE,
  payment_url text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_payment_attempt_completed_shape CHECK (
    state <> 'completed'
    OR (
      payment_session_id IS NOT NULL
      AND NULLIF(trim(stripe_session_id), '') IS NOT NULL
      AND payment_url ~ '^https://'
    )
  )
);

CREATE INDEX whatsapp_payment_attempts_conversation_id_idx
  ON public.whatsapp_payment_attempts (conversation_id);
CREATE INDEX whatsapp_payment_attempts_service_type_id_idx
  ON public.whatsapp_payment_attempts (service_type_id);
CREATE INDEX whatsapp_payment_attempts_calendar_id_idx
  ON public.whatsapp_payment_attempts (calendar_id);

ALTER TABLE public.whatsapp_payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_payment_attempts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_payment_attempts
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_whatsapp_payment_attempt(
  p_booking_id uuid,
  p_conversation_id uuid,
  p_service_type_id uuid,
  p_calendar_id uuid,
  p_amount_cents integer,
  p_currency text,
  p_stripe_mode text,
  p_payment_type text,
  p_installment_plan jsonb,
  p_request_fingerprint text,
  p_expires_at timestamptz,
  p_claim_ttl_seconds integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_booking public.bookings%ROWTYPE;
  v_attempt public.whatsapp_payment_attempts%ROWTYPE;
  v_session public.whatsapp_payment_sessions%ROWTYPE;
  v_claim_token uuid := gen_random_uuid();
  v_retained_balance_cents bigint := 0;
  v_currency text := lower(trim(COALESCE(p_currency, '')));
BEGIN
  IF p_booking_id IS NULL
     OR p_conversation_id IS NULL
     OR p_service_type_id IS NULL
     OR p_calendar_id IS NULL
     OR p_amount_cents IS NULL
     OR p_amount_cents <= 0
     OR v_currency !~ '^[a-z]{3}$'
     OR p_stripe_mode IS NULL
     OR p_stripe_mode NOT IN ('test', 'live')
     OR p_payment_type IS NULL
     OR p_payment_type NOT IN ('full', 'installment')
     OR p_request_fingerprint IS NULL
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_expires_at IS NULL
     OR p_expires_at <= v_now
     OR p_claim_ttl_seconds IS NULL
     OR p_claim_ttl_seconds < 30
     OR p_claim_ttl_seconds > 600 THEN
    RAISE EXCEPTION 'WHATSAPP_PAYMENT_ATTEMPT_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  -- Match R34 lock order: booking first, then every canonical payment row.
  -- The transaction ends before the Edge Function performs any provider request.
  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WHATSAPP_PAYMENT_ATTEMPT_BOOKING_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.calendar_id IS DISTINCT FROM p_calendar_id
     OR v_booking.service_type_id IS DISTINCT FROM p_service_type_id
     OR NOT EXISTS (
       SELECT 1
       FROM public.whatsapp_conversations AS conversation
       WHERE conversation.id = p_conversation_id
         AND conversation.calendar_id = p_calendar_id
     ) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_IDENTITY_CONFLICT'
    );
  END IF;

  PERFORM payment.id
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id
  FOR UPDATE;

  SELECT COALESCE(
    sum(
      GREATEST(
        payment.amount_cents - COALESCE(payment.refund_amount_cents, 0),
        0
      )
    ),
    0
  )::bigint
  INTO v_retained_balance_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  IF v_booking.status IN ('cancelled', 'completed', 'no-show') THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_NOT_PAYABLE',
      'retained_balance_cents', v_retained_balance_cents
    );
  END IF;

  IF COALESCE(v_booking.payment_status, 'none') IN (
       'paid', 'partial', 'partially_refunded', 'refund_required', 'refunded'
     )
     OR v_retained_balance_cents > 0 THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_PAYMENT_BALANCE_ALREADY_RETAINED',
      'booking_payment_status', v_booking.payment_status,
      'retained_balance_cents', v_retained_balance_cents
    );
  END IF;

  SELECT attempt.*
  INTO v_attempt
  FROM public.whatsapp_payment_attempts AS attempt
  WHERE attempt.booking_id = p_booking_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_attempt.request_fingerprint <> p_request_fingerprint
       OR v_attempt.conversation_id <> p_conversation_id
       OR v_attempt.service_type_id <> p_service_type_id
       OR v_attempt.calendar_id <> p_calendar_id
       OR v_attempt.amount_cents <> p_amount_cents
       OR v_attempt.currency <> v_currency
       OR v_attempt.stripe_mode <> p_stripe_mode
       OR v_attempt.payment_type <> p_payment_type
       OR v_attempt.installment_plan IS DISTINCT FROM p_installment_plan THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'WHATSAPP_PAYMENT_ATTEMPT_FINGERPRINT_CONFLICT'
      );
    END IF;

    IF v_attempt.state = 'completed' THEN
      SELECT session.*
      INTO v_session
      FROM public.whatsapp_payment_sessions AS session
      WHERE session.id = v_attempt.payment_session_id
        AND session.booking_id = p_booking_id
      FOR UPDATE;

      IF NOT FOUND
         OR v_session.stripe_session_id IS DISTINCT FROM v_attempt.stripe_session_id
         OR v_session.payment_url IS DISTINCT FROM v_attempt.payment_url
         OR v_session.conversation_id IS DISTINCT FROM p_conversation_id
         OR v_session.service_type_id IS DISTINCT FROM p_service_type_id
         OR v_session.calendar_id IS DISTINCT FROM p_calendar_id
         OR v_session.amount_cents IS DISTINCT FROM p_amount_cents
         OR v_session.currency IS DISTINCT FROM v_currency
         OR v_session.stripe_mode IS DISTINCT FROM p_stripe_mode
         OR v_session.payment_type IS DISTINCT FROM p_payment_type
         OR v_session.installment_plan IS DISTINCT FROM p_installment_plan
         OR v_session.expires_at IS DISTINCT FROM v_attempt.expires_at
         OR v_session.payment_status NOT IN ('pending', 'processing')
         OR v_session.expires_at <= v_now THEN
        RETURN jsonb_build_object(
          'outcome', 'conflict',
          'code', 'WHATSAPP_PAYMENT_STORED_REPLAY_CONFLICT'
        );
      END IF;

      RETURN jsonb_build_object(
        'outcome', 'replay',
        'payment_session_id', v_session.id,
        'stripe_session_id', v_session.stripe_session_id,
        'payment_url', v_session.payment_url,
        'created_at', v_session.created_at,
        'amount_cents', v_session.amount_cents,
        'payment_status', v_session.payment_status
      );
    END IF;

    IF v_attempt.claim_expires_at > v_now THEN
      RETURN jsonb_build_object(
        'outcome', 'in_progress',
        'code', 'WHATSAPP_PAYMENT_ATTEMPT_IN_PROGRESS'
      );
    END IF;

    UPDATE public.whatsapp_payment_attempts
    SET
      claim_token = v_claim_token,
      claim_expires_at = v_now + make_interval(secs => p_claim_ttl_seconds),
      updated_at = v_now
    WHERE booking_id = p_booking_id;

    RETURN jsonb_build_object(
      'outcome', 'claimed',
      'claim_token', v_claim_token,
      'request_fingerprint', p_request_fingerprint
    );
  END IF;

  -- A pre-R39 session has no request fingerprint and cannot be proven to be an
  -- exact replay. Fail closed before Stripe rather than guessing from a URL.
  PERFORM session.id
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_UNCLAIMED_LEGACY_SESSION'
    );
  END IF;

  INSERT INTO public.whatsapp_payment_attempts (
    booking_id,
    conversation_id,
    service_type_id,
    calendar_id,
    amount_cents,
    currency,
    stripe_mode,
    payment_type,
    installment_plan,
    request_fingerprint,
    claim_token,
    claim_expires_at,
    expires_at
  )
  VALUES (
    p_booking_id,
    p_conversation_id,
    p_service_type_id,
    p_calendar_id,
    p_amount_cents,
    v_currency,
    p_stripe_mode,
    p_payment_type,
    p_installment_plan,
    p_request_fingerprint,
    v_claim_token,
    v_now + make_interval(secs => p_claim_ttl_seconds),
    p_expires_at
  );

  RETURN jsonb_build_object(
    'outcome', 'claimed',
    'claim_token', v_claim_token,
    'request_fingerprint', p_request_fingerprint
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_whatsapp_payment_attempt(
  p_booking_id uuid,
  p_claim_token uuid,
  p_request_fingerprint text,
  p_stripe_mode text,
  p_stripe_session_id text,
  p_payment_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_attempt public.whatsapp_payment_attempts%ROWTYPE;
  v_session public.whatsapp_payment_sessions%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_retained_balance_cents bigint := 0;
BEGIN
  IF p_booking_id IS NULL
     OR p_claim_token IS NULL
     OR p_request_fingerprint IS NULL
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_stripe_mode IS NULL
     OR p_stripe_mode NOT IN ('test', 'live')
     OR NULLIF(trim(p_stripe_session_id), '') IS NULL
     OR p_payment_url IS NULL
     OR p_payment_url !~ '^https://' THEN
    RAISE EXCEPTION 'WHATSAPP_PAYMENT_FINALIZE_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  -- Repeat the claim lock order after Stripe returns. A success/refund/cancel can land
  -- while the provider request is in flight; finalization must observe and stop it.
  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_BOOKING_DISAPPEARED'
    );
  END IF;

  PERFORM payment.id
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id
  FOR UPDATE;

  SELECT COALESCE(sum(GREATEST(
    payment.amount_cents - COALESCE(payment.refund_amount_cents, 0), 0
  )), 0)::bigint
  INTO v_retained_balance_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  SELECT attempt.*
  INTO v_attempt
  FROM public.whatsapp_payment_attempts AS attempt
  WHERE attempt.booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_MISSING'
    );
  END IF;

  IF v_attempt.request_fingerprint <> p_request_fingerprint THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_FINGERPRINT_CONFLICT'
    );
  END IF;

  IF v_attempt.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_MODE_CONFLICT'
    );
  END IF;

  IF v_attempt.state = 'completed' THEN
    SELECT session.*
    INTO v_session
    FROM public.whatsapp_payment_sessions AS session
    WHERE session.id = v_attempt.payment_session_id
      AND session.booking_id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_attempt.stripe_session_id IS DISTINCT FROM p_stripe_session_id
       OR v_attempt.payment_url IS DISTINCT FROM p_payment_url
       OR v_session.stripe_session_id IS DISTINCT FROM p_stripe_session_id
       OR v_session.payment_url IS DISTINCT FROM p_payment_url
       OR v_session.stripe_mode IS DISTINCT FROM p_stripe_mode
       OR v_session.expires_at IS DISTINCT FROM v_attempt.expires_at
       OR v_session.payment_status NOT IN ('pending', 'processing') THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'WHATSAPP_PAYMENT_FINALIZE_REPLAY_CONFLICT'
      );
    END IF;

    RETURN jsonb_build_object(
      'outcome', 'replay',
      'payment_session_id', v_session.id,
      'stripe_session_id', v_session.stripe_session_id,
      'payment_url', v_session.payment_url,
      'created_at', v_session.created_at,
      'amount_cents', v_session.amount_cents,
      'payment_status', v_session.payment_status
    );
  END IF;

  -- A completed attempt can only replay the exact row already stored above. For a
  -- still-claimed attempt, re-check money truth after the provider call so a payment,
  -- refund requirement, or cancellation that landed in flight wins this race.
  IF v_booking.status IN ('cancelled', 'completed', 'no-show')
     OR COALESCE(v_booking.payment_status, 'none') IN (
       'paid', 'partial', 'partially_refunded', 'refund_required', 'refunded'
     )
     OR v_retained_balance_cents > 0 THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_STATE_CHANGED_AFTER_CLAIM'
    );
  END IF;

  IF v_attempt.claim_token <> p_claim_token THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_CLAIM_LOST'
    );
  END IF;

  INSERT INTO public.whatsapp_payment_sessions (
    conversation_id,
    service_type_id,
    calendar_id,
    booking_id,
    stripe_session_id,
    payment_url,
    amount_cents,
    currency,
    stripe_mode,
    payment_type,
    installment_plan,
    payment_status,
    expires_at
  )
  VALUES (
    v_attempt.conversation_id,
    v_attempt.service_type_id,
    v_attempt.calendar_id,
    v_attempt.booking_id,
    p_stripe_session_id,
    p_payment_url,
    v_attempt.amount_cents,
    v_attempt.currency,
    v_attempt.stripe_mode,
    v_attempt.payment_type,
    v_attempt.installment_plan,
    'pending',
    v_attempt.expires_at
  )
  ON CONFLICT DO NOTHING
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    SELECT session.*
    INTO v_session
    FROM public.whatsapp_payment_sessions AS session
    WHERE session.booking_id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_session.stripe_session_id IS DISTINCT FROM p_stripe_session_id
       OR v_session.payment_url IS DISTINCT FROM p_payment_url
       OR v_session.conversation_id IS DISTINCT FROM v_attempt.conversation_id
       OR v_session.service_type_id IS DISTINCT FROM v_attempt.service_type_id
       OR v_session.calendar_id IS DISTINCT FROM v_attempt.calendar_id
       OR v_session.amount_cents IS DISTINCT FROM v_attempt.amount_cents
       OR v_session.currency IS DISTINCT FROM v_attempt.currency
       OR v_session.stripe_mode IS DISTINCT FROM v_attempt.stripe_mode
       OR v_session.payment_type IS DISTINCT FROM v_attempt.payment_type
       OR v_session.installment_plan IS DISTINCT FROM v_attempt.installment_plan
       OR v_session.expires_at IS DISTINCT FROM v_attempt.expires_at
       OR v_session.payment_status NOT IN ('pending', 'processing') THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'WHATSAPP_PAYMENT_SESSION_LEDGER_CONFLICT'
      );
    END IF;
  END IF;

  UPDATE public.whatsapp_payment_attempts
  SET
    state = 'completed',
    payment_session_id = v_session.id,
    stripe_session_id = v_session.stripe_session_id,
    payment_url = v_session.payment_url,
    updated_at = v_now
  WHERE booking_id = p_booking_id
    AND claim_token = p_claim_token
    AND request_fingerprint = p_request_fingerprint
    AND state = 'claimed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WHATSAPP_PAYMENT_ATTEMPT_FINALIZE_CAS_FAILED'
      USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'created',
    'payment_session_id', v_session.id,
    'stripe_session_id', v_session.stripe_session_id,
    'payment_url', v_session.payment_url,
    'created_at', v_session.created_at,
    'amount_cents', v_session.amount_cents,
    'payment_status', v_session.payment_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_payment_attempt(
  uuid, uuid, uuid, uuid, integer, text, text, text, jsonb, text, timestamptz, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_payment_attempt(
  uuid, uuid, uuid, uuid, integer, text, text, text, jsonb, text, timestamptz, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_whatsapp_payment_attempt(
  uuid, uuid, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_whatsapp_payment_attempt(
  uuid, uuid, text, text, text, text
) TO service_role;

COMMENT ON TABLE public.whatsapp_payment_attempts IS
  'R39 private claim ledger: one serialized WhatsApp Checkout creation attempt per booking.';
COMMENT ON FUNCTION public.claim_whatsapp_payment_attempt(
  uuid, uuid, uuid, uuid, integer, text, text, text, jsonb, text, timestamptz, integer
) IS
  'R39 atomically rejects retained/refund states, claims one booking attempt before Stripe create, or returns only an exact stored replay.';
COMMENT ON FUNCTION public.finalize_whatsapp_payment_attempt(
  uuid, uuid, text, text, text, text
) IS
  'R39 atomically persists the claimed Stripe Checkout identity and never substitutes a conflicting provider URL.';
