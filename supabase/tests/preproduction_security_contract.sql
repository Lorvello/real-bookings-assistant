\set ON_ERROR_STOP on

BEGIN;

DO $test$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)
  INTO v_count
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND grantee IN ('anon', 'authenticated', 'service_role')
    AND privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN');

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'API roles retain % dangerous table privileges', v_count;
  END IF;

  SELECT count(*)
  INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relname <> ALL (ARRAY[
      'whatsapp_payment_attempts',
      'booking_payment_provider_reservations',
      'booking_payment_provider_cleanup_jobs'
    ]::text[])
    AND (
      NOT has_table_privilege('service_role', c.oid, 'SELECT')
      OR NOT has_table_privilege('service_role', c.oid, 'INSERT')
      OR NOT has_table_privilege('service_role', c.oid, 'UPDATE')
      OR NOT has_table_privilege('service_role', c.oid, 'DELETE')
    );

  IF v_count <> 0 THEN
    RAISE EXCEPTION 'service_role lacks normal DML on % public base tables', v_count;
  END IF;

  SELECT count(*)
  INTO v_count
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND table_name = ANY (ARRAY[
      'whatsapp_payment_attempts',
      'booking_payment_provider_reservations',
      'booking_payment_provider_cleanup_jobs'
    ]::text[])
    AND grantee IN ('anon', 'authenticated', 'service_role');

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'private payment/provider ledgers expose % direct API privileges',
      v_count;
  END IF;

  IF has_function_privilege(
       'anon',
       'public.claim_whatsapp_payment_attempt(uuid,uuid,uuid,uuid,integer,text,text,text,jsonb,text,timestamp with time zone,integer)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.claim_whatsapp_payment_attempt(uuid,uuid,uuid,uuid,integer,text,text,text,jsonb,text,timestamp with time zone,integer)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role',
       'public.claim_whatsapp_payment_attempt(uuid,uuid,uuid,uuid,integer,text,text,text,jsonb,text,timestamp with time zone,integer)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'anon',
       'public.finalize_whatsapp_payment_attempt(uuid,uuid,text,text,text,text)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.finalize_whatsapp_payment_attempt(uuid,uuid,text,text,text,text)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role',
       'public.finalize_whatsapp_payment_attempt(uuid,uuid,text,text,text,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'private WhatsApp payment-attempt RPC grants are incorrect';
  END IF;

  IF has_table_privilege('anon', 'public.contact_meetings', 'INSERT')
     OR has_table_privilege('authenticated', 'public.contact_meetings', 'INSERT')
  THEN
    RAISE EXCEPTION 'contact_meetings direct client INSERT is still granted';
  END IF;

  IF NOT has_table_privilege(
    'authenticated',
    'public.contact_meetings',
    'SELECT'
  ) THEN
    RAISE EXCEPTION 'authenticated admin SELECT grant is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_meetings'
      AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'contact_meetings still has a client INSERT policy';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.reserve_contact_meeting(uuid,text,text,text,text,text,text,text,date,time without time zone)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.reserve_contact_meeting(uuid,text,text,text,text,text,text,text,date,time without time zone)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.reserve_contact_meeting(uuid,text,text,text,text,text,text,text,date,time without time zone)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'contact meeting reservation grants are incorrect';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.admin_update_user_subscription_safe(uuid,text,text,text,text,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated',
    'public.admin_update_user_subscription_safe(uuid,text,text,text,text,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'service_role',
    'public.admin_update_user_subscription_safe(uuid,text,text,text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'safe admin update wrapper grants are incorrect';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.admin_apply_developer_status(uuid,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'authenticated',
    'public.admin_apply_developer_status(uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'existing guarded admin RPC grants are incorrect';
  END IF;

  IF to_regprocedure(
    'public.refresh_business_availability_overview()'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'dead business availability refresh RPC still exists';
  END IF;

  IF to_regprocedure('public.trigger_booking_webhook()') IS NOT NULL THEN
    RAISE EXCEPTION 'obsolete booking webhook trigger function still exists';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM pg_trigger t
  WHERE t.tgrelid = 'public.bookings'::regclass
    AND NOT t.tgisinternal
    AND t.tgname = 'booking_webhook_trigger'
    AND t.tgfoid = 'public.handle_booking_webhook_trigger()'::regprocedure;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'canonical booking webhook trigger count is %', v_count;
  END IF;

  IF NOT has_function_privilege(
    'anon',
    'public.get_booking_by_token(text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'anon',
    'public.cancel_booking_by_token(text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'public booking token RPC grants are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.oid IN (
      'public.get_booking_by_token(text)'::regprocedure,
      'public.cancel_booking_by_token(text,text)'::regprocedure
    )
      AND NOT (
        p.prosecdef
        AND p.proconfig @> ARRAY['search_path=""']::text[]
      )
  ) THEN
    RAISE EXCEPTION 'public booking token RPC hardening is incomplete';
  END IF;

  IF has_table_privilege('anon', 'public.bookings', 'SELECT')
     OR has_table_privilege('anon', 'public.bookings_with_period', 'SELECT')
  THEN
    RAISE EXCEPTION 'anon retains a direct full-booking read surface';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM unnest(ARRAY[
    'public.business_intelligence_mv',
    'public.future_insights_mv',
    'public.live_operations_mv',
    'public.performance_efficiency_mv'
  ]) AS protected_relation(name)
  WHERE has_table_privilege('anon', protected_relation.name, 'SELECT')
     OR has_table_privilege(
       'authenticated',
       protected_relation.name,
       'SELECT'
     )
     OR NOT has_table_privilege(
       'service_role',
       protected_relation.name,
       'SELECT'
     );

  IF v_count <> 0 THEN
    RAISE EXCEPTION '% materialized analytics views have unsafe grants', v_count;
  END IF;

  IF NOT has_table_privilege(
    'authenticated',
    'public.payment_settings',
    'SELECT'
  ) OR NOT has_column_privilege(
    'authenticated',
    'public.payment_settings',
    'secure_payments_enabled',
    'UPDATE'
  ) OR has_column_privilege(
    'authenticated',
    'public.payment_settings',
    'platform_fee_percentage',
    'UPDATE'
  ) OR has_column_privilege(
    'authenticated',
    'public.payment_settings',
    'platform_fee_percentage',
    'INSERT'
  ) THEN
    RAISE EXCEPTION 'payment settings client-column grants are incorrect';
  END IF;

  IF NOT has_table_privilege(
    'anon',
    'public.subscription_tiers',
    'SELECT'
  ) OR NOT has_table_privilege(
    'authenticated',
    'public.subscription_tiers',
    'SELECT'
  ) THEN
    RAISE EXCEPTION 'active subscription tier read grants are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payment_settings
    WHERE platform_fee_percentage IS DISTINCT FROM 1.90
  ) THEN
    RAISE EXCEPTION 'a payment settings row does not use the fixed 1.9%% fee';
  END IF;
END;
$test$;

-- Prove the service role can again use a representative product table.
SET LOCAL ROLE service_role;
SELECT count(*) AS service_role_booking_rows FROM public.bookings;
RESET ROLE;

-- Exercise meeting reservation, exact replay, conflict and delivery recording.
SET LOCAL ROLE service_role;
DO $test$
DECLARE
  v_date date := (now() AT TIME ZONE 'Europe/Amsterdam')::date + 1;
  v_result jsonb;
BEGIN
  WHILE extract(isodow FROM v_date) NOT BETWEEN 1 AND 5 LOOP
    v_date := v_date + 1;
  END LOOP;

  v_result := public.reserve_contact_meeting(
    '00000000-0000-0000-0000-00000000c001',
    'Ada Lovelace',
    'ADA@EXAMPLE.INVALID',
    'Analytical Engines',
    'nl',
    'demo',
    'professional',
    'This is a disposable local contract test.',
    v_date,
    TIME '09:00'
  );
  IF v_result->>'success' <> 'true' OR v_result->>'replayed' <> 'false' THEN
    RAISE EXCEPTION 'first meeting reservation failed: %', v_result;
  END IF;

  v_result := public.reserve_contact_meeting(
    '00000000-0000-0000-0000-00000000c001',
    'Ada Lovelace',
    'ada@example.invalid',
    'Analytical Engines',
    'nl',
    'demo',
    'professional',
    'This is a disposable local contract test.',
    v_date,
    TIME '09:00'
  );
  IF v_result->>'success' <> 'true' OR v_result->>'replayed' <> 'true' THEN
    RAISE EXCEPTION 'exact meeting replay failed: %', v_result;
  END IF;

  v_result := public.reserve_contact_meeting(
    '00000000-0000-0000-0000-00000000c002',
    'Grace Hopper',
    'grace@example.invalid',
    NULL,
    'us',
    'demo',
    NULL,
    'This is another disposable local contract test.',
    v_date,
    TIME '09:00'
  );
  IF v_result->>'error_code' <> 'SLOT_UNAVAILABLE' THEN
    RAISE EXCEPTION 'slot conflict was not rejected: %', v_result;
  END IF;

  v_result := public.reserve_contact_meeting(
    '00000000-0000-0000-0000-00000000c001',
    'Changed Name',
    'ada@example.invalid',
    'Analytical Engines',
    'nl',
    'demo',
    'professional',
    'This is a disposable local contract test.',
    v_date,
    TIME '09:00'
  );
  IF v_result->>'error_code' <> 'IDEMPOTENCY_CONFLICT' THEN
    RAISE EXCEPTION 'idempotency conflict was not rejected: %', v_result;
  END IF;

  v_result := public.record_contact_meeting_delivery(
    '00000000-0000-0000-0000-00000000c001',
    'recorded',
    NULL
  );
  IF v_result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'meeting delivery result was not recorded: %', v_result;
  END IF;
END;
$test$;
RESET ROLE;

-- Prove that the real booking insert path works, emits exactly one canonical
-- webhook event and preserves both RLS tenant isolation and exact-token access.
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
    '00000000-0000-0000-0000-00000000b101',
    'booking-owner-a@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Booking Owner A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-00000000b102',
    'booking-owner-b@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Booking Owner B"}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES
  (
    '00000000-0000-0000-0000-00000000c101',
    '00000000-0000-0000-0000-00000000b101',
    'Booking Contract A',
    'booking-contract-a',
    true
  ),
  (
    '00000000-0000-0000-0000-00000000c102',
    '00000000-0000-0000-0000-00000000b102',
    'Booking Contract B',
    'booking-contract-b',
    true
  );

INSERT INTO public.service_types (
  id,
  calendar_id,
  name,
  duration,
  price,
  is_active
)
VALUES
  (
    '00000000-0000-0000-0000-00000000d101',
    '00000000-0000-0000-0000-00000000c101',
    'Contract Service A',
    30,
    25,
    true
  ),
  (
    '00000000-0000-0000-0000-00000000d102',
    '00000000-0000-0000-0000-00000000c102',
    'Contract Service B',
    30,
    30,
    true
  );

INSERT INTO public.bookings (
  id,
  calendar_id,
  service_type_id,
  customer_name,
  customer_email,
  start_time,
  end_time,
  confirmation_token
)
VALUES
  (
    '00000000-0000-0000-0000-00000000e101',
    '00000000-0000-0000-0000-00000000c101',
    '00000000-0000-0000-0000-00000000d101',
    'Contract Customer A',
    'customer-a@example.invalid',
    now() + interval '7 days',
    now() + interval '7 days 30 minutes',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    '00000000-0000-0000-0000-00000000e102',
    '00000000-0000-0000-0000-00000000c102',
    '00000000-0000-0000-0000-00000000d102',
    'Contract Customer B',
    'customer-b@example.invalid',
    now() + interval '8 days',
    now() + interval '8 days 30 minutes',
    '22222222-2222-4222-8222-222222222222'
  );

DO $test$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*)
  INTO v_count
  FROM public.webhook_events
  WHERE event_type = 'booking.created'
    AND payload->>'booking_id' IN (
      '00000000-0000-0000-0000-00000000e101',
      '00000000-0000-0000-0000-00000000e102'
    );

  IF v_count <> 2 THEN
    RAISE EXCEPTION 'two booking inserts emitted % canonical webhook events', v_count;
  END IF;
END;
$test$;

SET LOCAL ROLE anon;
DO $test$
DECLARE
  v_booking_id uuid;
  v_count integer;
  v_result jsonb;
BEGIN
  SELECT id
  INTO v_booking_id
  FROM public.get_booking_by_token(
    '11111111-1111-4111-8111-111111111111'
  );
  IF v_booking_id <> '00000000-0000-0000-0000-00000000e101'::uuid THEN
    RAISE EXCEPTION 'exact token did not return booking A';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.get_booking_by_token(
    '99999999-9999-4999-8999-999999999999'
  );
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'unknown token returned % rows', v_count;
  END IF;

  v_result := public.cancel_booking_by_token(
    '11111111-1111-4111-8111-111111111111',
    'Disposable contract cancellation'
  );
  IF v_result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'exact-token cancellation failed: %', v_result;
  END IF;
END;
$test$;
RESET ROLE;

DO $test$
DECLARE
  v_status_a text;
  v_status_b text;
  v_cancel_events integer;
BEGIN
  SELECT status INTO v_status_a
  FROM public.bookings
  WHERE id = '00000000-0000-0000-0000-00000000e101';

  SELECT status INTO v_status_b
  FROM public.bookings
  WHERE id = '00000000-0000-0000-0000-00000000e102';

  IF v_status_a <> 'cancelled' OR v_status_b <> 'confirmed' THEN
    RAISE EXCEPTION 'token cancellation crossed booking boundary: A %, B %',
      v_status_a, v_status_b;
  END IF;

  SELECT count(*)
  INTO v_cancel_events
  FROM public.webhook_events
  WHERE event_type = 'booking.cancelled'
    AND payload->>'booking_id' = '00000000-0000-0000-0000-00000000e101';

  IF v_cancel_events <> 1 THEN
    RAISE EXCEPTION 'booking cancellation emitted % canonical webhook events',
      v_cancel_events;
  END IF;
END;
$test$;

SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000b101';
SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  v_own_count integer;
  v_foreign_count integer;
BEGIN
  SELECT count(*) INTO v_own_count
  FROM public.bookings
  WHERE calendar_id = '00000000-0000-0000-0000-00000000c101';

  SELECT count(*) INTO v_foreign_count
  FROM public.bookings
  WHERE calendar_id = '00000000-0000-0000-0000-00000000c102';

  IF v_own_count <> 1 OR v_foreign_count <> 0 THEN
    RAISE EXCEPTION 'owner A booking isolation failed: own %, foreign %',
      v_own_count, v_foreign_count;
  END IF;
END;
$test$;
RESET ROLE;

-- Create disposable identities for authenticated-admin behavior. The auth trigger
-- creates matching public.users rows; the transaction is rolled back at the end.
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
    '00000000-0000-0000-0000-00000000a001',
    'admin-contract@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Contract"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-00000000a002',
    'target-contract@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Target Contract"}'::jsonb,
    now(),
    now()
  );

INSERT INTO public.user_roles(user_id, role)
VALUES ('00000000-0000-0000-0000-00000000a001', 'admin');

SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a001';
SET LOCAL ROLE authenticated;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.admin_update_user_subscription_safe(
    '00000000-0000-0000-0000-00000000a002',
    'active',
    'professional',
    NULL,
    NULL,
    'Contract Target',
    'test'
  );
  IF v_result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'authenticated admin update failed: %', v_result;
  END IF;

  v_result := public.admin_get_user_subscription_details_safe(
    '00000000-0000-0000-0000-00000000a002'
  );
  IF v_result->>'success' <> 'true' THEN
    RAISE EXCEPTION 'authenticated admin details read failed: %', v_result;
  END IF;
END;
$test$;

RESET ROLE;
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000a002';
SET LOCAL ROLE authenticated;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.admin_get_user_subscription_details_safe(
    '00000000-0000-0000-0000-00000000a001'
  );
  IF v_result->>'success' <> 'false'
     OR v_result->>'error' <> 'Unauthorized: Admin role required'
  THEN
    RAISE EXCEPTION 'non-admin details request did not fail closed: %', v_result;
  END IF;
END;
$test$;

RESET ROLE;

INSERT INTO public.whatsapp_payment_sessions (
  id,
  service_type_id,
  calendar_id,
  booking_id,
  amount_cents,
  currency,
  payment_type,
  installment_plan,
  stripe_session_id,
  payment_status
)
VALUES (
  '00000000-0000-0000-0000-00000000f101',
  '00000000-0000-0000-0000-00000000d101',
  '00000000-0000-0000-0000-00000000c101',
  '00000000-0000-0000-0000-00000000e101',
  1250,
  'eur',
  'installment',
  '{"type":"preset","preset":"50_50"}'::jsonb,
  'cs_test_contract_001',
  'pending'
);

INSERT INTO public.installment_payments (
  booking_id,
  whatsapp_session_id,
  installment_number,
  total_installments,
  amount_cents,
  currency,
  due_date,
  payment_timing,
  payment_method,
  status
)
VALUES
  (
    '00000000-0000-0000-0000-00000000e101',
    '00000000-0000-0000-0000-00000000f101',
    1,
    2,
    1250,
    'eur',
    now(),
    'now',
    'online',
    'pending'
  ),
  (
    '00000000-0000-0000-0000-00000000e101',
    '00000000-0000-0000-0000-00000000f101',
    2,
    2,
    1250,
    'eur',
    now() + interval '7 days',
    'appointment',
    'cash',
    'pending'
  );

DO $test$
BEGIN
  BEGIN
    INSERT INTO public.whatsapp_payment_sessions (
      service_type_id,
      calendar_id,
      booking_id,
      amount_cents,
      stripe_session_id
    )
    VALUES (
      '00000000-0000-0000-0000-00000000d101',
      '00000000-0000-0000-0000-00000000c101',
      '00000000-0000-0000-0000-00000000e101',
      1250,
      'cs_test_contract_duplicate'
    );
    RAISE EXCEPTION 'duplicate payment session booking_id was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO public.installment_payments (
      booking_id,
      whatsapp_session_id,
      installment_number,
      total_installments,
      amount_cents,
      payment_timing,
      payment_method
    )
    VALUES (
      '00000000-0000-0000-0000-00000000e101',
      '00000000-0000-0000-0000-00000000f101',
      1,
      2,
      1250,
      'now',
      'online'
    );
    RAISE EXCEPTION 'duplicate installment position was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END;
$test$;

DO $test$
DECLARE
  v_first_claim jsonb;
  v_second_claim jsonb;
  v_after_delivery jsonb;
  v_finalized boolean;
BEGIN
  v_first_claim := public.claim_booking_confirmation_delivery(
    '00000000-0000-0000-0000-00000000e102'
  );
  IF v_first_claim->>'claimed' <> 'true'
     OR v_first_claim->>'status' <> 'sending'
  THEN
    RAISE EXCEPTION 'first confirmation claim failed: %', v_first_claim;
  END IF;

  v_second_claim := public.claim_booking_confirmation_delivery(
    '00000000-0000-0000-0000-00000000e102'
  );
  IF v_second_claim->>'claimed' <> 'false'
     OR v_second_claim->>'status' <> 'sending'
  THEN
    RAISE EXCEPTION 'concurrent confirmation claim was not blocked: %',
      v_second_claim;
  END IF;

  v_finalized := public.finalize_booking_confirmation_delivery(
    '00000000-0000-0000-0000-00000000e102',
    (v_first_claim->>'claim_token')::uuid,
    'delivered',
    're_contract_message_001',
    NULL
  );
  IF v_finalized IS NOT TRUE THEN
    RAISE EXCEPTION 'confirmation delivery did not finalize';
  END IF;

  v_after_delivery := public.claim_booking_confirmation_delivery(
    '00000000-0000-0000-0000-00000000e102'
  );
  IF v_after_delivery->>'claimed' <> 'false'
     OR v_after_delivery->>'status' <> 'delivered'
  THEN
    RAISE EXCEPTION 'delivered confirmation was claimable again: %',
      v_after_delivery;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_status text;
  v_delivery_status text;
  v_target_tier public.subscription_tier;
BEGIN
  SELECT status, delivery_status
  INTO v_status, v_delivery_status
  FROM public.contact_meetings
  WHERE submission_id = '00000000-0000-0000-0000-00000000c001';

  IF v_status <> 'scheduled' OR v_delivery_status <> 'recorded' THEN
    RAISE EXCEPTION
      'meeting final state mismatch: status %, delivery %',
      v_status,
      v_delivery_status;
  END IF;

  SELECT subscription_tier
  INTO v_target_tier
  FROM public.users
  WHERE id = '00000000-0000-0000-0000-00000000a002';

  IF v_target_tier <> 'professional'::public.subscription_tier THEN
    RAISE EXCEPTION 'admin update did not persist expected tier: %', v_target_tier;
  END IF;
END;
$test$;

DO $test$
DECLARE
  v_retired text[];
BEGIN
  SELECT array_agg(p.oid::regprocedure::text ORDER BY p.oid::regprocedure::text)
  INTO v_retired
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'admin_generate_mock_data',
      'admin_set_user_status',
      'update_user_status',
      'validate_payment_security',
      'record_payment_attempt',
      'check_public_rate_limit',
      'check_payment_rate_limit',
      'cleanup_old_whatsapp_data'
    );

  IF v_retired IS NOT NULL THEN
    RAISE EXCEPTION 'retired unsafe RPCs still exist: %', v_retired;
  END IF;
END;
$test$;

ROLLBACK;

\echo 'PREPRODUCTION_SECURITY_CONTRACT_PASS'
