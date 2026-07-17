\set ON_ERROR_STOP on

BEGIN;

CREATE TEMP TABLE first_claim ON COMMIT DROP AS
SELECT public.claim_stripe_event(
  'evt_r26_a', 'payment_intent.succeeded', 300, 'test'
) AS result;

DO $test$
DECLARE
  v_first jsonb;
  v_second jsonb;
  v_token uuid;
  v_done boolean;
  v_stale boolean;
BEGIN
  SELECT result INTO v_first FROM first_claim;
  v_second := public.claim_stripe_event(
    'evt_r26_a',
    'payment_intent.succeeded',
    300,
    'test'
  );

  IF v_first->>'claimed' <> 'true'
     OR v_first->>'completed' <> 'false'
     OR v_first->>'claim_token' IS NULL THEN
    RAISE EXCEPTION 'first claim was invalid: %', v_first;
  END IF;

  IF v_second->>'claimed' <> 'false'
     OR v_second->>'reason' <> 'in_progress' THEN
    RAISE EXCEPTION 'concurrent claim was not fenced: %', v_second;
  END IF;

  BEGIN
    PERFORM public.claim_stripe_event(
      'evt_r26_a', 'payment_intent.succeeded', 300, 'live'
    );
    RAISE EXCEPTION 'same event id was accepted in another Stripe mode';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;

  v_token := (v_first->>'claim_token')::uuid;
  v_stale := public.complete_stripe_event(
    'evt_r26_a',
    '00000000-0000-0000-0000-000000000026'
  );
  IF COALESCE(v_stale, false) THEN
    RAISE EXCEPTION 'stale Stripe claim token completed the event';
  END IF;

  v_done := public.complete_stripe_event('evt_r26_a', v_token);
  IF v_done IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'current Stripe claim could not complete';
  END IF;

  v_second := public.claim_stripe_event(
    'evt_r26_a',
    'payment_intent.succeeded',
    300,
    'test'
  );
  IF v_second->>'completed' <> 'true'
     OR v_second->>'reason' <> 'already_completed' THEN
    RAISE EXCEPTION 'completed event was not recognized: %', v_second;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_claim jsonb;
  v_retry jsonb;
  v_failed boolean;
BEGIN
  v_claim := public.claim_stripe_event(
    'evt_r26_b',
    'charge.refunded',
    300,
    'test'
  );
  v_failed := public.fail_stripe_event(
    'evt_r26_b',
    (v_claim->>'claim_token')::uuid,
    'booking_read_failed'
  );
  IF v_failed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'failed Stripe event was not released';
  END IF;

  v_retry := public.claim_stripe_event(
    'evt_r26_b',
    'charge.refunded',
    300,
    'test'
  );
  IF v_retry->>'claimed' <> 'true'
     OR (v_retry->>'attempt_count')::integer <> 2 THEN
    RAISE EXCEPTION 'failed Stripe event was not retryable: %', v_retry;
  END IF;
END;
$test$;

DO $test$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.claim_stripe_event(text,text,integer,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.claim_stripe_event(text,text,integer,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.claim_stripe_event(text,text,integer,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Stripe event claim grants are incorrect';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'STRIPE_EVENT_PROCESSING_CONTRACT_PASS' AS result;
