-- R43: global subscription event order, scheduled-cancellation entitlement,
-- and soft-deleted booking payment safety.
--
-- R38 serialized and ordered each Stripe subscription independently. That still
-- allowed an old event for subscription A to replace a newer subscription B for
-- the same user. Keep one authority tuple per (user, Stripe mode). Per subscription,
-- equal-second order is status precedence, then event-kind precedence
-- (deleted > updated > created), then the event id in C collation. Across different
-- subscription ids, authority is selected from all durable states so deleting A can
-- never suppress an equally timed paid replacement B.
--
-- R34 also treated status-terminal bookings as refund-required after a delayed
-- Stripe success but omitted is_deleted. Replace that atomic function below so a
-- soft-deleted booking records captured money without being resurrected.

ALTER TABLE public.stripe_subscription_states
  ADD COLUMN IF NOT EXISTS last_event_precedence integer,
  ADD COLUMN IF NOT EXISTS last_event_kind_precedence integer;

UPDATE public.stripe_subscription_states
SET last_event_precedence = CASE
  WHEN last_event_kind = 'deleted' THEN 300
  WHEN stripe_status IN ('active', 'trialing') THEN 200
  ELSE 100
END
WHERE last_event_precedence IS NULL;

UPDATE public.stripe_subscription_states
SET last_event_kind_precedence = CASE last_event_kind
  WHEN 'deleted' THEN 300
  WHEN 'updated' THEN 200
  ELSE 100
END
WHERE last_event_kind_precedence IS NULL;

ALTER TABLE public.stripe_subscription_states
  ALTER COLUMN last_event_precedence SET NOT NULL,
  ALTER COLUMN last_event_kind_precedence SET NOT NULL,
  DROP CONSTRAINT IF EXISTS stripe_subscription_states_event_precedence_check,
  DROP CONSTRAINT IF EXISTS stripe_subscription_states_event_kind_precedence_check,
  ADD CONSTRAINT stripe_subscription_states_event_precedence_check
    CHECK (last_event_precedence IN (100, 200, 300)),
  ADD CONSTRAINT stripe_subscription_states_event_kind_precedence_check
    CHECK (last_event_kind_precedence IN (100, 200, 300));

CREATE TABLE IF NOT EXISTS public.subscription_event_high_water_marks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  last_event_created bigint NOT NULL CHECK (last_event_created >= 0),
  last_event_precedence integer NOT NULL
    CHECK (last_event_precedence IN (100, 200, 300)),
  last_event_kind_precedence integer NOT NULL,
  last_event_id text NOT NULL,
  authoritative_subscription_id text NOT NULL
    REFERENCES public.stripe_subscription_states(stripe_subscription_id)
    ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, stripe_mode)
);

ALTER TABLE public.subscription_event_high_water_marks
  ADD COLUMN IF NOT EXISTS last_event_kind_precedence integer;

UPDATE public.subscription_event_high_water_marks AS watermark
SET last_event_kind_precedence = COALESCE(
  (
    SELECT state.last_event_kind_precedence
    FROM public.stripe_subscription_states AS state
    WHERE state.stripe_subscription_id =
      watermark.authoritative_subscription_id
  ),
  100
)
WHERE watermark.last_event_kind_precedence IS NULL;

ALTER TABLE public.subscription_event_high_water_marks
  ALTER COLUMN last_event_kind_precedence SET NOT NULL,
  DROP CONSTRAINT IF EXISTS subscription_event_high_water_marks_kind_precedence_check,
  ADD CONSTRAINT subscription_event_high_water_marks_kind_precedence_check
    CHECK (last_event_kind_precedence IN (100, 200, 300));

ALTER TABLE public.subscription_event_high_water_marks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.subscription_event_high_water_marks
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.subscription_event_high_water_marks TO service_role;

-- Backfill one coherent tuple: every order field comes from the same
-- authoritative subscription row instead of mixing a non-authoritative event
-- with another subscription id.
WITH authoritative AS (
  SELECT ranked.*
  FROM (
    SELECT
      state.user_id,
      state.stripe_mode,
      state.stripe_subscription_id,
      state.last_event_created,
      state.last_event_precedence,
      state.last_event_kind_precedence,
      state.last_event_id,
      row_number() OVER (
        PARTITION BY state.user_id, state.stripe_mode
        ORDER BY
          CASE WHEN state.superseded IS NOT TRUE THEN 0 ELSE 1 END,
          CASE
            WHEN state.stripe_status IN ('active', 'trialing')
              AND state.tombstoned IS NOT TRUE THEN 0
            ELSE 1
          END,
          state.last_event_created DESC,
          state.last_event_precedence DESC,
          state.last_event_kind_precedence DESC,
          state.last_event_id COLLATE "C" DESC,
          state.stripe_subscription_id COLLATE "C" DESC
      ) AS authority_rank
    FROM public.stripe_subscription_states AS state
  ) AS ranked
  WHERE ranked.authority_rank = 1
)
INSERT INTO public.subscription_event_high_water_marks (
  user_id,
  stripe_mode,
  last_event_created,
  last_event_precedence,
  last_event_kind_precedence,
  last_event_id,
  authoritative_subscription_id,
  updated_at
)
SELECT
  authoritative.user_id,
  authoritative.stripe_mode,
  authoritative.last_event_created,
  authoritative.last_event_precedence,
  authoritative.last_event_kind_precedence,
  authoritative.last_event_id,
  authoritative.stripe_subscription_id,
  now()
FROM authoritative
ON CONFLICT (user_id, stripe_mode) DO UPDATE SET
  last_event_created = EXCLUDED.last_event_created,
  last_event_precedence = EXCLUDED.last_event_precedence,
  last_event_kind_precedence = EXCLUDED.last_event_kind_precedence,
  last_event_id = EXCLUDED.last_event_id,
  authoritative_subscription_id = EXCLUDED.authoritative_subscription_id,
  updated_at = now();

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
  v_watermark public.subscription_event_high_water_marks%ROWTYPE;
  v_user_id uuid;
  v_email text;
  v_incoming_precedence integer;
  v_incoming_kind_precedence integer;
  v_subscribed boolean;
  v_user_status text;
  v_payment_status text;
  v_grace_end timestamptz;
  v_existing_user_status text;
  v_existing_user_tier public.subscription_tier;
  v_existing_grace_end timestamptz;
  v_previous_subscribed boolean;
  v_previous_subscriber_tier text;
  v_effective_tier text;
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

  v_incoming_precedence := CASE
    WHEN p_event_kind = 'deleted' THEN 300
    WHEN p_stripe_status IN ('active', 'trialing') THEN 200
    ELSE 100
  END;
  v_incoming_kind_precedence := CASE p_event_kind
    WHEN 'deleted' THEN 300
    WHEN 'updated' THEN 200
    ELSE 100
  END;

  -- Resolve identity without taking a row lock. The shared user+mode lock must be
  -- acquired before any per-subscription lock; the reverse order can deadlock when
  -- simultaneous A/B events each hold their own row and try to supersede the other.
  SELECT state.* INTO v_existing
  FROM public.stripe_subscription_states AS state
  WHERE state.stripe_subscription_id = p_subscription_id;

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

  -- Different subscription ids for one user serialize on this lock before reading
  -- or changing the shared high-water row and entitlement mirrors.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'stripe-subscription-user:' || v_user_id::text || ':' || p_stripe_mode, 0
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'stripe-subscription:' || p_subscription_id, 0
  ));

  -- Refresh under both locks. A concurrent first event for this subscription may
  -- have committed between the identity probe and lock acquisition.
  SELECT state.* INTO v_existing
  FROM public.stripe_subscription_states AS state
  WHERE state.stripe_subscription_id = p_subscription_id
  FOR UPDATE;

  SELECT
    COALESCE(NULLIF(btrim(p_user_email), ''), user_row.email),
    user_row.subscription_status,
    user_row.subscription_tier,
    user_row.grace_period_end
  INTO
    v_email,
    v_existing_user_status,
    v_existing_user_tier,
    v_existing_grace_end
  FROM public.users AS user_row
  WHERE user_row.id = v_user_id
  FOR UPDATE;
  IF NOT FOUND OR NULLIF(btrim(v_email), '') IS NULL THEN
    RAISE EXCEPTION 'SUBSCRIPTION_EVENT_PROFILE_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT subscriber.subscribed, subscriber.subscription_tier
  INTO v_previous_subscribed, v_previous_subscriber_tier
  FROM public.subscribers AS subscriber
  WHERE subscriber.user_id = v_user_id
  FOR UPDATE;

  IF v_existing.stripe_subscription_id IS NOT NULL THEN
    IF v_existing.stripe_mode IS DISTINCT FROM p_stripe_mode
       OR v_existing.user_id IS DISTINCT FROM v_user_id
       OR v_existing.stripe_customer_id IS DISTINCT FROM p_customer_id THEN
      RAISE EXCEPTION 'SUBSCRIPTION_EVENT_IDENTITY_CONFLICT'
        USING ERRCODE = '22023';
    END IF;

    IF p_event_id = v_existing.last_event_id THEN
      RETURN jsonb_build_object(
        'success', true, 'applied', false, 'action', 'duplicate_event'
      );
    END IF;
    IF v_existing.tombstoned AND p_event_kind <> 'deleted' THEN
      RETURN jsonb_build_object(
        'success', true, 'applied', false, 'action', 'tombstone_preserved'
      );
    END IF;
    IF p_event_created < v_existing.last_event_created
       OR (
         p_event_created = v_existing.last_event_created
         AND (
           v_incoming_precedence < v_existing.last_event_precedence
           OR (
             v_incoming_precedence = v_existing.last_event_precedence
             AND (
               v_incoming_kind_precedence <
                 v_existing.last_event_kind_precedence
               OR (
                 v_incoming_kind_precedence =
                   v_existing.last_event_kind_precedence
                 AND p_event_id COLLATE "C" <
                   v_existing.last_event_id COLLATE "C"
               )
             )
           )
         )
       ) THEN
      RETURN jsonb_build_object(
        'success', true, 'applied', false, 'action', 'stale_event_ignored'
      );
    END IF;
  END IF;

  SELECT watermark.* INTO v_watermark
  FROM public.subscription_event_high_water_marks AS watermark
  WHERE watermark.user_id = v_user_id
    AND watermark.stripe_mode = p_stripe_mode
  FOR UPDATE;

  IF FOUND THEN
    IF p_event_id = v_watermark.last_event_id THEN
      RETURN jsonb_build_object(
        'success', true, 'applied', false, 'action', 'duplicate_event'
      );
    END IF;
    -- Created time is the global user+mode high-water mark. No event from any
    -- older subscription may restore entitlement after a newer replacement or
    -- tombstone. Equal-second semantic comparison remains subscription-local so
    -- activating B and deleting A in one Stripe second converges in either order.
    IF p_event_created < v_watermark.last_event_created
       OR (
         p_subscription_id = v_watermark.authoritative_subscription_id
         AND p_event_created = v_watermark.last_event_created
         AND (
           v_incoming_precedence < v_watermark.last_event_precedence
           OR (
             v_incoming_precedence = v_watermark.last_event_precedence
             AND (
               v_incoming_kind_precedence <
                 v_watermark.last_event_kind_precedence
               OR (
                 v_incoming_kind_precedence =
                   v_watermark.last_event_kind_precedence
                 AND p_event_id COLLATE "C" <
                   v_watermark.last_event_id COLLATE "C"
               )
             )
           )
         )
       ) THEN
      RETURN jsonb_build_object(
        'success', true,
        'applied', false,
        'action', 'stale_user_mode_event_ignored',
        'authoritativeSubscriptionId',
          v_watermark.authoritative_subscription_id
      );
    END IF;
  END IF;

  INSERT INTO public.stripe_subscription_states AS state (
    stripe_subscription_id,
    user_id,
    stripe_customer_id,
    stripe_mode,
    stripe_status,
    subscription_tier,
    subscription_end,
    cancel_at_period_end,
    tombstoned,
    superseded,
    last_event_id,
    last_event_created,
    last_event_kind,
    last_event_precedence,
    last_event_kind_precedence,
    updated_at
  ) VALUES (
    p_subscription_id,
    v_user_id,
    p_customer_id,
    p_stripe_mode,
    CASE WHEN p_event_kind = 'deleted' THEN 'canceled' ELSE p_stripe_status END,
    p_tier,
    p_period_end,
    COALESCE(p_cancel_at_period_end, false),
    p_event_kind = 'deleted',
    false,
    p_event_id,
    p_event_created,
    p_event_kind,
    v_incoming_precedence,
    v_incoming_kind_precedence,
    now()
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
    last_event_precedence = EXCLUDED.last_event_precedence,
    last_event_kind_precedence = EXCLUDED.last_event_kind_precedence,
    updated_at = now();

  -- Compare the current authority with the incoming subscription. Previously
  -- superseded rows stay excluded unless a new event for that exact subscription
  -- makes it a candidate; this avoids resurrecting an old plan when the current
  -- plan is later deleted.
  SELECT state.* INTO v_current
  FROM public.stripe_subscription_states AS state
  WHERE state.user_id = v_user_id
    AND state.stripe_mode = p_stripe_mode
    AND (
      state.superseded IS NOT TRUE
      OR state.stripe_subscription_id = p_subscription_id
    )
  ORDER BY
    CASE
      WHEN state.stripe_status IN ('active', 'trialing')
        AND state.tombstoned IS NOT TRUE THEN 0
      ELSE 1
    END,
    state.last_event_created DESC,
    state.last_event_precedence DESC,
    state.last_event_kind_precedence DESC,
    state.last_event_id COLLATE "C" DESC,
    state.stripe_subscription_id COLLATE "C" DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_AUTHORITATIVE_STATE_MISSING';
  END IF;

  UPDATE public.stripe_subscription_states AS state
  SET superseded = state.stripe_subscription_id <>
        v_current.stripe_subscription_id,
      updated_at = CASE
        WHEN state.superseded IS DISTINCT FROM (
          state.stripe_subscription_id <> v_current.stripe_subscription_id
        ) THEN now()
        ELSE state.updated_at
      END
  WHERE state.user_id = v_user_id
    AND state.stripe_mode = p_stripe_mode;

  INSERT INTO public.subscription_event_high_water_marks AS watermark (
    user_id,
    stripe_mode,
    last_event_created,
    last_event_precedence,
    last_event_kind_precedence,
    last_event_id,
    authoritative_subscription_id,
    updated_at
  ) VALUES (
    v_user_id,
    p_stripe_mode,
    v_current.last_event_created,
    v_current.last_event_precedence,
    v_current.last_event_kind_precedence,
    v_current.last_event_id,
    v_current.stripe_subscription_id,
    now()
  )
  ON CONFLICT (user_id, stripe_mode) DO UPDATE SET
    last_event_created = EXCLUDED.last_event_created,
    last_event_precedence = EXCLUDED.last_event_precedence,
    last_event_kind_precedence = EXCLUDED.last_event_kind_precedence,
    last_event_id = EXCLUDED.last_event_id,
    authoritative_subscription_id = EXCLUDED.authoritative_subscription_id,
    updated_at = now();

  IF v_current.stripe_subscription_id <> p_subscription_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'stateRecorded', true,
      'action', 'stale_user_mode_event_ignored',
      'authoritativeSubscriptionId', v_current.stripe_subscription_id
    );
  END IF;

  -- Stripe keeps an active/trialing subscription entitled when cancellation is
  -- merely scheduled. Preserve that entitlement through the recorded period end
  -- while exposing cancellation truth separately through subscription_status and
  -- cancel_at_period_end. A missing/past period end fails closed.
  v_subscribed := v_current.tombstoned IS NOT TRUE
    AND v_current.stripe_status IN ('active', 'trialing')
    AND (
      v_current.cancel_at_period_end IS NOT TRUE
      OR (
        v_current.subscription_end IS NOT NULL
        AND v_current.subscription_end > now()
      )
    );
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
    ELSE 'unpaid'
  END;
  -- Grace is a one-shot transition for an already-paid entitlement. A newer
  -- failure preserves the original deadline, including an already-expired one;
  -- it can never manufacture or restart access for an unpaid first checkout.
  v_grace_end := CASE
    WHEN v_user_status = 'missed_payment'
      AND v_existing_user_status = 'missed_payment'
      THEN v_existing_grace_end
    WHEN v_user_status = 'missed_payment'
      AND (
        COALESCE(v_previous_subscribed, false)
        OR (
          v_existing_user_status = 'active'
          AND v_existing_user_tier IS NOT NULL
        )
      )
      THEN now() + interval '7 days'
    ELSE NULL
  END;
  v_effective_tier := CASE
    -- A scheduled cancellation is represented as status=canceled plus the
    -- cancel flag, but it remains a paid entitlement until period end.
    WHEN v_subscribed THEN v_current.subscription_tier
    WHEN v_user_status = 'missed_payment'
      AND v_grace_end > now()
      THEN COALESCE(
        v_previous_subscriber_tier,
        v_existing_user_tier::text
      )
    ELSE NULL
  END;

  UPDATE public.subscribers AS subscriber
  SET email = v_email,
      stripe_customer_id = v_current.stripe_customer_id,
      stripe_subscription_id = v_current.stripe_subscription_id,
      stripe_mode = p_stripe_mode,
      subscribed = v_subscribed,
      subscription_tier = v_effective_tier,
      subscription_end = v_current.subscription_end,
      updated_at = now()
  WHERE subscriber.user_id = v_user_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count = 0 THEN
    INSERT INTO public.subscribers (
      user_id,
      email,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_mode,
      subscribed,
      subscription_tier,
      subscription_end,
      updated_at
    ) VALUES (
      v_user_id,
      v_email,
      v_current.stripe_customer_id,
      v_current.stripe_subscription_id,
      p_stripe_mode,
      v_subscribed,
      v_effective_tier,
      v_current.subscription_end,
      now()
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
      subscription_tier = v_effective_tier::public.subscription_tier,
      subscription_end_date = v_current.subscription_end,
      payment_status = v_payment_status,
      grace_period_end = v_grace_end,
      cancel_at_period_end =
        v_current.cancel_at_period_end OR v_current.tombstoned,
      updated_at = now()
  WHERE user_row.id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'applied', true,
    'action', CASE
      WHEN p_event_kind = 'deleted' THEN 'deleted'
      ELSE 'state_applied'
    END,
    'userId', v_user_id,
    'subscriptionStatus', v_user_status,
    'stripeStatus', v_current.stripe_status,
    'subscribed', v_subscribed,
    'effectiveTier', v_effective_tier,
    'gracePeriodEnd', v_grace_end,
    'eventPrecedence', v_incoming_precedence,
    'eventKindPrecedence', v_incoming_kind_precedence,
    'authoritativeSubscriptionId', v_current.stripe_subscription_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_stripe_subscription_event(
  text, bigint, text, text, text, text, uuid, text, text, text,
  timestamptz, boolean
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_event(
  text, bigint, text, text, text, text, uuid, text, text, text,
  timestamptz, boolean
) TO service_role;

COMMENT ON TABLE public.subscription_event_high_water_marks IS
  'R43 one deterministic Stripe subscription event high-water tuple per user and TEST/LIVE mode.';
COMMENT ON FUNCTION public.apply_stripe_subscription_event(
  text, bigint, text, text, text, text, uuid, text, text, text,
  timestamptz, boolean
) IS
  'R43 applies subscription events only when their global user+mode tuple advances and preserves active/trialing scheduled-cancellation entitlement through the recorded period end.';

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
  IF NULLIF(btrim(p_event_id), '') IS NULL
     OR p_event_created IS NULL OR p_event_created < 0
     OR p_stripe_mode NOT IN ('test', 'live')
     OR NULLIF(btrim(p_subscription_id), '') IS NULL
     OR p_outcome NOT IN ('succeeded', 'failed') THEN
    RAISE EXCEPTION 'SUBSCRIPTION_INVOICE_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT state.* INTO v_state
  FROM public.stripe_subscription_states AS state
  WHERE state.stripe_subscription_id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true, 'applied', false, 'action', 'subscription_not_seen_yet'
    );
  END IF;
  IF v_state.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'SUBSCRIPTION_INVOICE_MODE_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  -- Match the core transition's global lock order. This prevents invoice A and
  -- subscription B from taking subscription/user locks in opposite directions.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'stripe-subscription-user:' || v_state.user_id::text || ':' || p_stripe_mode,
    0
  ));
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
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_stripe_subscription_invoice_event(
  text, bigint, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.apply_stripe_subscription_invoice_event(
  text, bigint, text, text, text
) IS
  'R43 maps invoice success/failure into the globally ordered subscription transition using user-before-subscription locking.';

CREATE OR REPLACE FUNCTION public.finalize_booking_payment_success(
  p_booking_id uuid,
  p_stripe_payment_intent_id text,
  p_payment_kind text,
  p_paid_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_payment public.booking_payments%ROWTYPE;
  v_has_outstanding_installments boolean := false;
  v_captured_total_cents bigint := 0;
  v_refunded_total_cents bigint := 0;
  v_retained_total_cents bigint := 0;
  v_target_payment_status text;
  v_installment_count integer := 0;
  v_session_count integer := 0;
  v_note text;
BEGIN
  IF p_booking_id IS NULL
     OR NULLIF(trim(p_stripe_payment_intent_id), '') IS NULL
     OR p_payment_kind NOT IN ('full', 'installment')
     OR p_paid_at IS NULL THEN
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

  PERFORM 1
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

  IF v_payment.status IN ('partially_refunded', 'refunded') THEN
    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'action', 'refund_ignored',
      'shouldDeliverConfirmation', false,
      'bookingPaymentStatus', v_booking.payment_status,
      'ledgerStatus', v_payment.status
    );
  END IF;

  IF v_payment.status NOT IN (
    'pending', 'processing', 'failed', 'canceled', 'cancelled',
    'succeeded', 'completed'
  ) THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_LEDGER_CONFLICT:%', v_payment.status
      USING ERRCODE = '55000';
  END IF;

  -- Keep R34's common booking -> payments -> installments -> sessions lock order.
  PERFORM 1
  FROM public.installment_payments AS installment
  WHERE installment.booking_id = p_booking_id
  ORDER BY installment.id
  FOR UPDATE;

  PERFORM 1
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
  ORDER BY session.id
  FOR UPDATE;

  UPDATE public.booking_payments
  SET status = 'succeeded', updated_at = GREATEST(updated_at, p_paid_at)
  WHERE id = v_payment.id;

  IF p_payment_kind = 'installment' THEN
    IF EXISTS (
      SELECT 1
      FROM public.installment_payments AS installment
      WHERE installment.booking_id = p_booking_id
        AND installment.installment_number = 1
        AND installment.status IN ('partially_refunded', 'refunded')
    ) THEN
      RAISE EXCEPTION 'PAYMENT_SUCCESS_INSTALLMENT_REFUND_CONFLICT'
        USING ERRCODE = '55000';
    END IF;

    UPDATE public.installment_payments AS installment
    SET
      status = 'paid',
      stripe_payment_intent_id = COALESCE(
        installment.stripe_payment_intent_id,
        p_stripe_payment_intent_id
      ),
      paid_at = COALESCE(installment.paid_at, p_paid_at),
      updated_at = GREATEST(installment.updated_at, p_paid_at)
    WHERE installment.booking_id = p_booking_id
      AND installment.installment_number = 1
      AND (
        installment.stripe_payment_intent_id IS NULL
        OR installment.stripe_payment_intent_id = p_stripe_payment_intent_id
      )
      AND installment.status IN (
        'pending', 'processing', 'failed', 'cancelled', 'canceled', 'paid'
      );
    GET DIAGNOSTICS v_installment_count = ROW_COUNT;

    IF v_installment_count <> 1 THEN
      RAISE EXCEPTION 'PAYMENT_SUCCESS_INSTALLMENT_LEDGER_MISSING'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_payment_sessions AS session
    WHERE session.booking_id = p_booking_id
      AND (
        session.stripe_payment_intent_id IS NULL
        OR session.stripe_payment_intent_id = p_stripe_payment_intent_id
      )
      AND session.payment_status IN ('partially_refunded', 'refunded')
  ) THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_SESSION_REFUND_CONFLICT'
      USING ERRCODE = '55000';
  END IF;

  UPDATE public.whatsapp_payment_sessions AS session
  SET
    payment_status = 'paid',
    stripe_payment_intent_id = COALESCE(
      session.stripe_payment_intent_id,
      p_stripe_payment_intent_id
    ),
    updated_at = GREATEST(session.updated_at, p_paid_at)
  WHERE session.booking_id = p_booking_id
    AND (
      session.stripe_payment_intent_id IS NULL
      OR session.stripe_payment_intent_id = p_stripe_payment_intent_id
    )
    AND session.payment_status IN (
      'pending', 'processing', 'failed', 'cancelled', 'canceled', 'paid'
    );
  GET DIAGNOSTICS v_session_count = ROW_COUNT;

  IF p_payment_kind = 'installment' AND v_session_count <> 1 THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_SESSION_LEDGER_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_payment_kind = 'installment' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.installment_payments AS installment
      WHERE installment.booking_id = p_booking_id
        AND installment.status NOT IN ('paid', 'refunded')
    )
    INTO v_has_outstanding_installments;
  END IF;

  SELECT
    COALESCE(sum(payment.amount_cents), 0)::bigint,
    COALESCE(sum(COALESCE(payment.refund_amount_cents, 0)), 0)::bigint
  INTO v_captured_total_cents, v_refunded_total_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  v_retained_total_cents := GREATEST(
    v_captured_total_cents - v_refunded_total_cents,
    0
  );

  -- R43: is_deleted is a terminal business state just like cancellation. Provider
  -- capture still reaches every payment ledger, but the booking is never confirmed
  -- or surfaced for confirmation delivery after its soft deletion committed first.
  IF v_booking.status IN ('cancelled', 'completed', 'no-show')
     OR COALESCE(v_booking.is_deleted, false)
     OR v_booking.payment_status = 'refund_required' THEN
    IF v_retained_total_cents > 0 THEN
      IF v_booking.payment_status IS DISTINCT FROM 'refund_required' THEN
        v_note := format(
          '[R43 %s] Stripe success for PI %s landed after booking status=%s is_deleted=%s; booking was not resurrected and manual refund is required.',
          p_paid_at,
          p_stripe_payment_intent_id,
          v_booking.status,
          COALESCE(v_booking.is_deleted, false)
        );
      END IF;

      UPDATE public.bookings AS booking
      SET
        payment_status = 'refund_required',
        internal_notes = CASE
          WHEN v_note IS NULL THEN booking.internal_notes
          ELSE trim(
            BOTH E'\n' FROM COALESCE(booking.internal_notes, '') || E'\n' || v_note
          )
        END,
        updated_at = GREATEST(booking.updated_at, p_paid_at)
      WHERE booking.id = p_booking_id;

      RETURN jsonb_build_object(
        'success', true,
        'applied', true,
        'action', 'refund_required',
        'shouldDeliverConfirmation', false,
        'bookingPaymentStatus', 'refund_required',
        'capturedTotalCents', v_captured_total_cents,
        'refundedTotalCents', v_refunded_total_cents,
        'retainedTotalCents', v_retained_total_cents
      );
    END IF;

    UPDATE public.bookings AS booking
    SET
      payment_status = 'refunded',
      updated_at = GREATEST(booking.updated_at, p_paid_at)
    WHERE booking.id = p_booking_id;

    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'action', 'refund_ignored',
      'shouldDeliverConfirmation', false,
      'bookingPaymentStatus', 'refunded',
      'capturedTotalCents', v_captured_total_cents,
      'refundedTotalCents', v_refunded_total_cents,
      'retainedTotalCents', v_retained_total_cents
    );
  END IF;

  IF v_refunded_total_cents > 0 THEN
    v_target_payment_status := CASE
      WHEN v_retained_total_cents = 0 THEN 'refunded'
      ELSE 'partially_refunded'
    END;

    UPDATE public.bookings AS booking
    SET
      payment_status = v_target_payment_status,
      updated_at = GREATEST(booking.updated_at, p_paid_at)
    WHERE booking.id = p_booking_id;

    RETURN jsonb_build_object(
      'success', true,
      'applied', true,
      'action', 'refund_state_preserved',
      'shouldDeliverConfirmation', false,
      'bookingPaymentStatus', v_target_payment_status,
      'capturedTotalCents', v_captured_total_cents,
      'refundedTotalCents', v_refunded_total_cents,
      'retainedTotalCents', v_retained_total_cents
    );
  END IF;

  v_target_payment_status := CASE
    WHEN p_payment_kind = 'installment' AND v_has_outstanding_installments
      THEN 'partial'
    ELSE 'paid'
  END;

  UPDATE public.bookings AS booking
  SET
    payment_status = v_target_payment_status,
    status = 'confirmed',
    updated_at = GREATEST(booking.updated_at, p_paid_at)
  WHERE booking.id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'applied', true,
    'action', 'confirmed',
    'shouldDeliverConfirmation', true,
    'bookingPaymentStatus', v_target_payment_status,
    'hasOutstandingInstallments', v_has_outstanding_installments,
    'capturedTotalCents', v_captured_total_cents,
    'refundedTotalCents', v_refunded_total_cents,
    'retainedTotalCents', v_retained_total_cents
  );
END;
$function$;

-- R38's v2 wrapper remains the only service-role entrypoint and supplies the
-- server-authoritative TEST/LIVE mode before calling this owner-internal function.
REVOKE ALL ON FUNCTION public.finalize_booking_payment_success(
  uuid, text, text, timestamptz
) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.finalize_booking_payment_success(
  uuid, text, text, timestamptz
) IS
  'R43 atomically records Stripe success while treating cancellation, completion, no-show, soft deletion and refund-required state as terminal.';
