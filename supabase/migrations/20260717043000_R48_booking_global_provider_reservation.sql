-- R48: one booking-global Stripe provider-creation authority.
--
-- Activation order is intentionally fail closed:
--   1. create/backfill the private ledgers and service-role RPCs;
--   2. deploy provider callers that claim/finalize through these RPCs;
--   3. deploy the cleanup worker disabled;
--   4. enable and canary cleanup only after the TEST provider contract passes.
-- No cron, Edge Function invocation, Stripe call, or production mutation is made here.

BEGIN;

-- Existing unresolved provider objects cannot be guessed into one owner. Stop the
-- migration visibly if the old split authorities already produced a collision.
DO $preflight$
BEGIN
  -- Existing provider objects do not carry R48's generation/fingerprint metadata,
  -- and a migration cannot mutate those Stripe objects safely. Never adopt them
  -- into the new ownership ledger. The operator must reconcile or clean them first.
  IF EXISTS (
    SELECT 1
    FROM public.booking_payments AS payment
    WHERE NULLIF(btrim(payment.stripe_payment_intent_id), '') IS NOT NULL
      AND payment.status NOT IN (
        'canceled', 'cancelled', 'succeeded', 'completed',
        'refunded', 'partially_refunded'
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.whatsapp_payment_sessions AS session
    WHERE session.booking_id IS NOT NULL
      AND NULLIF(btrim(session.stripe_session_id), '') IS NOT NULL
      AND session.payment_status NOT IN (
        'paid', 'completed', 'refunded', 'expired', 'canceled', 'cancelled'
      )
  ) THEN
    RAISE EXCEPTION 'R48_LEGACY_ACTIVE_PROVIDER_OBJECT_REQUIRES_RESOLUTION'
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT candidate.booking_id
    FROM (
      SELECT payment.booking_id
      FROM public.booking_payments AS payment
      WHERE NULLIF(btrim(payment.stripe_payment_intent_id), '') IS NOT NULL
        AND payment.status NOT IN (
          'canceled', 'cancelled', 'succeeded', 'completed',
          'refunded', 'partially_refunded'
        )
      UNION ALL
      SELECT session.booking_id
      FROM public.whatsapp_payment_sessions AS session
      WHERE session.booking_id IS NOT NULL
        AND session.payment_status NOT IN (
          'paid', 'completed', 'refunded', 'expired', 'canceled', 'cancelled'
        )
        AND NULLIF(btrim(session.stripe_session_id), '') IS NOT NULL
    ) AS candidate
    GROUP BY candidate.booking_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'R48_LEGACY_PROVIDER_RESERVATION_CONFLICT'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_payments AS payment
    JOIN public.bookings AS booking ON booking.id = payment.booking_id
    WHERE NULLIF(btrim(payment.stripe_payment_intent_id), '') IS NOT NULL
      AND payment.status NOT IN (
        'canceled', 'cancelled', 'succeeded', 'completed',
        'refunded', 'partially_refunded'
      )
      AND (
        booking.total_amount_cents IS NULL
        OR booking.total_amount_cents <= 0
        OR booking.payment_currency IS NULL
        OR lower(booking.payment_currency) !~ '^[a-z]{3}$'
        OR payment.stripe_mode IS NULL
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.whatsapp_payment_sessions AS session
    JOIN public.bookings AS booking ON booking.id = session.booking_id
    WHERE session.booking_id IS NOT NULL
      AND session.payment_status NOT IN (
        'paid', 'completed', 'refunded', 'expired', 'canceled', 'cancelled'
      )
      AND NULLIF(btrim(session.stripe_session_id), '') IS NOT NULL
      AND (
        booking.total_amount_cents IS NULL
        OR booking.total_amount_cents <= 0
        OR booking.payment_currency IS NULL
        OR lower(booking.payment_currency) !~ '^[a-z]{3}$'
        OR session.stripe_mode IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'R48_LEGACY_PROVIDER_RESERVATION_IDENTITY_INCOMPLETE'
      USING ERRCODE = '23514';
  END IF;
END;
$preflight$;

CREATE TABLE public.booking_payment_provider_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL
    REFERENCES public.bookings(id) ON DELETE RESTRICT,
  generation integer NOT NULL CHECK (generation > 0),
  channel text NOT NULL CHECK (channel IN ('web', 'whatsapp')),
  provider_kind text NOT NULL
    CHECK (provider_kind IN ('payment_intent', 'checkout_session')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  -- The immutable gross ceiling includes any exclusive tax. bookings.total_amount_cents
  -- remains the pre-tax price snapshot, so it is only the lower bound, never the cap.
  total_due_cents integer NOT NULL CHECK (total_due_cents >= amount_cents),
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  destination_account_id text,
  platform_account_id text NOT NULL CHECK (btrim(platform_account_id) <> ''),
  tax_calculation_id text,
  request_fingerprint text NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'claimed'
    CHECK (
      state IN (
        'claimed', 'provider_created', 'completed',
        'cleanup_pending', 'cleaned'
      )
    ),
  claim_token uuid NOT NULL,
  claim_expires_at timestamptz NOT NULL,
  provider_object_id text,
  provider_url text,
  provider_expires_at timestamptz,
  settlement_payment_intent_id text,
  completed_at timestamptz,
  cleaned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT booking_payment_provider_reservation_generation_unique
    UNIQUE (booking_id, generation),
  CONSTRAINT booking_payment_provider_reservation_provider_shape CHECK (
    state = 'claimed'
    OR NULLIF(btrim(provider_object_id), '') IS NOT NULL
  ),
  CONSTRAINT booking_payment_provider_reservation_checkout_url CHECK (
    provider_kind <> 'checkout_session'
    OR state = 'claimed'
    OR provider_url ~ '^https://'
  )
);

CREATE UNIQUE INDEX booking_payment_provider_one_active_per_booking
  ON public.booking_payment_provider_reservations (booking_id)
  WHERE state IN ('claimed', 'provider_created', 'cleanup_pending');

CREATE UNIQUE INDEX booking_payment_provider_object_unique
  ON public.booking_payment_provider_reservations (
    stripe_mode, provider_kind, provider_object_id
  )
  WHERE provider_object_id IS NOT NULL;

CREATE INDEX booking_payment_provider_booking_history_idx
  ON public.booking_payment_provider_reservations (
    booking_id, generation DESC
  );

ALTER TABLE public.booking_payment_provider_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payment_provider_reservations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.booking_payment_provider_reservations
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.booking_payment_provider_cleanup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL
    REFERENCES public.booking_payment_provider_reservations(id)
    ON DELETE RESTRICT,
  booking_id uuid NOT NULL
    REFERENCES public.bookings(id) ON DELETE RESTRICT,
  reservation_generation integer NOT NULL CHECK (reservation_generation > 0),
  provider_kind text NOT NULL
    CHECK (provider_kind IN ('payment_intent', 'checkout_session')),
  provider_object_id text NOT NULL CHECK (btrim(provider_object_id) <> ''),
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  request_fingerprint text NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  reason_code text NOT NULL CHECK (btrim(reason_code) <> ''),
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'claimed', 'completed', 'dead_letter')),
  claim_token uuid,
  claim_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_error_code text,
  provider_result text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT booking_payment_provider_cleanup_identity_unique
    UNIQUE (reservation_id, provider_object_id)
);

CREATE INDEX booking_payment_provider_cleanup_due_idx
  ON public.booking_payment_provider_cleanup_jobs (
    state, next_attempt_at, created_at
  );

CREATE INDEX booking_payment_provider_cleanup_claim_expiry_idx
  ON public.booking_payment_provider_cleanup_jobs (claim_expires_at, created_at, id)
  WHERE state = 'claimed';

ALTER TABLE public.booking_payment_provider_cleanup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payment_provider_cleanup_jobs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.booking_payment_provider_cleanup_jobs
  FROM PUBLIC, anon, authenticated, service_role;

-- Cleanup exhaustion is an operational incident, not just a queue state. Reuse the
-- existing durable monitoring outbox so its configured dispatcher can surface it.
ALTER TABLE public.monitoring_alerts
  DROP CONSTRAINT monitoring_alerts_detected_by_check,
  ADD CONSTRAINT monitoring_alerts_detected_by_check
    CHECK (detected_by IN (
      'in_turn', 'pg_cron', 'mechanism_test', 'cleanup_worker'
    ));

-- Operational alert deduplication happens while provider-ledger rows are locked.
-- Make both identities constant-time and concurrency-safe instead of scanning the
-- growing JSON alert outbox inside a money-path transaction.
CREATE UNIQUE INDEX monitoring_alerts_cleanup_job_dedupe_idx
  ON public.monitoring_alerts ((details ->> 'job_id'))
  WHERE failure_class = 'booking_provider_cleanup_dead_letter'
    AND details ? 'job_id';

CREATE UNIQUE INDEX monitoring_alerts_expired_provider_claim_dedupe_idx
  ON public.monitoring_alerts ((details ->> 'reservation_id'))
  WHERE failure_class = 'booking_provider_claim_expired_on_close'
    AND details ? 'reservation_id';

-- Internal helper. It is intentionally not granted to service_role: only the
-- fenced reservation RPCs and the booking-close trigger may enqueue work.
CREATE OR REPLACE FUNCTION public.enqueue_booking_payment_provider_cleanup(
  p_reservation_id uuid,
  p_reason_code text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
  v_job_id uuid;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_reservation_id IS NULL
     OR NULLIF(btrim(p_reason_code), '') IS NULL THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_CLEANUP_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND
     OR NULLIF(btrim(v_reservation.provider_object_id), '') IS NULL THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_CLEANUP_RESERVATION_INVALID'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.booking_payment_provider_cleanup_jobs (
    reservation_id,
    booking_id,
    reservation_generation,
    provider_kind,
    provider_object_id,
    stripe_mode,
    request_fingerprint,
    reason_code,
    state,
    next_attempt_at
  ) VALUES (
    v_reservation.id,
    v_reservation.booking_id,
    v_reservation.generation,
    v_reservation.provider_kind,
    v_reservation.provider_object_id,
    v_reservation.stripe_mode,
    v_reservation.request_fingerprint,
    p_reason_code,
    'pending',
    v_now
  )
  ON CONFLICT (reservation_id, provider_object_id) DO UPDATE
  SET
    reason_code = EXCLUDED.reason_code,
    next_attempt_at = LEAST(
      public.booking_payment_provider_cleanup_jobs.next_attempt_at,
      EXCLUDED.next_attempt_at
    ),
    updated_at = v_now
  WHERE public.booking_payment_provider_cleanup_jobs.state <> 'completed'
  RETURNING id INTO v_job_id;

  IF v_job_id IS NULL THEN
    SELECT job.id
    INTO v_job_id
    FROM public.booking_payment_provider_cleanup_jobs AS job
    WHERE job.reservation_id = v_reservation.id
      AND job.provider_object_id = v_reservation.provider_object_id;
  END IF;

  RETURN v_job_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_booking_payment_provider_cleanup(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_booking_payment_provider_reservation(
  p_booking_id uuid,
  p_channel text,
  p_provider_kind text,
  p_amount_cents integer,
  p_total_due_cents integer,
  p_currency text,
  p_stripe_mode text,
  p_destination_account_id text,
  p_platform_account_id text,
  p_tax_calculation_id text,
  p_request_fingerprint text,
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
  v_active public.booking_payment_provider_reservations%ROWTYPE;
  v_created public.booking_payment_provider_reservations%ROWTYPE;
  v_claim_token uuid := gen_random_uuid();
  v_generation integer;
  v_currency text := lower(btrim(COALESCE(p_currency, '')));
  v_retained_cents bigint := 0;
  v_remaining_cents bigint;
  v_exact_identity boolean;
  v_prior_total_due_min integer;
  v_prior_total_due_max integer;
  v_prior_destination_min text;
  v_prior_destination_max text;
  v_exact_snapshot_total_due integer;
  v_snapshot_tax_rate numeric;
  v_supply_type text;
  v_canonical_destination text;
BEGIN
  IF p_booking_id IS NULL
     OR p_channel NOT IN ('web', 'whatsapp')
     OR p_provider_kind NOT IN ('payment_intent', 'checkout_session')
     OR (p_channel = 'web' AND p_provider_kind <> 'payment_intent')
     OR (p_channel = 'whatsapp' AND p_provider_kind <> 'checkout_session')
     OR p_amount_cents IS NULL
     OR p_amount_cents <= 0
     OR p_total_due_cents IS NULL
     OR p_total_due_cents < p_amount_cents
     OR v_currency !~ '^[a-z]{3}$'
     OR p_stripe_mode NOT IN ('test', 'live')
     OR NULLIF(btrim(p_destination_account_id), '') IS NULL
     OR NULLIF(btrim(p_platform_account_id), '') IS NULL
     OR (
       p_tax_calculation_id IS NOT NULL
       AND p_tax_calculation_id !~ '^taxcalc_[A-Za-z0-9]+$'
     )
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_claim_ttl_seconds IS NULL
     OR p_claim_ttl_seconds < 30
     OR p_claim_ttl_seconds > 600 THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_RESERVATION_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  -- Global lock order: booking, canonical money rows, active provider row.
  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_NOT_FOUND',
      'booking_disposition', 'cancel_safe',
      'retryable', false
    );
  END IF;

  -- The database, not the first service caller, owns the Connect destination.
  -- Match the same owner + Stripe mode + platform tuple the Edge paths use.
  SELECT account.stripe_account_id
  INTO v_canonical_destination
  FROM public.calendars AS calendar
  LEFT JOIN public.users AS calendar_user
    ON calendar_user.id = calendar.user_id
  JOIN public.business_stripe_accounts AS account
    ON account.account_owner_id = COALESCE(
      calendar_user.account_owner_id,
      calendar.user_id
    )
  WHERE calendar.id = v_booking.calendar_id
    AND account.environment = p_stripe_mode
    AND account.platform_account_id = btrim(p_platform_account_id)
    AND account.charges_enabled
    AND account.onboarding_completed
  ORDER BY account.created_at DESC, account.id DESC
  LIMIT 1;

  IF v_canonical_destination IS NULL
     OR v_canonical_destination <> btrim(p_destination_account_id) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_DESTINATION_NOT_CANONICAL',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  PERFORM payment.id
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id
  FOR UPDATE;

  SELECT COALESCE(sum(GREATEST(
    payment.amount_cents - COALESCE(payment.refund_amount_cents, 0),
    0
  )), 0)::bigint
  INTO v_retained_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  SELECT reservation.*
  INTO v_active
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.booking_id = p_booking_id
    AND reservation.state IN (
      'claimed', 'provider_created', 'cleanup_pending'
    )
  FOR UPDATE;

  IF COALESCE(v_booking.is_deleted, false)
     OR v_booking.status IN ('cancelled', 'completed', 'no-show') THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', CASE
        WHEN COALESCE(v_booking.is_deleted, false) THEN 'BOOKING_DELETED'
        ELSE 'BOOKING_NOT_PAYABLE'
      END,
      'booking_disposition', CASE
        WHEN v_active.id IS NULL THEN 'cancel_safe'
        ELSE 'preserve'
      END,
      'retryable', false
    );
  END IF;

  IF v_booking.total_amount_cents IS NULL
     OR v_booking.total_amount_cents <= 0
     OR v_booking.payment_currency IS NULL
     OR lower(v_booking.payment_currency) !~ '^[a-z]{3}$' THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_CAPTURE_CEILING_MISSING',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  IF lower(v_booking.payment_currency) IS DISTINCT FROM v_currency THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CURRENCY_CONFLICT',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  SELECT
    min(reservation.total_due_cents),
    max(reservation.total_due_cents),
    min(reservation.destination_account_id),
    max(reservation.destination_account_id)
  INTO
    v_prior_total_due_min,
    v_prior_total_due_max,
    v_prior_destination_min,
    v_prior_destination_max
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.booking_id = p_booking_id;

  IF v_prior_total_due_min IS NOT NULL AND (
       v_prior_total_due_min <> v_prior_total_due_max
       OR p_total_due_cents <> v_prior_total_due_min
     ) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_TOTAL_DUE_IMMUTABILITY_CONFLICT',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;
  IF v_prior_destination_min IS NOT NULL AND (
       v_prior_destination_min <> v_prior_destination_max
       OR btrim(p_destination_account_id) <> v_prior_destination_min
     ) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_DESTINATION_IMMUTABILITY_CONFLICT',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  v_supply_type := COALESCE(
    v_booking.public_booking_policy_snapshot #>> '{tax,supply_type}',
    'in_person'
  );

  -- In-person tax is fully derivable from the immutable R45 snapshot.
  IF jsonb_typeof(v_booking.public_booking_policy_snapshot) = 'object'
     AND v_supply_type = 'in_person' THEN
    v_exact_snapshot_total_due := v_booking.total_amount_cents;
    IF COALESCE(
         (v_booking.public_booking_policy_snapshot #>> '{tax,tax_enabled}')::boolean,
         false
       )
       AND COALESCE(
         v_booking.public_booking_policy_snapshot #>> '{tax,tax_behavior}',
         'exclusive'
       ) = 'exclusive'
       AND (v_booking.public_booking_policy_snapshot #>>
         '{tax,applicable_tax_rate}') IS NOT NULL THEN
      v_snapshot_tax_rate := (
        v_booking.public_booking_policy_snapshot #>> '{tax,applicable_tax_rate}'
      )::numeric;
      v_exact_snapshot_total_due := v_booking.total_amount_cents +
        round(v_booking.total_amount_cents::numeric * v_snapshot_tax_rate / 100)::integer;
    END IF;
    IF p_total_due_cents <> v_exact_snapshot_total_due THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'BOOKING_PROVIDER_TOTAL_DUE_SNAPSHOT_CONFLICT',
        'expected_total_due_cents', v_exact_snapshot_total_due,
        'booking_disposition', 'preserve',
        'retryable', false
      );
    END IF;
    IF p_tax_calculation_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'BOOKING_PROVIDER_IN_PERSON_TAX_ATTESTATION_FORBIDDEN',
        'booking_disposition', 'preserve',
        'retryable', false
      );
    END IF;
  ELSIF p_total_due_cents > v_booking.total_amount_cents THEN
    -- Remote/digital tax is external provider output. The database cannot verify
    -- that output at claim time, so neither a service caller nor a caller-supplied
    -- calculation ID may raise the money ceiling. Keep this path fail closed until
    -- a provider-authenticated tax attestation is available.
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_PROVIDER_REMOTE_GROSS_REQUIRES_VERIFIED_PROVIDER_ATTESTATION',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  -- The booking snapshot is the pre-tax floor. A gross charge may be higher only
  -- because exclusive tax was added by the immutable booking policy; that policy
  -- caps the rate at 100%, so two times the floor is a fail-closed absolute bound.
  IF p_total_due_cents < v_booking.total_amount_cents
     OR p_total_due_cents::bigint > v_booking.total_amount_cents::bigint * 2 THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_PROVIDER_TOTAL_DUE_OUT_OF_BOUNDS',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_payments AS payment
    WHERE payment.booking_id = p_booking_id
      AND payment.status IN (
        'succeeded', 'completed', 'partially_refunded', 'refunded'
      )
      AND (
        lower(payment.currency) IS DISTINCT FROM v_currency
        OR payment.stripe_mode IS DISTINCT FROM p_stripe_mode
        OR payment.stripe_account_id IS DISTINCT FROM btrim(p_destination_account_id)
      )
  ) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_CAPTURE_MODE_OR_CURRENCY_CONFLICT',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  v_remaining_cents := p_total_due_cents::bigint - v_retained_cents;
  IF v_remaining_cents <= 0
     OR COALESCE(v_booking.payment_status, 'none') IN (
       'paid', 'partially_refunded', 'refund_required', 'refunded'
     ) THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_CAPTURE_CEILING_REACHED',
      'retained_balance_cents', v_retained_cents,
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  IF p_amount_cents::bigint > v_remaining_cents THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_PROVIDER_AMOUNT_EXCEEDS_REMAINING_BALANCE',
      'retained_balance_cents', v_retained_cents,
      'remaining_balance_cents', v_remaining_cents,
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  IF v_active.id IS NOT NULL THEN
    v_exact_identity :=
      v_active.channel = p_channel
      AND v_active.provider_kind = p_provider_kind
      AND v_active.amount_cents = p_amount_cents
      AND v_active.total_due_cents = p_total_due_cents
      AND v_active.currency = v_currency
      AND v_active.stripe_mode = p_stripe_mode
      AND v_active.destination_account_id = btrim(p_destination_account_id)
      AND v_active.platform_account_id = btrim(p_platform_account_id)
      AND v_active.tax_calculation_id IS NOT DISTINCT FROM p_tax_calculation_id
      AND v_active.request_fingerprint = p_request_fingerprint;

    IF v_active.state = 'cleanup_pending' THEN
      RETURN jsonb_build_object(
        'outcome', 'in_progress',
        'code', 'BOOKING_PROVIDER_CLEANUP_PENDING',
        'booking_disposition', 'preserve',
        'retryable', true
      );
    END IF;

    IF NOT v_exact_identity THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'code', 'BOOKING_PROVIDER_RESERVATION_OWNED_BY_OTHER_PATH',
        'owner_channel', v_active.channel,
        'owner_provider_kind', v_active.provider_kind,
        'booking_disposition', 'preserve',
        'retryable', true
      );
    END IF;

    IF v_active.state = 'provider_created' THEN
      RETURN jsonb_build_object(
        'outcome', 'reconcile',
        'reservation_id', v_active.id,
        'generation', v_active.generation,
        'request_fingerprint', v_active.request_fingerprint,
        'provider_object_id', v_active.provider_object_id,
        'provider_url', v_active.provider_url,
        'provider_expires_at', v_active.provider_expires_at,
        'booking_disposition', 'preserve',
        'retryable', true
      );
    END IF;

    IF v_active.claim_expires_at > v_now THEN
      RETURN jsonb_build_object(
        'outcome', 'in_progress',
        'code', 'BOOKING_PROVIDER_RESERVATION_IN_PROGRESS',
        'reservation_id', v_active.id,
        'generation', v_active.generation,
        'booking_disposition', 'preserve',
        'retryable', true
      );
    END IF;

    UPDATE public.booking_payment_provider_reservations
    SET
      claim_token = v_claim_token,
      claim_expires_at = v_now + make_interval(secs => p_claim_ttl_seconds),
      updated_at = v_now
    WHERE id = v_active.id
      AND state = 'claimed'
      AND claim_expires_at <= v_now
    RETURNING * INTO v_created;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'outcome', 'in_progress',
        'code', 'BOOKING_PROVIDER_RESERVATION_TAKEOVER_LOST',
        'booking_disposition', 'preserve',
        'retryable', true
      );
    END IF;

    RETURN jsonb_build_object(
      'outcome', 'claimed',
      'reservation_id', v_created.id,
      'claim_token', v_created.claim_token,
      'generation', v_created.generation,
      'request_fingerprint', v_created.request_fingerprint,
      'idempotency_key', format(
        'ba:booking:%s:%s:generation:%s',
        v_created.booking_id,
        v_created.provider_kind,
        v_created.generation
      ),
      'fresh_claim', false,
      'booking_disposition', 'preserve',
      'retryable', true
    );
  END IF;

  SELECT COALESCE(max(reservation.generation), 0) + 1
  INTO v_generation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.booking_id = p_booking_id;

  INSERT INTO public.booking_payment_provider_reservations (
    booking_id,
    generation,
    channel,
    provider_kind,
    amount_cents,
    total_due_cents,
    currency,
    stripe_mode,
    destination_account_id,
    platform_account_id,
    tax_calculation_id,
    request_fingerprint,
    state,
    claim_token,
    claim_expires_at
  ) VALUES (
    p_booking_id,
    v_generation,
    p_channel,
    p_provider_kind,
    p_amount_cents,
    p_total_due_cents,
    v_currency,
    p_stripe_mode,
    btrim(p_destination_account_id),
    btrim(p_platform_account_id),
    p_tax_calculation_id,
    p_request_fingerprint,
    'claimed',
    v_claim_token,
    v_now + make_interval(secs => p_claim_ttl_seconds)
  )
  RETURNING * INTO v_created;

  RETURN jsonb_build_object(
    'outcome', 'claimed',
    'reservation_id', v_created.id,
    'claim_token', v_created.claim_token,
    'generation', v_created.generation,
    'request_fingerprint', v_created.request_fingerprint,
    'idempotency_key', format(
      'ba:booking:%s:%s:generation:%s',
      v_created.booking_id,
      v_created.provider_kind,
      v_created.generation
    ),
    'fresh_claim', true,
    'booking_disposition', 'preserve',
    'retryable', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_booking_payment_provider_reservation(
  p_booking_id uuid,
  p_reservation_id uuid,
  p_claim_token uuid,
  p_generation integer,
  p_request_fingerprint text,
  p_stripe_mode text,
  p_provider_object_id text,
  p_provider_url text,
  p_provider_expires_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_booking public.bookings%ROWTYPE;
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
  v_job_id uuid;
BEGIN
  IF p_booking_id IS NULL
     OR p_reservation_id IS NULL
     OR p_claim_token IS NULL
     OR p_generation IS NULL
     OR p_generation <= 0
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_stripe_mode NOT IN ('test', 'live')
     OR NULLIF(btrim(p_provider_object_id), '') IS NULL
     OR (p_provider_url IS NOT NULL AND p_provider_url !~ '^https://') THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_FINALIZE_INPUT_INVALID'
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
      'code', 'BOOKING_PROVIDER_BOOKING_MISSING',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.id = p_reservation_id
    AND reservation.booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_RESERVATION_MISSING',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  IF v_reservation.generation <> p_generation
     OR v_reservation.request_fingerprint <> p_request_fingerprint
     OR v_reservation.stripe_mode <> p_stripe_mode THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_RESERVATION_IDENTITY_CONFLICT',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  IF v_reservation.state IN ('provider_created', 'cleanup_pending')
     AND v_reservation.provider_object_id IS NOT DISTINCT FROM p_provider_object_id
     AND v_reservation.provider_url IS NOT DISTINCT FROM p_provider_url THEN
    RETURN jsonb_build_object(
      'outcome', 'replay',
      'reservation_id', v_reservation.id,
      'generation', v_reservation.generation,
      'provider_object_id', v_reservation.provider_object_id,
      'provider_url', v_reservation.provider_url,
      'state', v_reservation.state,
      'booking_disposition', 'preserve',
      'retryable', true
    );
  END IF;

  -- A stale lease owner cannot publish or expire anything. The current owner retries
  -- the same stable Stripe idempotency key and recovers the one provider object.
  IF v_reservation.state <> 'claimed'
     OR v_reservation.claim_token <> p_claim_token THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_RESERVATION_CLAIM_LOST',
      'booking_disposition', 'preserve',
      'retryable', true
    );
  END IF;

  IF v_reservation.provider_kind = 'checkout_session'
     AND (p_provider_url IS NULL OR p_provider_expires_at IS NULL) THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_CHECKOUT_IDENTITY_INVALID'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.booking_payment_provider_reservations
  SET
    provider_object_id = p_provider_object_id,
    provider_url = p_provider_url,
    provider_expires_at = p_provider_expires_at,
    state = CASE
      WHEN COALESCE(v_booking.is_deleted, false)
        OR v_booking.status IN ('cancelled', 'completed', 'no-show')
      THEN 'cleanup_pending'
      ELSE 'provider_created'
    END,
    updated_at = v_now
  WHERE id = v_reservation.id
    AND state = 'claimed'
    AND claim_token = p_claim_token
  RETURNING * INTO v_reservation;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_RESERVATION_FINALIZE_CAS_LOST',
      'booking_disposition', 'preserve',
      'retryable', true
    );
  END IF;

  IF v_reservation.state = 'cleanup_pending' THEN
    v_job_id := public.enqueue_booking_payment_provider_cleanup(
      v_reservation.id,
      CASE
        WHEN COALESCE(v_booking.is_deleted, false)
          THEN 'BOOKING_DELETED_DURING_PROVIDER_CREATE'
        ELSE 'BOOKING_CLOSED_DURING_PROVIDER_CREATE'
      END
    );
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_CLOSED_DURING_PROVIDER_CREATE',
      'cleanup_job_id', v_job_id,
      'booking_disposition', 'preserve',
      'retryable', true
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'created',
    'reservation_id', v_reservation.id,
    'generation', v_reservation.generation,
    'provider_object_id', v_reservation.provider_object_id,
    'provider_url', v_reservation.provider_url,
    'state', v_reservation.state,
    'booking_disposition', 'preserve',
    'retryable', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.require_booking_payment_provider_cleanup(
  p_booking_id uuid,
  p_reservation_id uuid,
  p_generation integer,
  p_request_fingerprint text,
  p_provider_object_id text,
  p_reason_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
  v_job_id uuid;
BEGIN
  -- R48_REQUIRE_CLEANUP_LOCK_ORDER: every provider-ledger transition locks
  -- booking before reservation. The cleanup insert's booking FK also needs a
  -- key-share lock, so reversing this order can deadlock against settlement.
  PERFORM booking.id
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_BOOKING_MISSING'
    );
  END IF;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.id = p_reservation_id
    AND reservation.booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_reservation.generation <> p_generation
     OR v_reservation.request_fingerprint <> p_request_fingerprint
     OR v_reservation.provider_object_id IS DISTINCT FROM p_provider_object_id
     OR v_reservation.state NOT IN ('provider_created', 'cleanup_pending') THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_OWNERSHIP_CONFLICT'
    );
  END IF;

  UPDATE public.booking_payment_provider_reservations
  SET state = 'cleanup_pending', updated_at = clock_timestamp()
  WHERE id = v_reservation.id;

  v_job_id := public.enqueue_booking_payment_provider_cleanup(
    v_reservation.id,
    p_reason_code
  );

  RETURN jsonb_build_object(
    'outcome', 'queued',
    'cleanup_job_id', v_job_id,
    'booking_disposition', 'preserve',
    'retryable', true
  );
END;
$function$;

-- The provider was independently retrieved as expired+unpaid. That is hard proof
-- the old link is unusable, so a new generation may be claimed without waiting for
-- the cleanup worker. R46's WhatsApp attempt generation advances in the caller next.
CREATE OR REPLACE FUNCTION public.renew_booking_payment_provider_after_expiry(
  p_booking_id uuid,
  p_reservation_id uuid,
  p_generation integer,
  p_request_fingerprint text,
  p_stripe_mode text,
  p_provider_object_id text,
  p_provider_status text,
  p_provider_payment_status text,
  p_claim_ttl_seconds integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_old public.booking_payment_provider_reservations%ROWTYPE;
  v_new public.booking_payment_provider_reservations%ROWTYPE;
  v_token uuid := gen_random_uuid();
BEGIN
  IF p_provider_status <> 'expired'
     OR p_provider_payment_status <> 'unpaid'
     OR p_claim_ttl_seconds NOT BETWEEN 30 AND 600 THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_RENEWAL_PROOF_INVALID'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
    AND COALESCE(booking.is_deleted, false) = false
    AND booking.status NOT IN ('cancelled', 'completed', 'no-show')
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_NOT_PAYABLE',
      'booking_disposition', 'preserve',
      'retryable', false
    );
  END IF;

  SELECT reservation.*
  INTO v_old
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.id = p_reservation_id
    AND reservation.booking_id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_old.generation <> p_generation
     OR v_old.request_fingerprint <> p_request_fingerprint
     OR v_old.stripe_mode <> p_stripe_mode
     OR v_old.provider_kind <> 'checkout_session'
     OR v_old.provider_object_id IS DISTINCT FROM p_provider_object_id
     OR v_old.state <> 'provider_created' THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_RENEWAL_OWNERSHIP_CONFLICT',
      'booking_disposition', 'preserve',
      'retryable', true
    );
  END IF;

  UPDATE public.booking_payment_provider_reservations
  SET state = 'cleaned', cleaned_at = v_now, updated_at = v_now
  WHERE id = v_old.id;

  INSERT INTO public.booking_payment_provider_reservations (
    booking_id,
    generation,
    channel,
    provider_kind,
    amount_cents,
    total_due_cents,
    currency,
    stripe_mode,
    destination_account_id,
    platform_account_id,
    tax_calculation_id,
    request_fingerprint,
    state,
    claim_token,
    claim_expires_at
  ) VALUES (
    v_old.booking_id,
    v_old.generation + 1,
    v_old.channel,
    v_old.provider_kind,
    v_old.amount_cents,
    v_old.total_due_cents,
    v_old.currency,
    v_old.stripe_mode,
    v_old.destination_account_id,
    v_old.platform_account_id,
    v_old.tax_calculation_id,
    v_old.request_fingerprint,
    'claimed',
    v_token,
    v_now + make_interval(secs => p_claim_ttl_seconds)
  )
  RETURNING * INTO v_new;

  RETURN jsonb_build_object(
    'outcome', 'claimed',
    'reservation_id', v_new.id,
    'claim_token', v_new.claim_token,
    'generation', v_new.generation,
    'request_fingerprint', v_new.request_fingerprint,
    'idempotency_key', format(
      'ba:booking:%s:%s:generation:%s',
      v_new.booking_id,
      v_new.provider_kind,
      v_new.generation
    ),
    'fresh_claim', true,
    'booking_disposition', 'preserve',
    'retryable', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.queue_booking_payment_provider_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_reservation record;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF NOT (
    (COALESCE(NEW.is_deleted, false) AND NOT COALESCE(OLD.is_deleted, false))
    OR (
      NEW.status IN ('cancelled', 'no-show')
      AND OLD.status NOT IN ('cancelled', 'no-show')
    )
  ) THEN
    RETURN NEW;
  END IF;

  -- A provider create may have succeeded even when its Edge process has not yet
  -- finalized the reservation. Block only while its bounded lease is live. Once
  -- expired, let the customer close the booking, preserve the reservation for a
  -- late finalizer (which atomically queues cleanup), and raise a durable operator
  -- alert for the crash-without-finalizer case.
  IF EXISTS (
    SELECT 1
    FROM public.booking_payment_provider_reservations AS reservation
    WHERE reservation.booking_id = NEW.id
      AND reservation.state = 'claimed'
      AND reservation.claim_expires_at > v_now
  ) THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_CREATE_IN_PROGRESS'
      USING ERRCODE = '55000';
  END IF;

  INSERT INTO public.monitoring_alerts (
    failure_class,
    details,
    detected_by
  )
  SELECT
    'booking_provider_claim_expired_on_close',
    jsonb_build_object(
      'booking_id', reservation.booking_id,
      'reservation_id', reservation.id,
      'generation', reservation.generation,
      'provider_kind', reservation.provider_kind,
      'stripe_mode', reservation.stripe_mode,
      'request_fingerprint', reservation.request_fingerprint,
      'claim_expires_at', reservation.claim_expires_at,
      'code', 'BOOKING_PROVIDER_CLAIM_EXPIRED_ON_CLOSE'
    ),
    'cleanup_worker'
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.booking_id = NEW.id
    AND reservation.state = 'claimed'
    AND reservation.claim_expires_at <= v_now
  ON CONFLICT DO NOTHING;

  FOR v_reservation IN
    UPDATE public.booking_payment_provider_reservations AS reservation
    SET state = 'cleanup_pending', updated_at = clock_timestamp()
    WHERE reservation.booking_id = NEW.id
      AND reservation.state = 'provider_created'
    RETURNING reservation.id
  LOOP
    PERFORM public.enqueue_booking_payment_provider_cleanup(
      v_reservation.id,
      CASE
        WHEN COALESCE(NEW.is_deleted, false)
          THEN 'BOOKING_SOFT_DELETED'
        ELSE 'BOOKING_CANCELLED'
      END
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.queue_booking_payment_provider_on_close()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS queue_booking_payment_provider_on_close
  ON public.bookings;
CREATE TRIGGER queue_booking_payment_provider_on_close
AFTER UPDATE OF status, is_deleted ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.queue_booking_payment_provider_on_close();

CREATE OR REPLACE FUNCTION public.claim_booking_payment_provider_cleanup(
  p_limit integer DEFAULT 10,
  p_lease_seconds integer DEFAULT 120
)
RETURNS TABLE (
  job_id uuid,
  reservation_id uuid,
  booking_id uuid,
  reservation_generation integer,
  provider_kind text,
  provider_object_id text,
  stripe_mode text,
  request_fingerprint text,
  claim_token uuid,
  attempt_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_candidate record;
  v_job public.booking_payment_provider_cleanup_jobs%ROWTYPE;
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
  v_claimed public.booking_payment_provider_cleanup_jobs%ROWTYPE;
  v_emitted integer := 0;
  v_max_attempts constant integer := 5;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50
     OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 30 AND 600 THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_CLEANUP_CLAIM_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  -- R48_EXPLICIT_CLEANUP_LOCK_ORDER: candidate discovery is bounded and lock-free.
  -- Every mutation then locks booking -> reservation -> job in separate statements,
  -- matching settlement/finalize and eliminating planner-dependent join lock order.
  FOR v_candidate IN
    SELECT due.id, due.booking_id, due.reservation_id
    FROM (
      SELECT
        job.id,
        job.booking_id,
        job.reservation_id,
        job.next_attempt_at AS due_at,
        job.created_at
      FROM public.booking_payment_provider_cleanup_jobs AS job
      WHERE job.state = 'pending'
        AND job.next_attempt_at <= v_now
      UNION ALL
      SELECT
        job.id,
        job.booking_id,
        job.reservation_id,
        job.claim_expires_at AS due_at,
        job.created_at
      FROM public.booking_payment_provider_cleanup_jobs AS job
      WHERE job.state = 'claimed'
        AND job.claim_expires_at <= v_now
    ) AS due
    ORDER BY due.due_at, due.created_at, due.id
    LIMIT p_limit * 4
  LOOP
    PERFORM 1
    FROM public.bookings AS booking
    WHERE booking.id = v_candidate.booking_id
    FOR UPDATE;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT reservation.*
    INTO v_reservation
    FROM public.booking_payment_provider_reservations AS reservation
    WHERE reservation.id = v_candidate.reservation_id
    FOR UPDATE;
    IF NOT FOUND
       OR v_reservation.state <> 'cleanup_pending'
       OR v_reservation.settlement_payment_intent_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    SELECT job.*
    INTO v_job
    FROM public.booking_payment_provider_cleanup_jobs AS job
    WHERE job.id = v_candidate.id
    FOR UPDATE SKIP LOCKED;
    IF NOT FOUND
       OR NOT (
         (v_job.state = 'pending' AND v_job.next_attempt_at <= v_now)
         OR (v_job.state = 'claimed' AND v_job.claim_expires_at <= v_now)
       ) THEN
      CONTINUE;
    END IF;

    IF v_job.attempt_count >= v_max_attempts THEN
      UPDATE public.booking_payment_provider_cleanup_jobs
      SET
        state = 'dead_letter',
        claim_token = NULL,
        claim_expires_at = NULL,
        last_error_code = 'BOOKING_PROVIDER_CLEANUP_ATTEMPTS_EXHAUSTED',
        provider_result = COALESCE(
          provider_result,
          'human_escalation_required'
        ),
        updated_at = v_now
      WHERE id = v_job.id;

      INSERT INTO public.monitoring_alerts (
        failure_class,
        details,
        detected_by
      ) VALUES (
        'booking_provider_cleanup_dead_letter',
        jsonb_build_object(
          'job_id', v_job.id,
          'booking_id', v_job.booking_id,
          'reservation_id', v_job.reservation_id,
          'provider_kind', v_job.provider_kind,
          'provider_object_id', v_job.provider_object_id,
          'stripe_mode', v_job.stripe_mode,
          'attempt_count', v_job.attempt_count,
          'code', 'BOOKING_PROVIDER_CLEANUP_ATTEMPTS_EXHAUSTED'
        ),
        'cleanup_worker'
      )
      ON CONFLICT DO NOTHING;
      CONTINUE;
    END IF;

    UPDATE public.booking_payment_provider_cleanup_jobs AS job
    SET
      state = 'claimed',
      claim_token = gen_random_uuid(),
      claim_expires_at = v_now + make_interval(secs => p_lease_seconds),
      attempt_count = job.attempt_count + 1,
      updated_at = v_now
    WHERE job.id = v_job.id
    RETURNING job.* INTO v_claimed;

    job_id := v_claimed.id;
    reservation_id := v_claimed.reservation_id;
    booking_id := v_claimed.booking_id;
    reservation_generation := v_claimed.reservation_generation;
    provider_kind := v_claimed.provider_kind;
    provider_object_id := v_claimed.provider_object_id;
    stripe_mode := v_claimed.stripe_mode;
    request_fingerprint := v_claimed.request_fingerprint;
    claim_token := v_claimed.claim_token;
    attempt_count := v_claimed.attempt_count;
    RETURN NEXT;
    v_emitted := v_emitted + 1;
    EXIT WHEN v_emitted >= p_limit;
  END LOOP;
END;
$function$;

-- Just-in-time fence immediately before the worker's Stripe side effect. It uses
-- the same booking -> reservation -> job lock order as settlement and finalize.
CREATE OR REPLACE FUNCTION public.verify_booking_payment_provider_cleanup_claim(
  p_job_id uuid,
  p_claim_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_job public.booking_payment_provider_cleanup_jobs%ROWTYPE;
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
BEGIN
  SELECT job.*
  INTO v_job
  FROM public.booking_payment_provider_cleanup_jobs AS job
  WHERE job.id = p_job_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_JOB_MISSING'
    );
  END IF;

  PERFORM 1
  FROM public.bookings AS booking
  WHERE booking.id = v_job.booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_BOOKING_MISSING'
    );
  END IF;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.id = v_job.reservation_id
  FOR UPDATE;

  SELECT job.*
  INTO v_job
  FROM public.booking_payment_provider_cleanup_jobs AS job
  WHERE job.id = p_job_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_job.state <> 'claimed'
     OR v_job.claim_token <> p_claim_token
     OR v_job.claim_expires_at <= clock_timestamp()
     OR v_reservation.id IS NULL
     OR v_reservation.state <> 'cleanup_pending'
     OR v_reservation.settlement_payment_intent_id IS NOT NULL
     OR v_reservation.booking_id <> v_job.booking_id
     OR v_reservation.generation <> v_job.reservation_generation
     OR v_reservation.provider_object_id <> v_job.provider_object_id THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_SIDE_EFFECT_FENCE_LOST'
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'authorized',
    'job_id', v_job.id,
    'reservation_id', v_reservation.id,
    'provider_object_id', v_reservation.provider_object_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_booking_payment_provider_cleanup(
  p_job_id uuid,
  p_claim_token uuid,
  p_succeeded boolean,
  p_provider_result text,
  p_error_code text,
  p_retry_delay_seconds integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_job public.booking_payment_provider_cleanup_jobs%ROWTYPE;
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
  v_max_attempts constant integer := 5;
BEGIN
  IF p_job_id IS NULL
     OR p_claim_token IS NULL
     OR p_succeeded IS NULL
     OR p_retry_delay_seconds IS NULL
     OR p_retry_delay_seconds NOT BETWEEN 60 AND 86400 THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_CLEANUP_FINALIZE_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT job.*
  INTO v_job
  FROM public.booking_payment_provider_cleanup_jobs AS job
  WHERE job.id = p_job_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_JOB_MISSING'
    );
  END IF;

  PERFORM 1
  FROM public.bookings AS booking
  WHERE booking.id = v_job.booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_BOOKING_MISSING'
    );
  END IF;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.id = v_job.reservation_id
  FOR UPDATE;

  SELECT job.*
  INTO v_job
  FROM public.booking_payment_provider_cleanup_jobs AS job
  WHERE job.id = p_job_id
  FOR UPDATE;

  IF v_job.state = 'completed' THEN
    RETURN jsonb_build_object(
      'outcome', 'replay',
      'provider_result', v_job.provider_result
    );
  END IF;

  IF v_job.state <> 'claimed' OR v_job.claim_token <> p_claim_token THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_CLAIM_LOST'
    );
  END IF;

  IF NOT FOUND
     OR v_reservation.booking_id <> v_job.booking_id
     OR v_reservation.generation <> v_job.reservation_generation
     OR v_reservation.provider_kind <> v_job.provider_kind
     OR v_reservation.provider_object_id <> v_job.provider_object_id
     OR v_reservation.stripe_mode <> v_job.stripe_mode
     OR v_reservation.request_fingerprint <> v_job.request_fingerprint
     OR v_reservation.state <> 'cleanup_pending'
     OR v_reservation.settlement_payment_intent_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_OWNERSHIP_CONFLICT'
    );
  END IF;

  IF p_succeeded THEN
    UPDATE public.booking_payment_provider_cleanup_jobs
    SET
      state = 'completed',
      provider_result = NULLIF(btrim(p_provider_result), ''),
      last_error_code = NULL,
      completed_at = v_now,
      updated_at = v_now
    WHERE id = v_job.id;

    UPDATE public.booking_payment_provider_reservations
    SET
      state = 'cleaned',
      cleaned_at = v_now,
      updated_at = v_now
    WHERE id = v_reservation.id
      AND state = 'cleanup_pending';

    -- Provider cleanup owns the matching local status transition. Request paths
    -- only enqueue work and therefore cannot claim cancellation before Stripe has
    -- actually reached a terminal non-payable state.
    IF v_job.provider_kind = 'payment_intent' THEN
      UPDATE public.booking_payments AS payment
      SET status = 'canceled', updated_at = v_now
      WHERE payment.booking_id = v_job.booking_id
        AND payment.stripe_payment_intent_id = v_job.provider_object_id
        AND payment.status = 'pending';
    ELSE
      UPDATE public.whatsapp_payment_sessions AS session
      SET payment_status = 'expired', updated_at = v_now
      WHERE session.booking_id = v_job.booking_id
        AND session.stripe_session_id = v_job.provider_object_id
        AND session.payment_status IN ('pending', 'processing');
    END IF;

    RETURN jsonb_build_object(
      'outcome', 'completed',
      'provider_result', NULLIF(btrim(p_provider_result), '')
    );
  END IF;

  IF p_error_code IN (
       'PROVIDER_ALREADY_COMPLETED', 'PROVIDER_ALREADY_CAPTURED'
     ) OR v_job.attempt_count >= v_max_attempts THEN
    UPDATE public.booking_payment_provider_cleanup_jobs
    SET
      state = 'dead_letter',
      claim_token = NULL,
      claim_expires_at = NULL,
      last_error_code = CASE
        WHEN v_job.attempt_count >= v_max_attempts
          THEN 'BOOKING_PROVIDER_CLEANUP_ATTEMPTS_EXHAUSTED'
        ELSE p_error_code
      END,
      provider_result = CASE
        WHEN v_job.attempt_count >= v_max_attempts
          THEN concat(
            'last_failure:',
            COALESCE(NULLIF(btrim(p_error_code), ''), 'unknown')
          )
        ELSE provider_result
      END,
      updated_at = v_now
    WHERE id = v_job.id;

    INSERT INTO public.monitoring_alerts (
      failure_class,
      details,
      detected_by
    ) VALUES (
      'booking_provider_cleanup_dead_letter',
      jsonb_build_object(
        'job_id', v_job.id,
        'booking_id', v_job.booking_id,
        'reservation_id', v_job.reservation_id,
        'provider_kind', v_job.provider_kind,
        'provider_object_id', v_job.provider_object_id,
        'stripe_mode', v_job.stripe_mode,
        'attempt_count', v_job.attempt_count,
        'code', CASE
          WHEN v_job.attempt_count >= v_max_attempts
            THEN 'BOOKING_PROVIDER_CLEANUP_ATTEMPTS_EXHAUSTED'
          ELSE p_error_code
        END
      ),
      'cleanup_worker'
    )
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
      'outcome', 'dead_letter',
      'code', CASE
        WHEN v_job.attempt_count >= v_max_attempts
          THEN 'BOOKING_PROVIDER_CLEANUP_ATTEMPTS_EXHAUSTED'
        ELSE p_error_code
      END,
      'human_action_required', true
    );
  END IF;

  UPDATE public.booking_payment_provider_cleanup_jobs
  SET
    state = 'pending',
    claim_token = NULL,
    claim_expires_at = NULL,
    last_error_code = COALESCE(
      NULLIF(btrim(p_error_code), ''),
      'BOOKING_PROVIDER_CLEANUP_RETRY'
    ),
    next_attempt_at = v_now + make_interval(secs => p_retry_delay_seconds),
    updated_at = v_now
  WHERE id = v_job.id;

  RETURN jsonb_build_object(
    'outcome', 'retry_scheduled',
    'next_attempt_at', v_now + make_interval(secs => p_retry_delay_seconds)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_booking_payment_provider_reservation(
  p_booking_id uuid,
  p_channel text,
  p_provider_kind text,
  p_amount_cents integer,
  p_total_due_cents integer,
  p_currency text,
  p_stripe_mode text,
  p_destination_account_id text,
  p_platform_account_id text,
  p_tax_calculation_id text,
  p_request_fingerprint text,
  p_provider_object_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
BEGIN
  PERFORM 1
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_PROVIDER_VERIFY_BOOKING_MISSING'
    );
  END IF;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.booking_id = p_booking_id
    AND reservation.channel = p_channel
    AND reservation.provider_kind = p_provider_kind
    AND reservation.amount_cents = p_amount_cents
    AND reservation.total_due_cents = p_total_due_cents
    AND reservation.currency = lower(btrim(p_currency))
    AND reservation.stripe_mode = p_stripe_mode
    AND reservation.destination_account_id = btrim(p_destination_account_id)
    AND reservation.platform_account_id = btrim(p_platform_account_id)
    AND reservation.tax_calculation_id IS NOT DISTINCT FROM p_tax_calculation_id
    AND reservation.request_fingerprint = p_request_fingerprint
    AND reservation.provider_object_id = p_provider_object_id
  ORDER BY reservation.generation DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_VERIFY_IDENTITY_CONFLICT'
    );
  END IF;
  IF v_reservation.state = 'cleanup_pending' THEN
    RETURN jsonb_build_object(
      'outcome', 'in_progress',
      'code', 'BOOKING_PROVIDER_CLEANUP_PENDING'
    );
  END IF;
  IF v_reservation.state NOT IN ('provider_created', 'completed') THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_VERIFY_STATE_CONFLICT'
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'verified',
    'reservation_id', v_reservation.id,
    'generation', v_reservation.generation,
    'request_fingerprint', v_reservation.request_fingerprint,
    'provider_object_id', v_reservation.provider_object_id
  );
END;
$function$;

-- A signed Stripe Checkout async-payment failure is terminal for that completed,
-- unpaid Session. Release only the exact R48 generation so a fresh payment link can
-- be created; no provider mutation or guessed state is involved.
CREATE OR REPLACE FUNCTION public.release_booking_payment_provider_after_failure(
  p_booking_id uuid,
  p_provider_kind text,
  p_provider_object_id text,
  p_generation integer,
  p_request_fingerprint text,
  p_stripe_mode text,
  p_failure_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_booking_id IS NULL
     OR p_provider_kind <> 'checkout_session'
     OR NULLIF(btrim(p_provider_object_id), '') IS NULL
     OR p_generation IS NULL OR p_generation <= 0
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_stripe_mode NOT IN ('test', 'live')
     OR NULLIF(btrim(p_failure_code), '') IS NULL THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_FAILURE_RELEASE_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_FAILURE_BOOKING_MISSING'
    );
  END IF;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.booking_id = p_booking_id
    AND reservation.provider_kind = p_provider_kind
    AND reservation.provider_object_id = btrim(p_provider_object_id)
    AND reservation.generation = p_generation
    AND reservation.request_fingerprint = p_request_fingerprint
    AND reservation.stripe_mode = p_stripe_mode
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_FAILURE_IDENTITY_CONFLICT'
    );
  END IF;
  IF v_reservation.state = 'cleaned' THEN
    RETURN jsonb_build_object(
      'outcome', 'replay',
      'reservation_id', v_reservation.id
    );
  END IF;
  IF v_reservation.state NOT IN ('provider_created', 'cleanup_pending')
     OR v_reservation.settlement_payment_intent_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_FAILURE_STATE_CONFLICT'
    );
  END IF;

  UPDATE public.booking_payment_provider_cleanup_jobs
  SET
    state = 'completed',
    claim_token = NULL,
    claim_expires_at = NULL,
    provider_result = concat('provider_failure:', btrim(p_failure_code)),
    last_error_code = NULL,
    completed_at = v_now,
    updated_at = v_now
  WHERE reservation_id = v_reservation.id
    AND state IN ('pending', 'claimed');

  UPDATE public.booking_payment_provider_reservations
  SET
    state = 'cleaned',
    cleaned_at = v_now,
    updated_at = v_now
  WHERE id = v_reservation.id;

  RETURN jsonb_build_object(
    'outcome', 'released',
    'reservation_id', v_reservation.id,
    'failure_code', btrim(p_failure_code)
  );
END;
$function$;

-- Bind the provider generation to the exact PaymentIntent before any captured
-- money is accepted into the booking state machine. Checkout owns a Session at
-- creation time, so this is also where its later PaymentIntent identity becomes
-- durable. The generation+fingerprint metadata prevents an unrelated PI carrying
-- only a booking_id from attaching itself to the active Checkout reservation.
CREATE OR REPLACE FUNCTION public.authorize_booking_payment_provider_settlement(
  p_booking_id uuid,
  p_provider_kind text,
  p_provider_object_id text,
  p_generation integer,
  p_request_fingerprint text,
  p_payment_intent_id text,
  p_amount_cents integer,
  p_currency text,
  p_stripe_mode text,
  p_destination_account_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
  v_cleanup_job public.booking_payment_provider_cleanup_jobs%ROWTYPE;
  v_currency text := lower(btrim(COALESCE(p_currency, '')));
  v_retained_other_cents bigint := 0;
BEGIN
  IF p_booking_id IS NULL
     OR p_provider_kind NOT IN ('payment_intent', 'checkout_session')
     OR (p_provider_kind = 'payment_intent'
         AND NULLIF(btrim(p_provider_object_id), '') IS NULL)
     OR (p_provider_kind = 'payment_intent'
         AND p_payment_intent_id IS DISTINCT FROM p_provider_object_id)
     OR p_generation IS NULL OR p_generation <= 0
     OR p_request_fingerprint !~ '^[0-9a-f]{64}$'
     OR NULLIF(btrim(p_payment_intent_id), '') IS NULL
     OR p_amount_cents IS NULL OR p_amount_cents <= 0
     OR v_currency !~ '^[a-z]{3}$'
     OR p_stripe_mode NOT IN ('test', 'live')
     OR NULLIF(btrim(p_destination_account_id), '') IS NULL THEN
    RAISE EXCEPTION 'BOOKING_PROVIDER_SETTLEMENT_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  PERFORM booking.id
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_PROVIDER_SETTLEMENT_BOOKING_MISSING'
    );
  END IF;

  PERFORM payment.id
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id
  FOR UPDATE;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.booking_id = p_booking_id
    AND reservation.generation = p_generation
    AND reservation.request_fingerprint = p_request_fingerprint
    AND reservation.provider_kind = p_provider_kind
    AND (
      p_provider_kind = 'checkout_session'
      OR reservation.provider_object_id = p_provider_object_id
    )
    AND (
      p_provider_object_id IS NULL
      OR reservation.provider_object_id = p_provider_object_id
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_SETTLEMENT_RESERVATION_MISSING'
    );
  END IF;

  IF v_reservation.state NOT IN (
       'provider_created', 'cleanup_pending', 'completed'
     )
     OR v_reservation.amount_cents <> p_amount_cents
     OR v_reservation.currency <> v_currency
     OR v_reservation.stripe_mode <> p_stripe_mode
     OR (
       v_reservation.destination_account_id IS NOT NULL
       AND v_reservation.destination_account_id <> btrim(p_destination_account_id)
     )
     OR (
       v_reservation.settlement_payment_intent_id IS NOT NULL
       AND v_reservation.settlement_payment_intent_id <> p_payment_intent_id
     ) THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_SETTLEMENT_IDENTITY_CONFLICT'
    );
  END IF;

  -- A Checkout settlement without its Session ID is accepted only as an exact
  -- replay after checkout.session.completed already bound this PI. If the PI
  -- event arrives first it remains retryable until that exact Session proof lands.
  IF p_provider_kind = 'checkout_session'
     AND NULLIF(btrim(p_provider_object_id), '') IS NULL
     AND v_reservation.settlement_payment_intent_id IS DISTINCT FROM
       p_payment_intent_id THEN
    RETURN jsonb_build_object(
      'outcome', 'in_progress',
      'code', 'BOOKING_PROVIDER_CHECKOUT_SESSION_PROOF_PENDING'
    );
  END IF;

  -- R48_EXPLICIT_CLEANUP_LOCK_ORDER: booking and reservation are already locked;
  -- lock the cleanup job last, matching cleanup verification/finalization.
  SELECT job.*
  INTO v_cleanup_job
  FROM public.booking_payment_provider_cleanup_jobs AS job
  WHERE job.reservation_id = v_reservation.id
    AND job.state <> 'completed'
  ORDER BY job.created_at DESC, job.id DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND v_cleanup_job.state = 'claimed' THEN
    RETURN jsonb_build_object(
      'outcome', 'in_progress',
      'code', 'BOOKING_PROVIDER_CLEANUP_SIDE_EFFECT_IN_PROGRESS'
    );
  END IF;
  IF v_reservation.state = 'cleanup_pending' AND v_cleanup_job.id IS NULL THEN
    RETURN jsonb_build_object(
      'outcome', 'conflict',
      'code', 'BOOKING_PROVIDER_CLEANUP_JOB_MISSING'
    );
  END IF;

  SELECT COALESCE(sum(GREATEST(
    payment.amount_cents - COALESCE(payment.refund_amount_cents, 0), 0
  )), 0)::bigint
  INTO v_retained_other_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id <> p_payment_intent_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  IF v_retained_other_cents + p_amount_cents::bigint >
     v_reservation.total_due_cents::bigint THEN
    RETURN jsonb_build_object(
      'outcome', 'blocked',
      'code', 'BOOKING_PROVIDER_SETTLEMENT_CEILING_EXCEEDED',
      'capture_ceiling_cents', v_reservation.total_due_cents,
      'retained_other_cents', v_retained_other_cents
    );
  END IF;

  -- BOOKING_PROVIDER_SETTLEMENT_CLEANUP_SUPERSEDED: move cleanup_pending back to
  -- provider_created in the same transaction that binds the PaymentIntent and
  -- completes the pending cleanup job. A crash before final settlement can then
  -- replay authorization without encountering a missing cleanup job.
  UPDATE public.booking_payment_provider_reservations
  SET
    settlement_payment_intent_id = p_payment_intent_id,
    state = CASE
      WHEN state = 'cleanup_pending' THEN 'provider_created'
      ELSE state
    END,
    destination_account_id = COALESCE(
      destination_account_id,
      btrim(p_destination_account_id)
    ),
    updated_at = clock_timestamp()
  WHERE id = v_reservation.id;

  UPDATE public.booking_payment_provider_cleanup_jobs
  SET
    state = 'completed',
    provider_result = 'superseded_by_capture',
    completed_at = clock_timestamp(),
    updated_at = clock_timestamp()
  WHERE id = v_cleanup_job.id
    AND state = 'pending';

  RETURN jsonb_build_object(
    'outcome', CASE
      WHEN v_reservation.settlement_payment_intent_id = p_payment_intent_id
        THEN 'replay'
      ELSE 'authorized'
    END,
    'reservation_id', v_reservation.id,
    'generation', v_reservation.generation,
    'capture_ceiling_cents', v_reservation.total_due_cents
  );
END;
$function$;

-- R48 replaces the mode-aware success wrapper so every new captured row is
-- checked under the booking lock before the older atomic settlement core runs.
CREATE OR REPLACE FUNCTION public.finalize_booking_payment_success_v2(
  p_booking_id uuid,
  p_stripe_payment_intent_id text,
  p_payment_kind text,
  p_paid_at timestamptz,
  p_stripe_mode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_payment public.booking_payments%ROWTYPE;
  v_reservation public.booking_payment_provider_reservations%ROWTYPE;
  v_retained_other_cents bigint := 0;
  v_current_retained_cents bigint := 0;
  v_capture_ceiling_cents bigint;
  v_result jsonb;
BEGIN
  IF p_booking_id IS NULL
     OR NULLIF(btrim(p_stripe_payment_intent_id), '') IS NULL
     OR p_paid_at IS NULL
     OR p_stripe_mode NOT IN ('test', 'live') THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_BOOKING_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM payment.id
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id
  FOR UPDATE;

  SELECT payment.*
  INTO v_payment
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id = p_stripe_payment_intent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_LEDGER_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.total_amount_cents IS NULL
     OR v_booking.total_amount_cents <= 0 THEN
    RAISE EXCEPTION 'PAYMENT_CAPTURE_CEILING_MISSING'
      USING ERRCODE = '23514';
  END IF;

  IF v_booking.payment_currency IS NULL
     OR lower(v_booking.payment_currency) IS DISTINCT FROM lower(v_payment.currency) THEN
    RAISE EXCEPTION 'PAYMENT_CAPTURE_CURRENCY_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  IF v_payment.stripe_mode IS NOT NULL
     AND v_payment.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_MODE_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_payments AS payment
    WHERE payment.booking_id = p_booking_id
      AND payment.status IN (
        'succeeded', 'completed', 'partially_refunded', 'refunded'
      )
      AND (
        lower(payment.currency) IS DISTINCT FROM lower(v_payment.currency)
        OR payment.stripe_mode IS DISTINCT FROM p_stripe_mode
      )
  ) THEN
    RAISE EXCEPTION 'PAYMENT_CAPTURE_MODE_OR_CURRENCY_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  SELECT reservation.*
  INTO v_reservation
  FROM public.booking_payment_provider_reservations AS reservation
  WHERE reservation.booking_id = p_booking_id
    AND (
      (
        reservation.provider_kind = 'payment_intent'
        AND reservation.provider_object_id = p_stripe_payment_intent_id
      )
      OR reservation.settlement_payment_intent_id = p_stripe_payment_intent_id
    )
  ORDER BY reservation.generation DESC
  LIMIT 1
  FOR UPDATE;

  IF v_reservation.id IS NULL THEN
    IF v_payment.status NOT IN (
         'succeeded', 'completed', 'partially_refunded', 'refunded'
       ) THEN
      RAISE EXCEPTION 'PAYMENT_PROVIDER_RESERVATION_MISSING'
        USING ERRCODE = 'P0002';
    END IF;
  ELSE
    IF v_reservation.state NOT IN (
         'provider_created', 'cleanup_pending', 'completed'
       )
       OR v_reservation.amount_cents <> v_payment.amount_cents
       OR v_reservation.currency <> lower(v_payment.currency)
       OR v_reservation.stripe_mode <> p_stripe_mode
       OR v_reservation.destination_account_id IS DISTINCT FROM
         v_payment.stripe_account_id
       OR v_reservation.settlement_payment_intent_id IS DISTINCT FROM
         p_stripe_payment_intent_id THEN
      RAISE EXCEPTION 'PAYMENT_PROVIDER_RESERVATION_CONFLICT'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF v_reservation.id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.booking_payments AS payment
    WHERE payment.booking_id = p_booking_id
      AND payment.status IN (
        'succeeded', 'completed', 'partially_refunded', 'refunded'
      )
      AND payment.stripe_account_id IS DISTINCT FROM
        v_reservation.destination_account_id
  ) THEN
    RAISE EXCEPTION 'PAYMENT_CAPTURE_DESTINATION_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  -- Existing pre-R48 rows fall back to their booking snapshot. Every R48-created
  -- provider uses its immutable gross ceiling, which correctly includes exclusive tax.
  v_capture_ceiling_cents := COALESCE(
    v_reservation.total_due_cents::bigint,
    v_booking.total_amount_cents::bigint
  );

  SELECT COALESCE(sum(GREATEST(
    payment.amount_cents - COALESCE(payment.refund_amount_cents, 0),
    0
  )), 0)::bigint
  INTO v_retained_other_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id <> p_stripe_payment_intent_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  v_current_retained_cents := GREATEST(
    v_payment.amount_cents - COALESCE(v_payment.refund_amount_cents, 0),
    0
  );

  IF v_retained_other_cents + v_current_retained_cents >
     v_capture_ceiling_cents THEN
    RAISE EXCEPTION 'PAYMENT_CAPTURE_CEILING_EXCEEDED'
      USING
        ERRCODE = '23514',
        DETAIL = format(
          'retained_other=%s,new_capture=%s,ceiling=%s,currency=%s,mode=%s',
          v_retained_other_cents,
          v_current_retained_cents,
          v_capture_ceiling_cents,
          lower(v_payment.currency),
          p_stripe_mode
        );
  END IF;

  UPDATE public.booking_payments
  SET stripe_mode = p_stripe_mode
  WHERE booking_id = p_booking_id
    AND stripe_payment_intent_id = p_stripe_payment_intent_id
    AND stripe_mode IS NULL;

  v_result := public.finalize_booking_payment_success(
    p_booking_id,
    p_stripe_payment_intent_id,
    p_payment_kind,
    p_paid_at
  );

  IF v_reservation.id IS NOT NULL THEN
    UPDATE public.booking_payment_provider_reservations
    SET
      state = 'completed',
      settlement_payment_intent_id = p_stripe_payment_intent_id,
      completed_at = COALESCE(completed_at, p_paid_at),
      updated_at = GREATEST(updated_at, p_paid_at)
    WHERE id = v_reservation.id;

    UPDATE public.booking_payment_provider_cleanup_jobs
    SET
      state = 'completed',
      provider_result = 'superseded_by_capture',
      completed_at = COALESCE(completed_at, p_paid_at),
      updated_at = GREATEST(updated_at, p_paid_at)
    WHERE reservation_id = v_reservation.id
      AND state = 'pending';
  END IF;

  RETURN v_result || jsonb_build_object(
    'captureCeilingCents', v_capture_ceiling_cents,
    'retainedAfterCaptureCents',
      v_retained_other_cents + v_current_retained_cents,
    'reservationId', v_reservation.id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_booking_payment_provider_reservation(
  uuid, text, text, integer, integer, text, text, text, text, text, text, integer
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_booking_payment_provider_reservation(
  uuid, text, text, integer, integer, text, text, text, text, text, text, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_booking_payment_provider_reservation(
  uuid, uuid, uuid, integer, text, text, text, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_booking_payment_provider_reservation(
  uuid, uuid, uuid, integer, text, text, text, text, timestamptz
) TO service_role;

REVOKE ALL ON FUNCTION public.require_booking_payment_provider_cleanup(
  uuid, uuid, integer, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.require_booking_payment_provider_cleanup(
  uuid, uuid, integer, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.renew_booking_payment_provider_after_expiry(
  uuid, uuid, integer, text, text, text, text, text, integer
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.renew_booking_payment_provider_after_expiry(
  uuid, uuid, integer, text, text, text, text, text, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.verify_booking_payment_provider_reservation(
  uuid, text, text, integer, integer, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_booking_payment_provider_reservation(
  uuid, text, text, integer, integer, text, text, text, text, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.release_booking_payment_provider_after_failure(
  uuid, text, text, integer, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_booking_payment_provider_after_failure(
  uuid, text, text, integer, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.authorize_booking_payment_provider_settlement(
  uuid, text, text, integer, text, text, integer, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authorize_booking_payment_provider_settlement(
  uuid, text, text, integer, text, text, integer, text, text, text
) TO service_role;

REVOKE ALL ON FUNCTION public.claim_booking_payment_provider_cleanup(integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_booking_payment_provider_cleanup(integer, integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.verify_booking_payment_provider_cleanup_claim(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_booking_payment_provider_cleanup_claim(uuid, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.finalize_booking_payment_provider_cleanup(
  uuid, uuid, boolean, text, text, integer
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_booking_payment_provider_cleanup(
  uuid, uuid, boolean, text, text, integer
) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_booking_payment_success_v2(
  uuid, text, text, timestamptz, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_booking_payment_success_v2(
  uuid, text, text, timestamptz, text
) TO service_role;

COMMENT ON TABLE public.booking_payment_provider_reservations IS
  'R48 private append-only provider-generation ledger. One active row per booking serializes web PaymentIntent and WhatsApp Checkout creation under the booking lock.';
COMMENT ON TABLE public.booking_payment_provider_cleanup_jobs IS
  'R48 durable provider cleanup queue with retry state, claim leases, and ownership-fenced completion.';
COMMENT ON FUNCTION public.claim_booking_payment_provider_reservation(
  uuid, text, text, integer, integer, text, text, text, text, text, text, integer
) IS
  'R48 service-role-only booking-global claim. Exact retries reuse one stable idempotency generation; cross-channel contenders preserve the booking and create no provider object.';
COMMENT ON FUNCTION public.finalize_booking_payment_success_v2(
  uuid, text, text, timestamptz, text
) IS
  'R48 booking-lock settlement gate. New reservations use an immutable gross total_due_cents ceiling (including exclusive tax); retained captures must also share currency and Stripe mode.';
COMMENT ON FUNCTION public.claim_booking_payment_provider_cleanup(integer, integer) IS
  'R48 service-role-only SKIP LOCKED cleanup claim with bounded batch and lease.';
COMMENT ON FUNCTION public.finalize_booking_payment_provider_cleanup(
  uuid, uuid, boolean, text, text, integer
) IS
  'R48 cleanup completion is accepted only from the current job claim token and exact reservation/provider generation; retries are bounded and exhaustion writes a durable monitoring alert.';

COMMIT;
