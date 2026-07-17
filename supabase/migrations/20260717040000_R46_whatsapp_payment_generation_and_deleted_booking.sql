-- R46: make WhatsApp Checkout ownership generation-safe, reconcile the real
-- provider status before replay/renewal, and fail closed for soft-deleted bookings.

ALTER TABLE public.whatsapp_payment_attempts
  ADD COLUMN IF NOT EXISTS attempt_generation integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS provider_ownership_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_payment_status text,
  ADD COLUMN IF NOT EXISTS provider_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_stripe_session_id text;

ALTER TABLE public.whatsapp_payment_attempts
  DROP CONSTRAINT IF EXISTS whatsapp_payment_attempt_generation_positive,
  ADD CONSTRAINT whatsapp_payment_attempt_generation_positive
    CHECK (attempt_generation > 0) NOT VALID,
  DROP CONSTRAINT IF EXISTS whatsapp_payment_attempt_ownership_version_check,
  ADD CONSTRAINT whatsapp_payment_attempt_ownership_version_check
    CHECK (provider_ownership_version IN (1, 2)) NOT VALID,
  DROP CONSTRAINT IF EXISTS whatsapp_payment_attempt_provider_status_check,
  ADD CONSTRAINT whatsapp_payment_attempt_provider_status_check
    CHECK (
      provider_status IS NULL
      OR provider_status IN ('open', 'complete', 'expired')
    ) NOT VALID,
  DROP CONSTRAINT IF EXISTS whatsapp_payment_attempt_provider_payment_status_check,
  ADD CONSTRAINT whatsapp_payment_attempt_provider_payment_status_check
    CHECK (
      provider_payment_status IS NULL
      OR provider_payment_status IN ('paid', 'unpaid', 'no_payment_required')
    ) NOT VALID;

ALTER TABLE public.whatsapp_payment_attempts
  VALIDATE CONSTRAINT whatsapp_payment_attempt_generation_positive,
  VALIDATE CONSTRAINT whatsapp_payment_attempt_ownership_version_check,
  VALIDATE CONSTRAINT whatsapp_payment_attempt_provider_status_check,
  VALIDATE CONSTRAINT whatsapp_payment_attempt_provider_payment_status_check;

ALTER TABLE public.whatsapp_payment_sessions
  ADD COLUMN IF NOT EXISTS attempt_generation integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS request_fingerprint text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS provider_payment_status text,
  ADD COLUMN IF NOT EXISTS provider_reconciled_at timestamptz;

UPDATE public.whatsapp_payment_sessions AS session
SET
  attempt_generation = attempt.attempt_generation,
  request_fingerprint = attempt.request_fingerprint
FROM public.whatsapp_payment_attempts AS attempt
WHERE attempt.payment_session_id = session.id;

ALTER TABLE public.whatsapp_payment_sessions
  DROP CONSTRAINT IF EXISTS whatsapp_payment_session_attempt_generation_positive,
  ADD CONSTRAINT whatsapp_payment_session_attempt_generation_positive
    CHECK (attempt_generation > 0) NOT VALID,
  DROP CONSTRAINT IF EXISTS whatsapp_payment_session_request_fingerprint_check,
  ADD CONSTRAINT whatsapp_payment_session_request_fingerprint_check
    CHECK (
      request_fingerprint IS NULL
      OR request_fingerprint ~ '^[0-9a-f]{64}$'
    ) NOT VALID,
  DROP CONSTRAINT IF EXISTS whatsapp_payment_session_provider_status_check,
  ADD CONSTRAINT whatsapp_payment_session_provider_status_check
    CHECK (
      provider_status IS NULL
      OR provider_status IN ('open', 'complete', 'expired')
    ) NOT VALID,
  DROP CONSTRAINT IF EXISTS whatsapp_payment_session_provider_payment_status_check,
  ADD CONSTRAINT whatsapp_payment_session_provider_payment_status_check
    CHECK (
      provider_payment_status IS NULL
      OR provider_payment_status IN ('paid', 'unpaid', 'no_payment_required')
    ) NOT VALID;

ALTER TABLE public.whatsapp_payment_sessions
  VALIDATE CONSTRAINT whatsapp_payment_session_attempt_generation_positive,
  VALIDATE CONSTRAINT whatsapp_payment_session_request_fingerprint_check,
  VALIDATE CONSTRAINT whatsapp_payment_session_provider_status_check,
  VALIDATE CONSTRAINT whatsapp_payment_session_provider_payment_status_check;

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

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WHATSAPP_PAYMENT_ATTEMPT_BOOKING_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE(v_booking.is_deleted, false) THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_DELETED'
    );
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
    sum(GREATEST(
      payment.amount_cents - COALESCE(payment.refund_amount_cents, 0),
      0
    )),
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
         OR v_session.attempt_generation IS DISTINCT FROM v_attempt.attempt_generation
         OR (
           v_attempt.provider_ownership_version >= 2
           AND v_session.request_fingerprint IS DISTINCT FROM p_request_fingerprint
         ) THEN
        RETURN jsonb_build_object(
          'outcome', 'conflict',
          'code', 'WHATSAPP_PAYMENT_STORED_REPLAY_CONFLICT'
        );
      END IF;

      IF v_session.payment_status NOT IN ('pending', 'processing') THEN
        RETURN jsonb_build_object(
          'outcome', 'blocked',
          'code', 'WHATSAPP_PAYMENT_SESSION_NOT_RENEWABLE'
        );
      END IF;

      RETURN jsonb_build_object(
        'outcome', 'reconcile',
        'payment_session_id', v_session.id,
        'stripe_session_id', v_session.stripe_session_id,
        'payment_url', v_session.payment_url,
        'created_at', v_session.created_at,
        'amount_cents', v_session.amount_cents,
        'payment_status', v_session.payment_status,
        'request_fingerprint', v_attempt.request_fingerprint,
        'attempt_generation', v_attempt.attempt_generation,
        'provider_ownership_version', v_attempt.provider_ownership_version
      );
    END IF;

    IF v_attempt.claim_expires_at > v_now THEN
      RETURN jsonb_build_object(
        'outcome', 'in_progress',
        'code', 'WHATSAPP_PAYMENT_ATTEMPT_IN_PROGRESS'
      );
    END IF;

    IF v_attempt.attempt_generation >= 2147483647 THEN
      RAISE EXCEPTION 'WHATSAPP_PAYMENT_ATTEMPT_GENERATION_EXHAUSTED'
        USING ERRCODE = '54000';
    END IF;

    UPDATE public.whatsapp_payment_attempts
    SET
      attempt_generation = attempt_generation + 1,
      provider_ownership_version = 2,
      claim_token = v_claim_token,
      claim_expires_at = v_now + make_interval(secs => p_claim_ttl_seconds),
      expires_at = p_expires_at,
      provider_status = NULL,
      provider_payment_status = NULL,
      provider_expires_at = NULL,
      provider_reconciled_at = NULL,
      updated_at = v_now
    WHERE booking_id = p_booking_id
    RETURNING * INTO v_attempt;

    RETURN jsonb_build_object(
      'outcome', 'claimed',
      'claim_token', v_claim_token,
      'request_fingerprint', p_request_fingerprint,
      'attempt_generation', v_attempt.attempt_generation
    );
  END IF;

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
    attempt_generation,
    provider_ownership_version,
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
    1,
    2,
    v_claim_token,
    v_now + make_interval(secs => p_claim_ttl_seconds),
    p_expires_at
  )
  RETURNING * INTO v_attempt;

  RETURN jsonb_build_object(
    'outcome', 'claimed',
    'claim_token', v_claim_token,
    'request_fingerprint', p_request_fingerprint,
    'attempt_generation', v_attempt.attempt_generation
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_whatsapp_payment_attempt(
  p_booking_id uuid,
  p_claim_token uuid,
  p_attempt_generation integer,
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
  v_cleanup text := 'preserve';
BEGIN
  IF p_booking_id IS NULL
     OR p_claim_token IS NULL
     OR p_attempt_generation IS NULL
     OR p_attempt_generation <= 0
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

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_BOOKING_DISAPPEARED',
      'provider_cleanup', 'expire'
    );
  END IF;

  IF COALESCE(v_booking.is_deleted, false) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_DELETED',
      'provider_cleanup', 'expire'
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
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_MISSING',
      'provider_cleanup', 'expire'
    );
  END IF;

  IF v_attempt.request_fingerprint <> p_request_fingerprint THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_FINGERPRINT_CONFLICT',
      'provider_cleanup', 'preserve'
    );
  END IF;

  IF v_attempt.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_MODE_CONFLICT',
      'provider_cleanup', 'preserve'
    );
  END IF;

  IF v_attempt.attempt_generation <> p_attempt_generation THEN
    v_cleanup := CASE
      WHEN v_attempt.stripe_session_id IS NOT DISTINCT FROM p_stripe_session_id
        THEN 'preserve'
      ELSE 'expire'
    END;
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_GENERATION_SUPERSEDED',
      'provider_cleanup', v_cleanup
    );
  END IF;

  IF v_attempt.state = 'completed' THEN
    SELECT session.*
    INTO v_session
    FROM public.whatsapp_payment_sessions AS session
    WHERE session.id = v_attempt.payment_session_id
      AND session.booking_id = p_booking_id
    FOR UPDATE;

    IF FOUND
       AND v_attempt.stripe_session_id IS NOT DISTINCT FROM p_stripe_session_id
       AND v_attempt.payment_url IS NOT DISTINCT FROM p_payment_url
       AND v_session.stripe_session_id IS NOT DISTINCT FROM p_stripe_session_id
       AND v_session.payment_url IS NOT DISTINCT FROM p_payment_url
       AND v_session.stripe_mode IS NOT DISTINCT FROM p_stripe_mode
       AND v_session.attempt_generation IS NOT DISTINCT FROM p_attempt_generation
       AND v_session.request_fingerprint IS NOT DISTINCT FROM p_request_fingerprint
       AND v_session.payment_status IN ('pending', 'processing') THEN
      RETURN jsonb_build_object(
        'outcome', 'replay',
        'payment_session_id', v_session.id,
        'stripe_session_id', v_session.stripe_session_id,
        'payment_url', v_session.payment_url,
        'created_at', v_session.created_at,
        'amount_cents', v_session.amount_cents,
        'payment_status', v_session.payment_status,
        'attempt_generation', v_attempt.attempt_generation
      );
    END IF;

    v_cleanup := CASE
      WHEN v_attempt.stripe_session_id IS NOT DISTINCT FROM p_stripe_session_id
        THEN 'preserve'
      ELSE 'expire'
    END;
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_FINALIZE_REPLAY_CONFLICT',
      'provider_cleanup', v_cleanup
    );
  END IF;

  IF v_booking.status IN ('cancelled', 'completed', 'no-show')
     OR COALESCE(v_booking.payment_status, 'none') IN (
       'paid', 'partial', 'partially_refunded', 'refund_required', 'refunded'
     )
     OR v_retained_balance_cents > 0 THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_STATE_CHANGED_AFTER_CLAIM',
      'provider_cleanup', 'expire'
    );
  END IF;

  IF v_attempt.claim_token <> p_claim_token THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_CLAIM_LOST',
      'provider_cleanup', 'preserve'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_payment_sessions AS owner_session
    WHERE owner_session.stripe_session_id = p_stripe_session_id
      AND owner_session.id IS DISTINCT FROM v_attempt.payment_session_id
  ) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_PROVIDER_SESSION_ALREADY_OWNED',
      'provider_cleanup', 'preserve'
    );
  END IF;

  IF v_attempt.payment_session_id IS NOT NULL THEN
    IF v_attempt.previous_stripe_session_id IS NOT DISTINCT FROM
       p_stripe_session_id THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'WHATSAPP_PAYMENT_RENEWAL_PROVIDER_SESSION_REUSED',
        'provider_cleanup', 'preserve'
      );
    END IF;

    SELECT session.*
    INTO v_session
    FROM public.whatsapp_payment_sessions AS session
    WHERE session.id = v_attempt.payment_session_id
      AND session.booking_id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND
       OR NULLIF(trim(v_attempt.previous_stripe_session_id), '') IS NULL
       OR v_session.stripe_session_id IS DISTINCT FROM
         v_attempt.previous_stripe_session_id
       OR v_session.payment_status NOT IN ('pending', 'processing', 'failed') THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'WHATSAPP_PAYMENT_RENEWAL_LEDGER_CONFLICT',
        'provider_cleanup', 'expire'
      );
    END IF;

    UPDATE public.whatsapp_payment_sessions
    SET
      stripe_session_id = p_stripe_session_id,
      payment_url = p_payment_url,
      payment_status = 'pending',
      expires_at = v_attempt.expires_at,
      attempt_generation = p_attempt_generation,
      request_fingerprint = p_request_fingerprint,
      provider_status = 'open',
      provider_payment_status = 'unpaid',
      provider_reconciled_at = NULL,
      updated_at = v_now
    WHERE id = v_session.id
    RETURNING * INTO v_session;
  ELSE
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
      expires_at,
      attempt_generation,
      request_fingerprint,
      provider_status,
      provider_payment_status
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
      v_attempt.expires_at,
      p_attempt_generation,
      p_request_fingerprint,
      'open',
      'unpaid'
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
         OR v_session.attempt_generation IS DISTINCT FROM p_attempt_generation
         OR v_session.request_fingerprint IS DISTINCT FROM p_request_fingerprint
         OR v_session.payment_status NOT IN ('pending', 'processing') THEN
        v_cleanup := CASE
          WHEN v_session.stripe_session_id IS NOT DISTINCT FROM p_stripe_session_id
            THEN 'preserve'
          ELSE 'expire'
        END;
        RETURN jsonb_build_object(
          'outcome', 'conflict',
          'code', 'WHATSAPP_PAYMENT_SESSION_LEDGER_CONFLICT',
          'provider_cleanup', v_cleanup
        );
      END IF;
    END IF;
  END IF;

  UPDATE public.whatsapp_payment_attempts
  SET
    state = 'completed',
    payment_session_id = v_session.id,
    stripe_session_id = v_session.stripe_session_id,
    payment_url = v_session.payment_url,
    provider_ownership_version = 2,
    provider_status = 'open',
    provider_payment_status = 'unpaid',
    provider_expires_at = v_session.expires_at,
    provider_reconciled_at = NULL,
    updated_at = v_now
  WHERE booking_id = p_booking_id
    AND claim_token = p_claim_token
    AND attempt_generation = p_attempt_generation
    AND request_fingerprint = p_request_fingerprint
    AND state = 'claimed';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_FINALIZE_CAS_FAILED',
      'provider_cleanup', 'preserve'
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'created',
    'payment_session_id', v_session.id,
    'stripe_session_id', v_session.stripe_session_id,
    'payment_url', v_session.payment_url,
    'created_at', v_session.created_at,
    'amount_cents', v_session.amount_cents,
    'payment_status', v_session.payment_status,
    'attempt_generation', p_attempt_generation
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.reconcile_or_renew_whatsapp_payment_attempt(
  p_booking_id uuid,
  p_attempt_generation integer,
  p_request_fingerprint text,
  p_stripe_mode text,
  p_stripe_session_id text,
  p_provider_status text,
  p_provider_payment_status text,
  p_provider_expires_at timestamptz,
  p_payment_url text,
  p_new_expires_at timestamptz,
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
BEGIN
  IF p_booking_id IS NULL
     OR p_attempt_generation IS NULL
     OR p_attempt_generation <= 0
     OR p_request_fingerprint IS NULL
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_stripe_mode IS NULL
     OR p_stripe_mode NOT IN ('test', 'live')
     OR NULLIF(trim(p_stripe_session_id), '') IS NULL
     OR p_provider_status IS NULL
     OR p_provider_status NOT IN ('open', 'complete', 'expired')
     OR p_provider_payment_status IS NULL
     OR p_provider_payment_status NOT IN (
       'paid', 'unpaid', 'no_payment_required'
     )
     OR p_provider_expires_at IS NULL
     OR p_new_expires_at IS NULL
     OR p_new_expires_at <= v_now
     OR p_claim_ttl_seconds IS NULL
     OR p_claim_ttl_seconds < 30
     OR p_claim_ttl_seconds > 600
     OR (
       p_provider_status = 'open'
       AND (p_payment_url IS NULL OR p_payment_url !~ '^https://')
     ) THEN
    RAISE EXCEPTION 'WHATSAPP_PAYMENT_RECONCILE_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'WHATSAPP_PAYMENT_BOOKING_DISAPPEARED'
    );
  END IF;

  IF COALESCE(v_booking.is_deleted, false) THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_DELETED'
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

  IF NOT FOUND
     OR v_attempt.state <> 'completed'
     OR v_attempt.attempt_generation <> p_attempt_generation
     OR v_attempt.request_fingerprint <> p_request_fingerprint
     OR v_attempt.stripe_mode IS DISTINCT FROM p_stripe_mode
     OR v_attempt.stripe_session_id IS DISTINCT FROM p_stripe_session_id THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_PROVIDER_RECONCILIATION_CONFLICT'
    );
  END IF;

  SELECT session.*
  INTO v_session
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.id = v_attempt.payment_session_id
    AND session.booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_session.stripe_session_id IS DISTINCT FROM p_stripe_session_id
     OR v_session.stripe_mode IS DISTINCT FROM p_stripe_mode
     OR v_session.attempt_generation IS DISTINCT FROM p_attempt_generation
     OR (
       v_attempt.provider_ownership_version >= 2
       AND v_session.request_fingerprint IS DISTINCT FROM p_request_fingerprint
     ) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_PROVIDER_OWNERSHIP_CONFLICT'
    );
  END IF;

  UPDATE public.whatsapp_payment_attempts
  SET
    provider_status = p_provider_status,
    provider_payment_status = p_provider_payment_status,
    provider_expires_at = p_provider_expires_at,
    provider_reconciled_at = v_now,
    updated_at = v_now
  WHERE booking_id = p_booking_id;

  UPDATE public.whatsapp_payment_sessions
  SET
    provider_status = p_provider_status,
    provider_payment_status = p_provider_payment_status,
    provider_reconciled_at = v_now,
    updated_at = v_now
  WHERE id = v_session.id;

  IF p_provider_status = 'complete'
     OR p_provider_payment_status IN ('paid', 'no_payment_required') THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'WHATSAPP_PAYMENT_PROVIDER_COMPLETION_PENDING'
    );
  END IF;

  IF v_session.payment_status NOT IN ('pending', 'processing') THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'WHATSAPP_PAYMENT_SESSION_NOT_RENEWABLE'
    );
  END IF;

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
      'retained_balance_cents', v_retained_balance_cents
    );
  END IF;

  IF p_provider_status = 'open'
     AND p_provider_payment_status = 'unpaid'
     AND p_provider_expires_at > v_now THEN
    UPDATE public.whatsapp_payment_attempts
    SET
      payment_url = p_payment_url,
      expires_at = p_provider_expires_at,
      updated_at = v_now
    WHERE booking_id = p_booking_id;

    UPDATE public.whatsapp_payment_sessions
    SET
      payment_url = p_payment_url,
      expires_at = p_provider_expires_at,
      updated_at = v_now
    WHERE id = v_session.id
    RETURNING * INTO v_session;

    RETURN jsonb_build_object(
      'outcome', 'replay',
      'payment_session_id', v_session.id,
      'stripe_session_id', v_session.stripe_session_id,
      'payment_url', v_session.payment_url,
      'created_at', v_session.created_at,
      'amount_cents', v_session.amount_cents,
      'payment_status', v_session.payment_status,
      'attempt_generation', p_attempt_generation
    );
  END IF;

  IF p_provider_status = 'expired'
     AND p_provider_payment_status = 'unpaid' THEN
    IF v_attempt.attempt_generation >= 2147483647 THEN
      RAISE EXCEPTION 'WHATSAPP_PAYMENT_ATTEMPT_GENERATION_EXHAUSTED'
        USING ERRCODE = '54000';
    END IF;

    UPDATE public.whatsapp_payment_attempts
    SET
      state = 'claimed',
      attempt_generation = attempt_generation + 1,
      provider_ownership_version = 2,
      claim_token = v_claim_token,
      claim_expires_at = v_now + make_interval(secs => p_claim_ttl_seconds),
      previous_stripe_session_id = p_stripe_session_id,
      stripe_session_id = NULL,
      payment_url = NULL,
      expires_at = p_new_expires_at,
      updated_at = v_now
    WHERE booking_id = p_booking_id
      AND state = 'completed'
      AND attempt_generation = p_attempt_generation
    RETURNING * INTO v_attempt;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'WHATSAPP_PAYMENT_RENEWAL_CAS_FAILED'
      );
    END IF;

    RETURN jsonb_build_object(
      'outcome', 'claimed',
      'claim_token', v_claim_token,
      'request_fingerprint', p_request_fingerprint,
      'attempt_generation', v_attempt.attempt_generation
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'conflict',
    'code', 'WHATSAPP_PAYMENT_PROVIDER_STATUS_CONFLICT'
  );
END;
$function$;

-- Compatibility wrapper for callers pinned to the R39 signature. It can resolve
-- only the current claim token; stale/unknown tokens never receive cleanup authority.
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
  v_generation integer;
  v_state text;
  v_result jsonb;
BEGIN
  SELECT attempt.attempt_generation, attempt.state
  INTO v_generation, v_state
  FROM public.whatsapp_payment_attempts AS attempt
  WHERE attempt.booking_id = p_booking_id
    AND attempt.claim_token = p_claim_token
    AND attempt.request_fingerprint = p_request_fingerprint
    AND attempt.stripe_mode = p_stripe_mode;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'WHATSAPP_PAYMENT_ATTEMPT_CLAIM_LOST',
      'provider_cleanup', 'preserve'
    );
  END IF;

  v_result := public.finalize_whatsapp_payment_attempt(
    p_booking_id,
    p_claim_token,
    v_generation,
    p_request_fingerprint,
    p_stripe_mode,
    p_stripe_session_id,
    p_payment_url
  );

  -- The old caller does not stamp generation/fingerprint metadata at Stripe.
  -- Preserve a truthful legacy ownership version only for a newly created row;
  -- an exact replay of a v2 row must never be downgraded.
  IF v_state = 'claimed' AND v_result->>'outcome' = 'created' THEN
    UPDATE public.whatsapp_payment_attempts
    SET provider_ownership_version = 1
    WHERE booking_id = p_booking_id
      AND attempt_generation = v_generation
      AND stripe_session_id = p_stripe_session_id;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_payment_attempt(
  uuid, uuid, uuid, uuid, integer, text, text, text, jsonb, text, timestamptz, integer
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_payment_attempt(
  uuid, uuid, uuid, uuid, integer, text, text, text, jsonb, text, timestamptz, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_whatsapp_payment_attempt(
  uuid, uuid, integer, text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_whatsapp_payment_attempt(
  uuid, uuid, integer, text, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_whatsapp_payment_attempt(
  uuid, uuid, text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_whatsapp_payment_attempt(
  uuid, uuid, text, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.reconcile_or_renew_whatsapp_payment_attempt(
  uuid, integer, text, text, text, text, text, timestamptz, text, timestamptz, integer
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_or_renew_whatsapp_payment_attempt(
  uuid, integer, text, text, text, text, text, timestamptz, text, timestamptz, integer
) TO service_role;

COMMENT ON COLUMN public.whatsapp_payment_attempts.attempt_generation IS
  'R46 monotonic provider-ownership generation; every generation has a distinct Stripe idempotency key.';
COMMENT ON COLUMN public.whatsapp_payment_attempts.provider_ownership_version IS
  '1 for pre-R46 provider metadata, 2 when generation and request fingerprint are stamped at Stripe.';
COMMENT ON FUNCTION public.reconcile_or_renew_whatsapp_payment_attempt(
  uuid, integer, text, text, text, text, text, timestamptz, text, timestamptz, integer
) IS
  'R46 atomically replays an owned open Checkout session, renews only provider-confirmed expired/unpaid sessions, and blocks completed payment reconciliation.';
