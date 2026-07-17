\set ON_ERROR_STOP on

BEGIN;

DO $test$
DECLARE
  v_identity_args text;
BEGIN
  IF has_function_privilege(
    'anon',
    'public.commit_public_booking(text,uuid,timestamptz,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.commit_public_booking(text,uuid,timestamptz,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.commit_public_booking(text,uuid,timestamptz,text,text,text,text,text,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'public booking commit grants are incorrect';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.defer_public_booking_payment_on_site(uuid,text,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.defer_public_booking_payment_on_site(uuid,text,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.defer_public_booking_payment_on_site(uuid,text,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'public booking defer-payment grants are incorrect';
  END IF;

  IF has_function_privilege(
    'anon',
    'public.assert_r45_no_active_payable_legacy_bookings()',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.assert_r45_no_active_payable_legacy_bookings()',
    'EXECUTE'
  ) OR has_function_privilege(
    'service_role',
    'public.assert_r45_no_active_payable_legacy_bookings()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'R45 deployment preflight is exposed to API roles';
  END IF;

  SELECT pg_get_function_identity_arguments(proc.oid)
  INTO v_identity_args
  FROM pg_proc AS proc
  JOIN pg_namespace AS namespace ON namespace.oid = proc.pronamespace
  WHERE namespace.nspname = 'public'
    AND proc.proname = 'commit_public_booking';

  IF v_identity_args ILIKE '%end_time%' THEN
    RAISE EXCEPTION 'public booking commit still accepts caller-controlled end_time';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc AS proc
    JOIN pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.proname = 'commit_public_booking'
      AND NOT (
        proc.prosecdef
        AND proc.proconfig @> ARRAY['search_path=""']::text[]
      )
  ) THEN
    RAISE EXCEPTION 'public booking commit hardening is incomplete';
  END IF;
END;
$test$;

INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES (
  '45000000-0000-4000-8000-000000000001',
  'public-booking-policy@example.invalid',
  'authenticated',
  'authenticated',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Public Booking Policy Owner"}'::jsonb,
  now(),
  now()
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active, timezone)
VALUES (
  '45000000-0000-4000-8000-000000000010',
  '45000000-0000-4000-8000-000000000001',
  'Public Booking Policy Contract',
  'public-booking-policy-contract',
  true,
  'Europe/Amsterdam'
);

UPDATE public.calendar_settings
SET minimum_notice_hours = 0,
    booking_window_days = 60,
    buffer_time = 0,
    max_bookings_per_day = NULL
WHERE calendar_id = '45000000-0000-4000-8000-000000000010';

INSERT INTO public.service_types (
  id, calendar_id, name, duration, price, is_active, business_country,
  tax_enabled, tax_code, tax_behavior, applicable_tax_rate, supply_type
)
VALUES (
  '45000000-0000-4000-8000-000000000020',
  '45000000-0000-4000-8000-000000000010',
  'Authoritative 90 minute service',
  90,
  89.95,
  true,
  'NL',
  true,
  'txcd_20030000',
  'exclusive',
  21,
  'in_person'
);

UPDATE public.payment_settings
SET secure_payments_enabled = true,
    payment_required_for_booking = true,
    payment_optional = false,
    enabled_payment_methods = '["ideal","card"]'::jsonb,
    allowed_payment_timing = '["pay_now"]'::jsonb,
    payout_option = 'standard',
    payment_deadline_hours = 24,
    auto_cancel_unpaid_bookings = true
WHERE calendar_id = '45000000-0000-4000-8000-000000000010';

-- The exact migration preflight must block only the unresolved active payable
-- legacy row, report it deterministically, and pass once that row is resolved.
INSERT INTO public.bookings (
  id, calendar_id, service_type_id, customer_name, customer_email,
  start_time, end_time, status, total_price, total_amount_cents,
  payment_currency, payment_required, payment_status, payment_timing,
  booking_duration, service_name, confirmation_token,
  public_booking_policy_snapshot
)
VALUES
  (
    '45000000-0000-4000-8000-000000000030',
    '45000000-0000-4000-8000-000000000010',
    '45000000-0000-4000-8000-000000000020',
    'Legacy Active', 'legacy-active@example.invalid',
    now() + interval '20 days', now() + interval '20 days 90 minutes',
    'pending', 89.95, 8995, 'eur', true, 'pending', 'pay_now',
    90, 'Legacy service', 'r45-legacy-active', NULL
  ),
  (
    '45000000-0000-4000-8000-000000000031',
    '45000000-0000-4000-8000-000000000010',
    '45000000-0000-4000-8000-000000000020',
    'Legacy Paid', 'legacy-paid@example.invalid',
    now() + interval '21 days', now() + interval '21 days 90 minutes',
    'confirmed', 89.95, 8995, 'eur', true, 'paid', 'pay_now',
    90, 'Legacy service', 'r45-legacy-paid', NULL
  ),
  (
    '45000000-0000-4000-8000-000000000032',
    '45000000-0000-4000-8000-000000000010',
    '45000000-0000-4000-8000-000000000020',
    'Legacy Cancelled', 'legacy-cancelled@example.invalid',
    now() + interval '22 days', now() + interval '22 days 90 minutes',
    'cancelled', 89.95, 8995, 'eur', true, 'pending', 'pay_now',
    90, 'Legacy service', 'r45-legacy-cancelled', NULL
  );

DO $test$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.assert_r45_no_active_payable_legacy_bookings();
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'R45_PRECHECK_ACTIVE_PAYABLE_LEGACY_BOOKINGS count=1 sample_ids=45000000-0000-4000-8000-000000000030' THEN
        RAISE EXCEPTION 'R45 preflight error is not deterministic: %', SQLERRM;
      END IF;
      v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'R45 preflight allowed an active payable legacy booking';
  END IF;
END;
$test$;

DELETE FROM public.bookings
WHERE id = '45000000-0000-4000-8000-000000000030';
SELECT public.assert_r45_no_active_payable_legacy_bookings();
DELETE FROM public.bookings
WHERE id IN (
  '45000000-0000-4000-8000-000000000031',
  '45000000-0000-4000-8000-000000000032'
);

DO $test$
DECLARE
  v_date date := current_date
    + (8 - extract(isodow FROM current_date)::integer);
  v_day_of_week integer;
  v_schedule_id uuid;
  v_start timestamptz;
  v_result jsonb;
  v_booking_id uuid;
  v_optional_booking_id uuid;
  v_optional_booking_status text;
  v_policy_before jsonb;
  v_snapshot_mutation_blocked boolean := false;
  v_duration_mutation_blocked boolean := false;
  v_required_downgrade_blocked boolean := false;
  v_tax_input_mutation_blocked boolean := false;
BEGIN
  v_day_of_week := extract(isodow FROM v_date)::integer;
  v_start := (v_date + time '10:00') AT TIME ZONE 'Europe/Amsterdam';

  SELECT schedule.id
  INTO v_schedule_id
  FROM public.availability_schedules AS schedule
  WHERE schedule.calendar_id = '45000000-0000-4000-8000-000000000010'
    AND schedule.is_default = true
  ORDER BY schedule.created_at, schedule.id
  LIMIT 1;

  IF v_schedule_id IS NULL THEN
    INSERT INTO public.availability_schedules (calendar_id, name, is_default)
    VALUES (
      '45000000-0000-4000-8000-000000000010',
      'Public booking contract schedule',
      true
    )
    RETURNING id INTO v_schedule_id;
  END IF;

  UPDATE public.availability_rules
  SET start_time = time '09:00',
      end_time = time '17:00',
      is_available = true
  WHERE schedule_id = v_schedule_id
    AND day_of_week = v_day_of_week;
  IF NOT FOUND THEN
    INSERT INTO public.availability_rules (
      schedule_id, day_of_week, start_time, end_time, is_available
    ) VALUES (
      v_schedule_id, v_day_of_week, time '09:00', time '17:00', true
    );
  END IF;

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start,
    'Snapshot Customer',
    'snapshot-customer@example.invalid',
    '+31612345678',
    'R45 contract',
    'NL',
    NULL,
    'en'
  );

  IF v_result ->> 'success' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'atomic public booking failed: %', v_result;
  END IF;
  v_booking_id := (v_result #>> '{booking,id}')::uuid;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings AS booking
    WHERE booking.id = v_booking_id
      AND booking.calendar_id = '45000000-0000-4000-8000-000000000010'
      AND booking.service_type_id = '45000000-0000-4000-8000-000000000020'
      AND booking.end_time = booking.start_time + interval '90 minutes'
      AND booking.booking_duration = 90
      AND booking.total_price = 89.95
      AND booking.total_amount_cents = 8995
      AND booking.payment_currency = 'eur'
      AND booking.payment_required = true
      AND booking.payment_status = 'pending'
      AND booking.public_booking_policy_snapshot @> '{
        "version":1,
        "secure_payments_enabled":true,
        "payment_required_for_booking":true,
        "payment_optional":false,
        "payment_required":true,
        "enabled_payment_methods":["ideal","card"],
        "allowed_payment_timing":["pay_now"],
        "payout_option":"standard",
        "payment_deadline_hours":24,
        "auto_cancel_unpaid_bookings":true,
        "tax": {
          "tax_enabled":true,
          "tax_code":"txcd_20030000",
          "tax_behavior":"exclusive",
          "applicable_tax_rate":21,
          "business_country":"NL",
          "supply_type":"in_person",
          "customer_country":"NL",
          "customer_vat_id":null
        }
      }'::jsonb
  ) THEN
    RAISE EXCEPTION 'duration, payment policy, or price snapshot is incorrect';
  END IF;

  SELECT booking.public_booking_policy_snapshot
  INTO v_policy_before
  FROM public.bookings AS booking
  WHERE booking.id = v_booking_id;

  UPDATE public.service_types
  SET duration = 30,
      price = 12.34,
      tax_enabled = false,
      tax_code = 'txcd_mutated',
      tax_behavior = 'inclusive',
      applicable_tax_rate = 9,
      business_country = 'GB',
      supply_type = 'digital'
  WHERE id = '45000000-0000-4000-8000-000000000020';
  UPDATE public.payment_settings
  SET secure_payments_enabled = false,
      payment_required_for_booking = false,
      enabled_payment_methods = '["card"]'::jsonb
  WHERE calendar_id = '45000000-0000-4000-8000-000000000010';

  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings AS booking
    WHERE booking.id = v_booking_id
      AND booking.end_time = booking.start_time + interval '90 minutes'
      AND booking.total_price = 89.95
      AND booking.total_amount_cents = 8995
      AND booking.public_booking_policy_snapshot = v_policy_before
  ) THEN
    RAISE EXCEPTION 'booking snapshots changed with mutable source rows';
  END IF;

  BEGIN
    UPDATE public.bookings
    SET total_price = 1,
        total_amount_cents = 100
    WHERE id = v_booking_id;
  EXCEPTION
    WHEN check_violation THEN
      v_snapshot_mutation_blocked := true;
  END;

  IF NOT v_snapshot_mutation_blocked THEN
    RAISE EXCEPTION 'public booking price snapshot was mutable';
  END IF;

  BEGIN
    UPDATE public.bookings
    SET booking_duration = 30,
        end_time = start_time + interval '30 minutes'
    WHERE id = v_booking_id;
  EXCEPTION
    WHEN check_violation THEN
      v_duration_mutation_blocked := true;
  END;

  IF NOT v_duration_mutation_blocked THEN
    RAISE EXCEPTION 'public booking duration snapshot was mutable';
  END IF;

  BEGIN
    UPDATE public.bookings
    SET payment_required = false
    WHERE id = v_booking_id;
  EXCEPTION
    WHEN check_violation THEN
      v_required_downgrade_blocked := true;
  END;

  IF NOT v_required_downgrade_blocked THEN
    RAISE EXCEPTION 'required booking was allowed to drop its payment requirement';
  END IF;

  BEGIN
    UPDATE public.bookings
    SET customer_country = 'GB',
        customer_vat_id = 'GB123456789'
    WHERE id = v_booking_id;
  EXCEPTION
    WHEN check_violation THEN
      v_tax_input_mutation_blocked := true;
  END;

  IF NOT v_tax_input_mutation_blocked THEN
    RAISE EXCEPTION 'amount-determining customer tax inputs were mutable';
  END IF;

  UPDATE public.service_types
  SET tax_enabled = true,
      tax_code = 'txcd_20030000',
      tax_behavior = 'exclusive',
      applicable_tax_rate = 21,
      business_country = 'NL',
      supply_type = 'in_person'
  WHERE id = '45000000-0000-4000-8000-000000000020';

  UPDATE public.service_types
  SET price = NULL
  WHERE id = '45000000-0000-4000-8000-000000000020';

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start + interval '2 hours',
    'Missing Price Customer',
    'missing-price@example.invalid',
    '+31612345679',
    NULL,
    'NL',
    NULL,
    'nl'
  );

  IF v_result ->> 'code' IS DISTINCT FROM 'PUBLIC_BOOKING_PRICE_INVALID' THEN
    RAISE EXCEPTION 'missing service price did not fail closed: %', v_result;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE customer_email = 'missing-price@example.invalid'
  ) THEN
    RAISE EXCEPTION 'missing service price created a free booking';
  END IF;

  UPDATE public.service_types
  SET price = 12.34
  WHERE id = '45000000-0000-4000-8000-000000000020';

  UPDATE public.payment_settings
  SET secure_payments_enabled = false,
      payment_required_for_booking = true
  WHERE calendar_id = '45000000-0000-4000-8000-000000000010';

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start + interval '3 hours',
    'Disabled Payments Customer',
    'disabled-payments@example.invalid',
    '+31612345680',
    NULL,
    'NL',
    NULL,
    'nl'
  );

  IF v_result ->> 'success' IS DISTINCT FROM 'true'
     OR v_result ->> 'payment_required' IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'valid disabled-payment policy was rejected: %', v_result;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings AS booking
    WHERE booking.customer_email = 'disabled-payments@example.invalid'
      AND booking.payment_required = false
      AND booking.public_booking_policy_snapshot @> '{
        "secure_payments_enabled":false,
        "payment_required_for_booking":true,
        "payment_required":false
      }'::jsonb
  ) THEN
    RAISE EXCEPTION 'disabled-payment booking did not snapshot the effective policy';
  END IF;

  UPDATE public.payment_settings
  SET payout_option = NULL
  WHERE calendar_id = '45000000-0000-4000-8000-000000000010';

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start + interval '4 hours',
    'Incomplete Policy Customer',
    'incomplete-policy@example.invalid',
    '+31612345681',
    NULL,
    'NL',
    NULL,
    'nl'
  );

  IF v_result ->> 'code' IS DISTINCT FROM 'PAYMENT_POLICY_UNAVAILABLE' THEN
    RAISE EXCEPTION 'incomplete payment policy did not fail closed: %', v_result;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE customer_email = 'incomplete-policy@example.invalid'
  ) THEN
    RAISE EXCEPTION 'incomplete payment policy created a booking';
  END IF;

  DELETE FROM public.payment_settings
  WHERE calendar_id = '45000000-0000-4000-8000-000000000010';

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start + interval '5 hours',
    'Missing Policy Customer',
    'missing-policy@example.invalid',
    '+31612345682',
    NULL,
    'NL',
    NULL,
    'nl'
  );

  IF v_result ->> 'code' IS DISTINCT FROM 'PAYMENT_POLICY_UNAVAILABLE' THEN
    RAISE EXCEPTION 'missing payment policy did not fail closed: %', v_result;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE customer_email = 'missing-policy@example.invalid'
  ) THEN
    RAISE EXCEPTION 'missing payment policy created a booking';
  END IF;

  INSERT INTO public.payment_settings (
    calendar_id,
    secure_payments_enabled,
    payment_required_for_booking,
    payment_optional,
    platform_fee_percentage,
    enabled_payment_methods,
    allowed_payment_timing,
    payout_option,
    payment_deadline_hours,
    auto_cancel_unpaid_bookings
  ) VALUES (
    '45000000-0000-4000-8000-000000000010',
    true,
    false,
    true,
    1.90,
    '["ideal","card"]'::jsonb,
    '["pay_now","pay_on_site"]'::jsonb,
    'standard',
    24,
    true
  );

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start + interval '6 hours',
    'Optional Payment Customer',
    'optional-payment@example.invalid',
    '+31612345683',
    NULL,
    'NL',
    NULL,
    'en'
  );

  IF v_result ->> 'success' IS DISTINCT FROM 'true'
     OR v_result ->> 'payment_required' IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'optional public booking failed: %', v_result;
  END IF;
  v_optional_booking_id := (v_result #>> '{booking,id}')::uuid;

  UPDATE public.bookings
  SET payment_required = true,
      payment_status = 'pending',
      payment_timing = 'pay_now'
  WHERE id = v_optional_booking_id
  RETURNING status INTO v_optional_booking_status;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings AS booking
    WHERE booking.id = v_optional_booking_id
      AND booking.payment_required = true
      AND booking.public_booking_policy_snapshot ->> 'payment_required' = 'false'
  ) THEN
    RAISE EXCEPTION 'optional booking could not transition to pay-now state';
  END IF;

  INSERT INTO public.booking_payments (
    booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents,
    currency, platform_fee_cents, status, stripe_mode
  ) VALUES (
    v_optional_booking_id, 'pi_r45_pending', 'acct_r45', 1234,
    'eur', 23, 'pending', 'test'
  );

  v_result := public.defer_public_booking_payment_on_site(
    v_optional_booking_id, v_optional_booking_status, 'pending'
  );
  IF v_result ->> 'code' IS DISTINCT FROM 'PENDING_PAYMENT_ATTEMPT_EXISTS' THEN
    RAISE EXCEPTION 'pending PaymentIntent did not block pay-on-site: %', v_result;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings AS booking
    WHERE booking.id = v_optional_booking_id
      AND booking.payment_status = 'pending'
      AND booking.payment_timing = 'pay_now'
  ) THEN
    RAISE EXCEPTION 'pay-on-site conflict mutated the booking';
  END IF;

  DELETE FROM public.booking_payments
  WHERE stripe_payment_intent_id = 'pi_r45_pending';

  INSERT INTO public.whatsapp_payment_sessions (
    service_type_id, calendar_id, booking_id, amount_cents, currency,
    stripe_session_id, payment_status, payment_url, expires_at, stripe_mode
  ) VALUES (
    '45000000-0000-4000-8000-000000000020',
    '45000000-0000-4000-8000-000000000010',
    v_optional_booking_id, 1234, 'eur', 'cs_r45_pending', 'pending',
    'https://checkout.stripe.test/r45', now() + interval '1 hour', 'test'
  );

  v_result := public.defer_public_booking_payment_on_site(
    v_optional_booking_id, v_optional_booking_status, 'pending'
  );
  IF v_result ->> 'code' IS DISTINCT FROM 'PENDING_PAYMENT_ATTEMPT_EXISTS' THEN
    RAISE EXCEPTION 'pending Checkout session did not block pay-on-site: %', v_result;
  END IF;

  DELETE FROM public.whatsapp_payment_sessions
  WHERE stripe_session_id = 'cs_r45_pending';

  v_result := public.defer_public_booking_payment_on_site(
    v_optional_booking_id, v_optional_booking_status, 'pending'
  );
  IF v_result ->> 'success' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'safe pay-on-site transition failed: %', v_result;
  END IF;

  UPDATE public.payment_settings
  SET secure_payments_enabled = true,
      payment_required_for_booking = true,
      payment_optional = false,
      enabled_payment_methods = '["ideal"]'::jsonb,
      allowed_payment_timing = '["pay_now"]'::jsonb
  WHERE calendar_id = '45000000-0000-4000-8000-000000000010';
  UPDATE public.service_types
  SET business_country = 'GB'
  WHERE id = '45000000-0000-4000-8000-000000000020';

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start + interval '7 days',
    'GBP Ideal Customer', 'gbp-ideal@example.invalid', '+31612345684',
    NULL, 'GB', NULL, 'en'
  );
  IF v_result ->> 'code' IS DISTINCT FROM 'PAYMENT_POLICY_UNAVAILABLE' THEN
    RAISE EXCEPTION 'GBP+iDEAL was not rejected before reservation: %', v_result;
  END IF;

  UPDATE public.service_types
  SET business_country = 'NL'
  WHERE id = '45000000-0000-4000-8000-000000000020';
  UPDATE public.payment_settings
  SET enabled_payment_methods = '["card","unknown_method"]'::jsonb
  WHERE calendar_id = '45000000-0000-4000-8000-000000000010';

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start + interval '7 days 2 hours',
    'Unknown Method Customer', 'unknown-method@example.invalid', '+31612345685',
    NULL, 'NL', NULL, 'en'
  );
  IF v_result ->> 'code' IS DISTINCT FROM 'PAYMENT_POLICY_UNAVAILABLE' THEN
    RAISE EXCEPTION 'unknown payment method was not rejected: %', v_result;
  END IF;

  UPDATE public.service_types
  SET business_country = 'GB'
  WHERE id = '45000000-0000-4000-8000-000000000020';
  UPDATE public.payment_settings
  SET enabled_payment_methods = '["cards","apple-pay","pay-by-bank"]'::jsonb
  WHERE calendar_id = '45000000-0000-4000-8000-000000000010';

  v_result := public.commit_public_booking(
    'public-booking-policy-contract',
    '45000000-0000-4000-8000-000000000020',
    v_start + interval '7 days 4 hours',
    'Normalized Methods Customer', 'normalized-methods@example.invalid',
    '+31612345686', NULL, 'GB', NULL, 'en'
  );
  IF v_result ->> 'success' IS DISTINCT FROM 'true'
     OR v_result #> '{booking,public_booking_policy_snapshot,enabled_payment_methods}'
        IS DISTINCT FROM '["card","pay_by_bank"]'::jsonb THEN
    RAISE EXCEPTION 'supported aliases were not normalized deterministically: %', v_result;
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'PUBLIC_BOOKING_POLICY_SNAPSHOT_CONTRACT_PASS' AS result;
