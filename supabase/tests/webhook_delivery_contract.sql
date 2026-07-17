\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id,
  email,
  aud,
  role,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-00000000d101',
    'webhook-owner-a@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Webhook Owner A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-00000000d102',
    'webhook-owner-b@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Webhook Owner B"}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES
  (
    '00000000-0000-0000-0000-00000000e101',
    '00000000-0000-0000-0000-00000000d101',
    'Webhook Contract A',
    'webhook-contract-a',
    true
  ),
  (
    '00000000-0000-0000-0000-00000000e102',
    '00000000-0000-0000-0000-00000000d102',
    'Webhook Contract B',
    'webhook-contract-b',
    true
  ),
  (
    '00000000-0000-0000-0000-00000000e103',
    '00000000-0000-0000-0000-00000000d101',
    'Webhook Contract No Endpoint',
    'webhook-contract-no-endpoint',
    true
  );

INSERT INTO public.webhook_endpoints (
  id,
  calendar_id,
  webhook_url,
  is_active
)
VALUES
  (
    '00000000-0000-0000-0000-00000000f101',
    '00000000-0000-0000-0000-00000000e101',
    'https://success.example.invalid/webhook',
    true
  ),
  (
    '00000000-0000-0000-0000-00000000f102',
    '00000000-0000-0000-0000-00000000e101',
    'https://retry.example.invalid/webhook',
    true
  ),
  (
    '00000000-0000-0000-0000-00000000f103',
    '00000000-0000-0000-0000-00000000e102',
    'https://foreign.example.invalid/webhook',
    true
  );

INSERT INTO public.webhook_events (
  id,
  calendar_id,
  event_type,
  payload,
  status
)
VALUES
  (
    '00000000-0000-0000-0000-00000000a101',
    '00000000-0000-0000-0000-00000000e101',
    'contract.created',
    '{"tenant":"a"}'::jsonb,
    'pending'
  ),
  (
    '00000000-0000-0000-0000-00000000a102',
    '00000000-0000-0000-0000-00000000e102',
    'contract.created',
    '{"tenant":"b"}'::jsonb,
    'pending'
  ),
  (
    '00000000-0000-0000-0000-00000000a103',
    '00000000-0000-0000-0000-00000000e103',
    'contract.no_endpoint',
    '{"tenant":"a"}'::jsonb,
    'pending'
  );

DO $test$
DECLARE
  v_count integer;
  v_status text;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.webhook_deliveries
  WHERE event_id = '00000000-0000-0000-0000-00000000a101';
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'expected two per-endpoint deliveries, got %', v_count;
  END IF;

  SELECT status INTO v_status
  FROM public.webhook_events
  WHERE id = '00000000-0000-0000-0000-00000000a103';
  IF v_status <> 'failed' THEN
    RAISE EXCEPTION 'event without endpoint must fail closed, got %', v_status;
  END IF;
END;
$test$;

CREATE TEMP TABLE first_claim ON COMMIT DROP AS
SELECT *
FROM public.claim_webhook_deliveries(
  '00000000-0000-0000-0000-00000000d101',
  '00000000-0000-0000-0000-00000000e101',
  NULL,
  false,
  25
);

CREATE TEMP TABLE concurrent_claim ON COMMIT DROP AS
SELECT *
FROM public.claim_webhook_deliveries(
  '00000000-0000-0000-0000-00000000d101',
  '00000000-0000-0000-0000-00000000e101',
  NULL,
  false,
  25
);

DO $test$
DECLARE
  v_first integer;
  v_second integer;
BEGIN
  SELECT count(*) INTO v_first FROM first_claim;
  SELECT count(*) INTO v_second FROM concurrent_claim;
  IF v_first <> 2 OR v_second <> 0 THEN
    RAISE EXCEPTION 'atomic claim failed: first %, second %', v_first, v_second;
  END IF;

  IF EXISTS (
    SELECT 1 FROM first_claim WHERE delivery_claim_token IS NULL
  ) THEN
    RAISE EXCEPTION 'claim token was not assigned';
  END IF;
END;
$test$;

SELECT public.complete_webhook_delivery(
  delivery_id,
  delivery_claim_token,
  true,
  200,
  NULL
)
FROM first_claim
WHERE endpoint_id = '00000000-0000-0000-0000-00000000f101';

SELECT public.complete_webhook_delivery(
  delivery_id,
  delivery_claim_token,
  false,
  503,
  'http_503'
)
FROM first_claim
WHERE endpoint_id = '00000000-0000-0000-0000-00000000f102';

DO $test$
DECLARE
  v_status text;
  v_sent integer;
  v_failed integer;
BEGIN
  SELECT status INTO v_status
  FROM public.webhook_events
  WHERE id = '00000000-0000-0000-0000-00000000a101';

  SELECT
    count(*) FILTER (WHERE status = 'sent'),
    count(*) FILTER (WHERE status = 'failed')
  INTO v_sent, v_failed
  FROM public.webhook_deliveries
  WHERE event_id = '00000000-0000-0000-0000-00000000a101';

  IF v_status <> 'pending' OR v_sent <> 1 OR v_failed <> 1 THEN
    RAISE EXCEPTION
      'partial delivery was hidden: event %, sent %, failed %',
      v_status,
      v_sent,
      v_failed;
  END IF;
END;
$test$;

CREATE TEMP TABLE early_retry ON COMMIT DROP AS
SELECT *
FROM public.claim_webhook_deliveries(
  '00000000-0000-0000-0000-00000000d101',
  '00000000-0000-0000-0000-00000000e101',
  NULL,
  false,
  25
);

DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM early_retry) THEN
    RAISE EXCEPTION 'automatic retry ignored next_attempt_at';
  END IF;
END;
$test$;

CREATE TEMP TABLE manual_retry ON COMMIT DROP AS
SELECT *
FROM public.claim_webhook_deliveries(
  '00000000-0000-0000-0000-00000000d101',
  '00000000-0000-0000-0000-00000000e101',
  '00000000-0000-0000-0000-00000000a101',
  true,
  25
);

DO $test$
DECLARE
  v_count integer;
  v_endpoint uuid;
BEGIN
  SELECT count(*), (array_agg(endpoint_id ORDER BY endpoint_id))[1]
  INTO v_count, v_endpoint
  FROM manual_retry;

  IF v_count <> 1
     OR v_endpoint <> '00000000-0000-0000-0000-00000000f102' THEN
    RAISE EXCEPTION
      'manual retry must claim only failed endpoint: count %, endpoint %',
      v_count,
      v_endpoint;
  END IF;
END;
$test$;

SELECT public.complete_webhook_delivery(
  delivery_id,
  delivery_claim_token,
  true,
  204,
  NULL
)
FROM manual_retry;

DO $test$
DECLARE
  v_status text;
  v_stale jsonb;
BEGIN
  SELECT status INTO v_status
  FROM public.webhook_events
  WHERE id = '00000000-0000-0000-0000-00000000a101';
  IF v_status <> 'sent' THEN
    RAISE EXCEPTION 'event did not become sent after every endpoint passed: %', v_status;
  END IF;

  SELECT public.complete_webhook_delivery(
    delivery_id,
    delivery_claim_token,
    true,
    200,
    NULL
  )
  INTO v_stale
  FROM first_claim
  WHERE endpoint_id = '00000000-0000-0000-0000-00000000f102';

  IF v_stale->>'accepted' <> 'false'
     OR v_stale->>'reason' <> 'claim_not_current' THEN
    RAISE EXCEPTION 'stale claim token was accepted: %', v_stale;
  END IF;
END;
$test$;

DO $test$
BEGIN
  BEGIN
    PERFORM *
    FROM public.claim_webhook_deliveries(
      '00000000-0000-0000-0000-00000000d101',
      '00000000-0000-0000-0000-00000000e102',
      NULL,
      false,
      25
    );
    RAISE EXCEPTION 'foreign calendar claim unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;

CREATE TEMP TABLE hidden_foreign_event ON COMMIT DROP AS
SELECT *
FROM public.claim_webhook_deliveries(
  '00000000-0000-0000-0000-00000000d101',
  NULL,
  '00000000-0000-0000-0000-00000000a102',
  false,
  25
);

DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM hidden_foreign_event) THEN
    RAISE EXCEPTION 'foreign event was exposed through event-id claim';
  END IF;
END;
$test$;

DO $test$
BEGIN
  IF has_function_privilege(
    'anon',
    'public.claim_webhook_deliveries(uuid,uuid,uuid,boolean,integer)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.claim_webhook_deliveries(uuid,uuid,uuid,boolean,integer)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.claim_webhook_deliveries(uuid,uuid,uuid,boolean,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'claim_webhook_deliveries grants are not service-only';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'public.complete_webhook_delivery(uuid,uuid,boolean,integer,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.complete_webhook_delivery(uuid,uuid,boolean,integer,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'complete_webhook_delivery grants are not service-only';
  END IF;

  IF has_table_privilege('anon', 'public.webhook_deliveries', 'SELECT')
     OR has_table_privilege('authenticated', 'public.webhook_deliveries', 'INSERT')
     OR has_table_privilege('authenticated', 'public.webhook_deliveries', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.webhook_deliveries', 'DELETE')
     OR NOT has_table_privilege('authenticated', 'public.webhook_deliveries', 'SELECT') THEN
    RAISE EXCEPTION 'webhook_deliveries client grants are not read-only owner scoped';
  END IF;

  IF to_regprocedure('public.process_webhook_queue()') IS NOT NULL
     OR to_regprocedure('public.process_booking_webhook_events()') IS NOT NULL
     OR to_regprocedure('public.resend_all_booking_webhooks(uuid)') IS NOT NULL
     OR to_regprocedure('public.link_existing_bookings_to_whatsapp()') IS NOT NULL THEN
    RAISE EXCEPTION 'unsafe legacy webhook mutator still exists';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.handle_booking_webhook_trigger()',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.handle_booking_webhook_trigger()',
    'EXECUTE'
  ) OR has_function_privilege(
    'service_role',
    'public.handle_booking_webhook_trigger()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'booking trigger implementation is directly API-callable';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc procedure
    JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname = 'handle_booking_webhook_trigger'
      AND pg_get_functiondef(procedure.oid) ILIKE '%RAISE NOTICE%'
  ) THEN
    RAISE EXCEPTION 'booking trigger still contains customer-data notice logging';
  END IF;
END;
$test$;

SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000d101';
SET LOCAL ROLE authenticated;

DO $test$
DECLARE
  v_own integer;
  v_foreign integer;
BEGIN
  SELECT count(*) INTO v_own
  FROM public.webhook_deliveries delivery
  JOIN public.webhook_events event ON event.id = delivery.event_id
  WHERE event.calendar_id = '00000000-0000-0000-0000-00000000e101';

  SELECT count(*) INTO v_foreign
  FROM public.webhook_deliveries delivery
  JOIN public.webhook_events event ON event.id = delivery.event_id
  WHERE event.calendar_id = '00000000-0000-0000-0000-00000000e102';

  IF v_own <> 2 OR v_foreign <> 0 THEN
    RAISE EXCEPTION 'delivery RLS mismatch: own %, foreign %', v_own, v_foreign;
  END IF;

  BEGIN
    UPDATE public.webhook_deliveries
    SET status = 'sent'
    WHERE event_id = '00000000-0000-0000-0000-00000000a101';
    RAISE EXCEPTION 'authenticated delivery mutation unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.webhook_events (
      calendar_id,
      event_type,
      payload,
      status
    )
    VALUES (
      '00000000-0000-0000-0000-00000000e101',
      'forged.client',
      '{}'::jsonb,
      'sent'
    );
    RAISE EXCEPTION 'authenticated event forgery unexpectedly succeeded';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;

RESET ROLE;

ROLLBACK;

SELECT 'WEBHOOK_DELIVERY_CONTRACT_PASS' AS result;
