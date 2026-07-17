-- R38: Stripe webhook environment isolation and monotonic money/entitlement state.
--
-- Every accepted event is pinned to the server-authoritative Stripe mode before it can
-- claim a lease. The mode is persisted on event, payment and subscription ledgers.
-- Booking failure events share R34's booking -> payments -> installments -> sessions lock
-- order and can only move unsettled rows to failed. Subscription events serialize per
-- Stripe subscription, retain deletion tombstones and ignore older deliveries.

ALTER TABLE public.processed_stripe_events
  ADD COLUMN IF NOT EXISTS stripe_mode text;
ALTER TABLE public.processed_stripe_events
  DROP CONSTRAINT IF EXISTS processed_stripe_events_stripe_mode_check,
  ADD CONSTRAINT processed_stripe_events_stripe_mode_check
    CHECK (stripe_mode IS NULL OR stripe_mode IN ('test', 'live'));

ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS stripe_mode text;
ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_stripe_mode_check,
  ADD CONSTRAINT booking_payments_stripe_mode_check
    CHECK (stripe_mode IS NULL OR stripe_mode IN ('test', 'live'));

ALTER TABLE public.whatsapp_payment_sessions
  ADD COLUMN IF NOT EXISTS stripe_mode text;
ALTER TABLE public.whatsapp_payment_sessions
  DROP CONSTRAINT IF EXISTS whatsapp_payment_sessions_stripe_mode_check,
  ADD CONSTRAINT whatsapp_payment_sessions_stripe_mode_check
    CHECK (stripe_mode IS NULL OR stripe_mode IN ('test', 'live'));

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS stripe_mode text;
ALTER TABLE public.subscribers
  DROP CONSTRAINT IF EXISTS subscribers_stripe_mode_check,
  ADD CONSTRAINT subscribers_stripe_mode_check
    CHECK (stripe_mode IS NULL OR stripe_mode IN ('test', 'live'));

CREATE OR REPLACE FUNCTION public.prevent_stripe_ledger_mode_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF OLD.stripe_mode IS NOT NULL
     AND NEW.stripe_mode IS DISTINCT FROM OLD.stripe_mode THEN
    RAISE EXCEPTION 'STRIPE_LEDGER_MODE_IMMUTABLE'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_stripe_ledger_mode_change()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS prevent_booking_payment_mode_change
  ON public.booking_payments;
CREATE TRIGGER prevent_booking_payment_mode_change
BEFORE UPDATE OF stripe_mode ON public.booking_payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_stripe_ledger_mode_change();

DROP TRIGGER IF EXISTS prevent_whatsapp_payment_session_mode_change
  ON public.whatsapp_payment_sessions;
CREATE TRIGGER prevent_whatsapp_payment_session_mode_change
BEFORE UPDATE OF stripe_mode ON public.whatsapp_payment_sessions
FOR EACH ROW EXECUTE FUNCTION public.prevent_stripe_ledger_mode_change();

-- Financial evidence must outlive its booking. A booking/calendar/account hard delete is
-- rejected while a canonical payment row exists instead of cascading away money history.
ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_booking_id_fkey,
  ADD CONSTRAINT booking_payments_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;

REVOKE DELETE ON TABLE public.bookings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.protect_booking_payment_state_from_browser()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_retained_cents bigint := 0;
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'BOOKING_PAYMENT_STATUS_SERVER_MANAGED'
        USING ERRCODE = '42501';
    END IF;

    IF (
      NEW.status IN ('cancelled', 'no-show')
      AND OLD.status NOT IN ('cancelled', 'completed', 'no-show')
    ) OR (
      COALESCE(NEW.is_deleted, false)
      AND NOT COALESCE(OLD.is_deleted, false)
    ) THEN
      SELECT COALESCE(sum(
        GREATEST(payment.amount_cents - COALESCE(payment.refund_amount_cents, 0), 0)
      ), 0)::bigint
      INTO v_retained_cents
      FROM public.booking_payments AS payment
      WHERE payment.booking_id = OLD.id
        AND payment.status IN (
          'succeeded', 'completed', 'partially_refunded', 'refunded'
        );

      IF v_retained_cents > 0
         OR COALESCE(OLD.payment_status, 'none') IN (
           'paid', 'partial', 'partially_refunded', 'refund_required'
         ) THEN
        RAISE EXCEPTION 'CAPTURED_PAYMENT_REQUIRES_SECURE_BOOKING_ACTION'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_booking_payment_state_from_browser()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_booking_payment_state_from_browser
  ON public.bookings;
CREATE TRIGGER protect_booking_payment_state_from_browser
BEFORE UPDATE OF status, payment_status, is_deleted ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.protect_booking_payment_state_from_browser();

-- Replace the mode-blind Stripe event lease with a mode-bound lease.
DROP FUNCTION IF EXISTS public.claim_stripe_event(text, text, integer);
CREATE FUNCTION public.claim_stripe_event(
  p_event_id text,
  p_event_type text,
  p_lease_seconds integer,
  p_stripe_mode text
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
  IF NULLIF(btrim(p_event_id), '') IS NULL
     OR NULLIF(btrim(p_event_type), '') IS NULL
     OR p_stripe_mode NOT IN ('test', 'live') THEN
    RAISE EXCEPTION 'STRIPE_EVENT_ID_TYPE_MODE_REQUIRED'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.processed_stripe_events (
    event_id, event_type, stripe_mode, status, claim_token, claimed_at,
    completed_at, processed_at, attempt_count, last_error_code
  ) VALUES (
    p_event_id, p_event_type, p_stripe_mode, 'processing', v_token, now(),
    NULL, NULL, 1, NULL
  ) ON CONFLICT (event_id) DO NOTHING;

  SELECT * INTO v_event
  FROM public.processed_stripe_events
  WHERE event_id = p_event_id
  FOR UPDATE;

  IF v_event.event_type IS DISTINCT FROM p_event_type
     OR v_event.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'STRIPE_EVENT_IDENTITY_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  IF v_event.status = 'completed' THEN
    RETURN jsonb_build_object(
      'claimed', false, 'completed', true, 'reason', 'already_completed'
    );
  END IF;

  IF v_event.status = 'processing'
     AND v_event.claim_token IS DISTINCT FROM v_token
     AND v_event.claimed_at > now() - make_interval(secs => v_lease_seconds) THEN
    RETURN jsonb_build_object(
      'claimed', false, 'completed', false, 'reason', 'in_progress'
    );
  END IF;

  IF v_event.claim_token IS DISTINCT FROM v_token THEN
    v_token := gen_random_uuid();
    UPDATE public.processed_stripe_events
    SET status = 'processing', claim_token = v_token, claimed_at = now(),
        completed_at = NULL, processed_at = NULL,
        attempt_count = attempt_count + 1, last_error_code = NULL
    WHERE event_id = p_event_id
    RETURNING * INTO v_event;
  END IF;

  RETURN jsonb_build_object(
    'claimed', true, 'completed', false, 'claim_token', v_token,
    'attempt_count', v_event.attempt_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_stripe_event(text, text, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_event(text, text, integer, text)
  TO service_role;

CREATE TABLE IF NOT EXISTS public.stripe_subscription_states (
  stripe_subscription_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stripe_customer_id text NOT NULL,
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  stripe_status text NOT NULL CHECK (stripe_status IN (
    'active', 'trialing', 'past_due', 'unpaid', 'incomplete',
    'incomplete_expired', 'paused', 'canceled'
  )),
  subscription_tier text,
  subscription_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  tombstoned boolean NOT NULL DEFAULT false,
  superseded boolean NOT NULL DEFAULT false,
  last_event_id text NOT NULL,
  last_event_created bigint NOT NULL,
  last_event_kind text NOT NULL CHECK (last_event_kind IN (
    'created', 'updated', 'deleted'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_subscription_states_user_mode_idx
  ON public.stripe_subscription_states (
    user_id, stripe_mode, superseded, last_event_created DESC
  );

ALTER TABLE public.stripe_subscription_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_subscription_states
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stripe_subscription_states
  TO service_role;

CREATE OR REPLACE FUNCTION public.apply_stripe_subscription_event(
  p_event_id text,
  p_event_created bigint,
  p_stripe_mode text,
  p_event_kind text,
  p_subscription_id text,
  p_customer_id text,
  p_user_id uuid,
  p_user_email text,
  p_stripe_status text,
  p_tier text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_existing public.stripe_subscription_states%ROWTYPE;
  v_current public.stripe_subscription_states%ROWTYPE;
  v_user_id uuid;
  v_email text;
  v_incoming_rank integer;
  v_existing_rank integer;
  v_subscribed boolean;
  v_user_status text;
  v_payment_status text;
  v_grace_end timestamptz;
  v_row_count integer;
BEGIN
  IF NULLIF(btrim(p_event_id), '') IS NULL
     OR p_event_created IS NULL OR p_event_created < 0
     OR p_stripe_mode NOT IN ('test', 'live')
     OR p_event_kind NOT IN ('created', 'updated', 'deleted')
     OR NULLIF(btrim(p_subscription_id), '') IS NULL
     OR NULLIF(btrim(p_customer_id), '') IS NULL
     OR p_stripe_status NOT IN (
       'active', 'trialing', 'past_due', 'unpaid', 'incomplete',
       'incomplete_expired', 'paused', 'canceled'
     ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_EVENT_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  IF p_tier IS NOT NULL AND p_tier NOT IN (
    'starter', 'professional', 'enterprise', 'free'
  ) THEN
    RAISE EXCEPTION 'SUBSCRIPTION_TIER_INVALID'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'stripe-subscription:' || p_subscription_id, 0
  ));

  SELECT state.* INTO v_existing
  FROM public.stripe_subscription_states AS state
  WHERE state.stripe_subscription_id = p_subscription_id
  FOR UPDATE;

  v_user_id := COALESCE(v_existing.user_id, p_user_id);
  IF v_user_id IS NULL THEN
    SELECT subscriber.user_id INTO v_user_id
    FROM public.subscribers AS subscriber
    WHERE subscriber.stripe_subscription_id = p_subscription_id
    LIMIT 1;
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_EVENT_USER_MISSING'
      USING ERRCODE = 'P0002';
  END IF;
  IF p_user_id IS NOT NULL AND p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'SUBSCRIPTION_EVENT_USER_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'stripe-subscription-user:' || v_user_id::text || ':' || p_stripe_mode, 0
  ));

  SELECT COALESCE(NULLIF(btrim(p_user_email), ''), user_row.email)
  INTO v_email
  FROM public.users AS user_row
  WHERE user_row.id = v_user_id
  FOR UPDATE;
  IF NOT FOUND OR NULLIF(btrim(v_email), '') IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_EVENT_PROFILE_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_existing.stripe_subscription_id IS NOT NULL THEN
    IF v_existing.stripe_mode IS DISTINCT FROM p_stripe_mode
       OR v_existing.user_id IS DISTINCT FROM v_user_id
       OR v_existing.stripe_customer_id IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION 'SUBSCRIPTION_EVENT_IDENTITY_CONFLICT'
        USING ERRCODE = '22023';
    END IF;

    v_incoming_rank := CASE p_event_kind
      WHEN 'created' THEN 1 WHEN 'updated' THEN 2 ELSE 3 END;
    v_existing_rank := CASE v_existing.last_event_kind
      WHEN 'created' THEN 1 WHEN 'updated' THEN 2 ELSE 3 END;

    IF v_existing.tombstoned AND p_event_kind <> 'deleted' THEN
      RETURN jsonb_build_object(
        'success', true, 'applied', false, 'action', 'tombstone_preserved'
      );
    END IF;
    IF p_event_created < v_existing.last_event_created
       OR (
         p_event_created = v_existing.last_event_created
         AND v_incoming_rank <= v_existing_rank
         AND p_event_id IS DISTINCT FROM v_existing.last_event_id
       ) THEN
      RETURN jsonb_build_object(
        'success', true, 'applied', false, 'action', 'stale_event_ignored'
      );
    END IF;
    IF p_event_id = v_existing.last_event_id THEN
      RETURN jsonb_build_object(
        'success', true, 'applied', false, 'action', 'duplicate_event'
      );
    END IF;
  END IF;

  INSERT INTO public.stripe_subscription_states AS state (
    stripe_subscription_id, user_id, stripe_customer_id, stripe_mode,
    stripe_status, subscription_tier, subscription_end,
    cancel_at_period_end, tombstoned, superseded,
    last_event_id, last_event_created, last_event_kind, updated_at
  ) VALUES (
    p_subscription_id, v_user_id, p_customer_id, p_stripe_mode,
    CASE WHEN p_event_kind = 'deleted' THEN 'canceled' ELSE p_stripe_status END,
    p_tier, p_period_end, COALESCE(p_cancel_at_period_end, false),
    p_event_kind = 'deleted', false,
    p_event_id, p_event_created, p_event_kind, now()
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    stripe_status = EXCLUDED.stripe_status,
    subscription_tier = EXCLUDED.subscription_tier,
    subscription_end = EXCLUDED.subscription_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    tombstoned = EXCLUDED.tombstoned OR state.tombstoned,
    last_event_id = EXCLUDED.last_event_id,
    last_event_created = EXCLUDED.last_event_created,
    last_event_kind = EXCLUDED.last_event_kind,
    updated_at = now();

  IF p_event_kind <> 'deleted'
     AND p_stripe_status IN ('active', 'trialing') THEN
    UPDATE public.stripe_subscription_states AS state
    SET superseded = state.stripe_subscription_id <> p_subscription_id,
        updated_at = CASE
          WHEN state.stripe_subscription_id <> p_subscription_id THEN now()
          ELSE state.updated_at
        END
    WHERE state.user_id = v_user_id
      AND state.stripe_mode = p_stripe_mode
      AND (
        state.stripe_subscription_id = p_subscription_id
        OR state.superseded IS NOT TRUE
      );
  END IF;

  SELECT state.* INTO v_current
  FROM public.stripe_subscription_states AS state
  WHERE state.user_id = v_user_id
    AND state.stripe_mode = p_stripe_mode
    AND state.superseded IS NOT TRUE
  ORDER BY
    CASE WHEN state.stripe_status IN ('active', 'trialing')
      AND state.tombstoned IS NOT TRUE THEN 0 ELSE 1 END,
    state.last_event_created DESC,
    state.stripe_subscription_id DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_AUTHORITATIVE_STATE_MISSING';
  END IF;

  v_subscribed := v_current.tombstoned IS NOT TRUE
    AND v_current.stripe_status IN ('active', 'trialing');
  v_user_status := CASE
    WHEN v_current.tombstoned
      OR v_current.stripe_status = 'canceled'
      OR v_current.cancel_at_period_end THEN 'canceled'
    WHEN v_current.stripe_status IN ('active', 'trialing') THEN 'active'
    WHEN v_current.stripe_status IN (
      'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'
    ) THEN 'missed_payment'
    ELSE 'canceled'
  END;
  v_payment_status := CASE
    WHEN v_subscribed THEN 'paid'
    WHEN v_user_status = 'missed_payment' THEN 'unpaid'
    ELSE 'unpaid'
  END;
  v_grace_end := CASE WHEN v_user_status = 'missed_payment'
    THEN now() + interval '7 days' ELSE NULL END;

  UPDATE public.subscribers AS subscriber
  SET email = v_email,
      stripe_customer_id = v_current.stripe_customer_id,
      stripe_subscription_id = v_current.stripe_subscription_id,
      stripe_mode = p_stripe_mode,
      subscribed = v_subscribed,
      subscription_tier = CASE WHEN v_subscribed
        THEN v_current.subscription_tier ELSE NULL END,
      subscription_end = v_current.subscription_end,
      updated_at = now()
  WHERE subscriber.user_id = v_user_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count = 0 THEN
    INSERT INTO public.subscribers (
      user_id, email, stripe_customer_id, stripe_subscription_id,
      stripe_mode, subscribed, subscription_tier, subscription_end, updated_at
    ) VALUES (
      v_user_id, v_email, v_current.stripe_customer_id,
      v_current.stripe_subscription_id, p_stripe_mode, v_subscribed,
      CASE WHEN v_subscribed THEN v_current.subscription_tier ELSE NULL END,
      v_current.subscription_end, now()
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_mode = EXCLUDED.stripe_mode,
      subscribed = EXCLUDED.subscribed,
      subscription_tier = EXCLUDED.subscription_tier,
      subscription_end = EXCLUDED.subscription_end,
      updated_at = now()
    WHERE public.subscribers.user_id IS NULL
       OR public.subscribers.user_id = EXCLUDED.user_id;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count <> 1 THEN
      RAISE EXCEPTION 'SUBSCRIPTION_EMAIL_IDENTITY_CONFLICT'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.users AS user_row
  SET subscription_status = v_user_status,
      subscription_tier = CASE
        WHEN v_user_status = 'active' THEN v_current.subscription_tier::public.subscription_tier
        ELSE NULL
      END,
      subscription_end_date = v_current.subscription_end,
      payment_status = v_payment_status,
      grace_period_end = v_grace_end,
      cancel_at_period_end = v_current.cancel_at_period_end OR v_current.tombstoned,
      updated_at = now()
  WHERE user_row.id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'applied', true,
    'action', CASE WHEN p_event_kind = 'deleted'
      THEN 'deleted' ELSE 'state_applied' END,
    'userId', v_user_id,
    'subscriptionStatus', v_user_status,
    'stripeStatus', v_current.stripe_status,
    'subscribed', v_subscribed,
    'authoritativeSubscriptionId', v_current.stripe_subscription_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_stripe_subscription_event(
  text, bigint, text, text, text, text, uuid, text, text, text,
  timestamptz, boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_event(
  text, bigint, text, text, text, text, uuid, text, text, text,
  timestamptz, boolean
) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_stripe_subscription_invoice_event(
  p_event_id text,
  p_event_created bigint,
  p_stripe_mode text,
  p_subscription_id text,
  p_outcome text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_state public.stripe_subscription_states%ROWTYPE;
BEGIN
  IF p_outcome NOT IN ('succeeded', 'failed') THEN
    RAISE EXCEPTION 'SUBSCRIPTION_INVOICE_OUTCOME_INVALID'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'stripe-subscription:' || p_subscription_id, 0
  ));
  SELECT state.* INTO v_state
  FROM public.stripe_subscription_states AS state
  WHERE state.stripe_subscription_id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'applied', false, 'action', 'subscription_not_seen_yet'
    );
  END IF;
  IF v_state.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'SUBSCRIPTION_INVOICE_MODE_CONFLICT'
      USING ERRCODE = '22023';
  END IF;
  IF v_state.tombstoned OR v_state.superseded
     OR p_event_created < v_state.last_event_created THEN
    RETURN jsonb_build_object(
      'success', true, 'applied', false, 'action', 'terminal_or_stale_ignored'
    );
  END IF;

  RETURN public.apply_stripe_subscription_event(
    p_event_id,
    p_event_created,
    p_stripe_mode,
    'updated',
    v_state.stripe_subscription_id,
    v_state.stripe_customer_id,
    v_state.user_id,
    NULL,
    CASE WHEN p_outcome = 'succeeded' THEN 'active' ELSE 'past_due' END,
    v_state.subscription_tier,
    v_state.subscription_end,
    v_state.cancel_at_period_end
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_stripe_subscription_invoice_event(
  text, bigint, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_invoice_event(
  text, bigint, text, text, text
) TO service_role;

CREATE TABLE IF NOT EXISTS public.subscription_checkout_claims (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  tier_name text NOT NULL,
  cadence text NOT NULL CHECK (cadence IN ('month', 'year')),
  status text NOT NULL CHECK (status IN ('processing', 'created', 'failed')),
  claim_token uuid,
  claimed_at timestamptz,
  stripe_session_id text,
  checkout_url text,
  expires_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stripe_mode)
);

ALTER TABLE public.subscription_checkout_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.subscription_checkout_claims
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscription_checkout_claims
  TO service_role;

CREATE OR REPLACE FUNCTION public.claim_subscription_checkout(
  p_user_id uuid,
  p_stripe_mode text,
  p_tier_name text,
  p_cadence text,
  p_lease_seconds integer DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_claim public.subscription_checkout_claims%ROWTYPE;
  v_token uuid := gen_random_uuid();
  v_lease integer := LEAST(GREATEST(p_lease_seconds, 30), 600);
BEGIN
  IF p_user_id IS NULL OR p_stripe_mode NOT IN ('test', 'live')
     OR NULLIF(btrim(p_tier_name), '') IS NULL
     OR p_cadence NOT IN ('month', 'year') THEN
    RAISE EXCEPTION 'SUBSCRIPTION_CHECKOUT_CLAIM_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'subscription-checkout:' || p_user_id::text || ':' || p_stripe_mode, 0
  ));

  SELECT claim.* INTO v_claim
  FROM public.subscription_checkout_claims AS claim
  WHERE claim.user_id = p_user_id AND claim.stripe_mode = p_stripe_mode
  FOR UPDATE;

  IF FOUND AND v_claim.status = 'created'
     AND v_claim.expires_at > now()
     AND v_claim.tier_name = p_tier_name
     AND v_claim.cadence = p_cadence
     AND v_claim.stripe_session_id IS NOT NULL
     AND v_claim.checkout_url IS NOT NULL THEN
    RETURN jsonb_build_object(
      'claimed', false, 'replay', true,
      'session_id', v_claim.stripe_session_id,
      'checkout_url', v_claim.checkout_url,
      'expires_at', v_claim.expires_at
    );
  END IF;

  IF FOUND AND v_claim.status = 'created'
     AND v_claim.expires_at > now() THEN
    RETURN jsonb_build_object(
      'claimed', false, 'replay', false, 'reason', 'existing_session'
    );
  END IF;

  IF FOUND AND v_claim.status = 'processing'
     AND v_claim.claimed_at > now() - make_interval(secs => v_lease) THEN
    RETURN jsonb_build_object(
      'claimed', false, 'replay', false, 'reason', 'in_progress'
    );
  END IF;

  INSERT INTO public.subscription_checkout_claims AS claim (
    user_id, stripe_mode, tier_name, cadence, status, claim_token,
    claimed_at, stripe_session_id, checkout_url, expires_at,
    last_error_code, updated_at
  ) VALUES (
    p_user_id, p_stripe_mode, p_tier_name, p_cadence, 'processing',
    v_token, now(), NULL, NULL, NULL, NULL, now()
  ) ON CONFLICT (user_id, stripe_mode) DO UPDATE SET
    tier_name = EXCLUDED.tier_name,
    cadence = EXCLUDED.cadence,
    status = 'processing',
    claim_token = EXCLUDED.claim_token,
    claimed_at = now(),
    stripe_session_id = NULL,
    checkout_url = NULL,
    expires_at = NULL,
    last_error_code = NULL,
    updated_at = now();

  RETURN jsonb_build_object(
    'claimed', true, 'replay', false, 'claim_token', v_token
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_subscription_checkout(
  p_user_id uuid,
  p_stripe_mode text,
  p_claim_token uuid,
  p_session_id text,
  p_checkout_url text,
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.subscription_checkout_claims
  SET status = 'created', claim_token = NULL, claimed_at = NULL,
      stripe_session_id = p_session_id, checkout_url = p_checkout_url,
      expires_at = p_expires_at, last_error_code = NULL, updated_at = now()
  WHERE user_id = p_user_id
    AND stripe_mode = p_stripe_mode
    AND status = 'processing'
    AND claim_token = p_claim_token
    AND NULLIF(btrim(p_session_id), '') IS NOT NULL
    AND NULLIF(btrim(p_checkout_url), '') IS NOT NULL
    AND p_expires_at > now()
  RETURNING true;
$function$;

CREATE OR REPLACE FUNCTION public.fail_subscription_checkout(
  p_user_id uuid,
  p_stripe_mode text,
  p_claim_token uuid,
  p_error_code text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.subscription_checkout_claims
  SET status = 'failed', claim_token = NULL, claimed_at = NULL,
      last_error_code = left(COALESCE(NULLIF(btrim(p_error_code), ''), 'failed'), 80),
      updated_at = now()
  WHERE user_id = p_user_id
    AND stripe_mode = p_stripe_mode
    AND status = 'processing'
    AND claim_token = p_claim_token
  RETURNING true;
$function$;

REVOKE ALL ON FUNCTION public.claim_subscription_checkout(uuid, text, text, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_subscription_checkout(
  uuid, text, uuid, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_subscription_checkout(uuid, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_subscription_checkout(uuid, text, text, text, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_subscription_checkout(
  uuid, text, uuid, text, text, timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_subscription_checkout(uuid, text, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.record_booking_payment_failure(
  p_booking_id uuid,
  p_stripe_payment_intent_id text,
  p_stripe_mode text,
  p_failed_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_payment public.booking_payments%ROWTYPE;
  v_retained_cents bigint := 0;
BEGIN
  IF p_booking_id IS NULL
     OR NULLIF(btrim(p_stripe_payment_intent_id), '') IS NULL
     OR p_stripe_mode NOT IN ('test', 'live')
     OR p_failed_at IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_FAILURE_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT booking.* INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_FAILURE_BOOKING_MISSING' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1 FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id FOR UPDATE;

  SELECT payment.* INTO v_payment
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id = p_stripe_payment_intent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_FAILURE_LEDGER_MISSING' USING ERRCODE = 'P0002';
  END IF;
  IF v_payment.stripe_mode IS NOT NULL
     AND v_payment.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'PAYMENT_FAILURE_MODE_CONFLICT' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.installment_payments AS installment
  WHERE installment.booking_id = p_booking_id
  ORDER BY installment.id FOR UPDATE;
  PERFORM 1 FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
  ORDER BY session.id FOR UPDATE;

  IF v_payment.status IN (
    'succeeded', 'completed', 'partially_refunded', 'refunded'
  ) THEN
    RETURN jsonb_build_object(
      'success', true, 'applied', false, 'action', 'terminal_money_preserved',
      'ledgerStatus', v_payment.status,
      'bookingPaymentStatus', v_booking.payment_status
    );
  END IF;

  UPDATE public.booking_payments AS payment
  SET status = 'failed',
      stripe_mode = COALESCE(payment.stripe_mode, p_stripe_mode),
      updated_at = GREATEST(payment.updated_at, p_failed_at)
  WHERE payment.id = v_payment.id
    AND payment.status IN ('pending', 'processing', 'failed');

  UPDATE public.installment_payments AS installment
  SET status = 'failed', updated_at = GREATEST(installment.updated_at, p_failed_at)
  WHERE installment.booking_id = p_booking_id
    AND installment.stripe_payment_intent_id = p_stripe_payment_intent_id
    AND installment.status IN ('pending', 'processing', 'failed');

  UPDATE public.whatsapp_payment_sessions AS session
  SET payment_status = 'failed',
      stripe_mode = COALESCE(session.stripe_mode, p_stripe_mode),
      updated_at = GREATEST(session.updated_at, p_failed_at)
  WHERE session.booking_id = p_booking_id
    AND session.stripe_payment_intent_id = p_stripe_payment_intent_id
    AND session.payment_status IN ('pending', 'processing', 'failed');

  SELECT COALESCE(sum(
    GREATEST(payment.amount_cents - COALESCE(payment.refund_amount_cents, 0), 0)
  ), 0)::bigint
  INTO v_retained_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  IF v_retained_cents = 0
     AND COALESCE(v_booking.payment_status, 'none') IN (
       'none', 'unpaid', 'pending', 'failed'
     ) THEN
    UPDATE public.bookings AS booking
    SET payment_status = 'failed', updated_at = GREATEST(booking.updated_at, p_failed_at)
    WHERE booking.id = p_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'applied', true, 'action', 'unsettled_marked_failed',
    'retainedTotalCents', v_retained_cents
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_booking_checkout_failure(
  p_booking_id uuid,
  p_stripe_session_id text,
  p_stripe_mode text,
  p_failed_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_session public.whatsapp_payment_sessions%ROWTYPE;
  v_retained_cents bigint := 0;
BEGIN
  IF p_booking_id IS NULL OR NULLIF(btrim(p_stripe_session_id), '') IS NULL
     OR p_stripe_mode NOT IN ('test', 'live') OR p_failed_at IS NULL THEN
    RAISE EXCEPTION 'CHECKOUT_FAILURE_INPUT_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT booking.* INTO v_booking FROM public.bookings AS booking
  WHERE booking.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHECKOUT_FAILURE_BOOKING_MISSING' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id ORDER BY payment.id FOR UPDATE;
  PERFORM 1 FROM public.installment_payments AS installment
  WHERE installment.booking_id = p_booking_id ORDER BY installment.id FOR UPDATE;
  PERFORM 1 FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id ORDER BY session.id FOR UPDATE;

  SELECT session.* INTO v_session
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
    AND session.stripe_session_id = p_stripe_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'applied', false, 'action', 'session_not_local'
    );
  END IF;
  IF v_session.stripe_mode IS NOT NULL
     AND v_session.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'CHECKOUT_FAILURE_MODE_CONFLICT' USING ERRCODE = '22023';
  END IF;
  IF v_session.payment_status IN (
    'paid', 'succeeded', 'completed', 'partially_refunded', 'refunded'
  ) THEN
    RETURN jsonb_build_object(
      'success', true, 'applied', false, 'action', 'terminal_session_preserved'
    );
  END IF;

  UPDATE public.whatsapp_payment_sessions AS session
  SET payment_status = 'failed',
      stripe_mode = COALESCE(session.stripe_mode, p_stripe_mode),
      updated_at = GREATEST(session.updated_at, p_failed_at)
  WHERE session.id = v_session.id
    AND session.payment_status IN ('pending', 'processing', 'failed');

  SELECT COALESCE(sum(
    GREATEST(payment.amount_cents - COALESCE(payment.refund_amount_cents, 0), 0)
  ), 0)::bigint
  INTO v_retained_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  IF v_retained_cents = 0
     AND COALESCE(v_booking.payment_status, 'none') IN (
       'none', 'unpaid', 'pending', 'failed'
     ) THEN
    UPDATE public.bookings AS booking
    SET payment_status = 'failed', updated_at = GREATEST(booking.updated_at, p_failed_at)
    WHERE booking.id = p_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'applied', true, 'action', 'unsettled_session_failed'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_booking_payment_failure(uuid, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_booking_checkout_failure(uuid, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_payment_failure(uuid, text, text, timestamptz)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_booking_checkout_failure(uuid, text, text, timestamptz)
  TO service_role;

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
  v_mode text;
BEGIN
  IF p_stripe_mode NOT IN ('test', 'live') THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_MODE_INVALID' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_BOOKING_MISSING' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id ORDER BY payment.id FOR UPDATE;
  SELECT payment.stripe_mode INTO v_mode
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id = p_stripe_payment_intent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_LEDGER_MISSING' USING ERRCODE = 'P0002';
  END IF;
  IF v_mode IS NOT NULL AND v_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_MODE_CONFLICT' USING ERRCODE = '22023';
  END IF;
  UPDATE public.booking_payments SET stripe_mode = p_stripe_mode
  WHERE booking_id = p_booking_id
    AND stripe_payment_intent_id = p_stripe_payment_intent_id
    AND stripe_mode IS NULL;
  RETURN public.finalize_booking_payment_success(
    p_booking_id, p_stripe_payment_intent_id, p_payment_kind, p_paid_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.reconcile_booking_refund_v2(
  p_booking_id uuid,
  p_stripe_payment_intent_id text,
  p_refund_amount_cents integer,
  p_refunded_at timestamptz,
  p_stripe_mode text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_mode text;
BEGIN
  IF p_stripe_mode NOT IN ('test', 'live') THEN
    RAISE EXCEPTION 'REFUND_MODE_INVALID' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUND_BOOKING_MISSING' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id ORDER BY payment.id FOR UPDATE;
  SELECT payment.stripe_mode INTO v_mode
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id = p_stripe_payment_intent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUND_PAYMENT_LEDGER_MISSING' USING ERRCODE = 'P0002';
  END IF;
  IF v_mode IS NOT NULL AND v_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'REFUND_MODE_CONFLICT' USING ERRCODE = '22023';
  END IF;
  UPDATE public.booking_payments SET stripe_mode = p_stripe_mode
  WHERE booking_id = p_booking_id
    AND stripe_payment_intent_id = p_stripe_payment_intent_id
    AND stripe_mode IS NULL;
  RETURN public.reconcile_booking_refund(
    p_booking_id, p_stripe_payment_intent_id,
    p_refund_amount_cents, p_refunded_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_booking_payment_success_v2(
  uuid, text, text, timestamptz, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_booking_refund_v2(
  uuid, text, integer, timestamptz, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_booking_payment_success_v2(
  uuid, text, text, timestamptz, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_booking_refund_v2(
  uuid, text, integer, timestamptz, text
) TO service_role;

-- The Edge webhook must use the mode-aware wrappers. Keep the old implementations as
-- owner-internal building blocks but remove their direct service-role entry points.
REVOKE EXECUTE ON FUNCTION public.finalize_booking_payment_success(
  uuid, text, text, timestamptz
) FROM service_role;
REVOKE EXECUTE ON FUNCTION public.reconcile_booking_refund(
  uuid, text, integer, timestamptz
) FROM service_role;

COMMENT ON TABLE public.stripe_subscription_states IS
  'R38 per-subscription monotonic Stripe state with environment identity and deletion tombstone.';
COMMENT ON FUNCTION public.record_booking_payment_failure(uuid, text, text, timestamptz) IS
  'R38 booking-first failure transition. Captured/refunded money is terminal and never downgraded.';
COMMENT ON FUNCTION public.claim_subscription_checkout(uuid, text, text, text, integer) IS
  'R38 durable per-user checkout claim. A parallel or repeated plan selection cannot mint a second subscription session.';
