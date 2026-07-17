\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '65000000-0000-4000-8000-000000000001',
    'dashboard-metrics-owner@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dashboard Metrics Owner"}'::jsonb, now(), now()
  ),
  (
    '65000000-0000-4000-8000-000000000002',
    'dashboard-metrics-foreign@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dashboard Metrics Foreign"}'::jsonb, now(), now()
  );

INSERT INTO public.calendars (id, user_id, name, slug, timezone, is_active)
VALUES
  (
    '65000000-0000-4000-8000-000000000010',
    '65000000-0000-4000-8000-000000000001',
    'Dashboard Metrics Calendar',
    'dashboard-metrics-calendar',
    'Europe/Amsterdam',
    true
  ),
  (
    '65000000-0000-4000-8000-000000000011',
    '65000000-0000-4000-8000-000000000002',
    'Foreign Dashboard Metrics Calendar',
    'foreign-dashboard-metrics-calendar',
    'Europe/Amsterdam',
    true
  );

-- No response samples is different from an instantaneous response.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"65000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_metrics jsonb;
BEGIN
  v_metrics := public.get_dashboard_metrics(
    '65000000-0000-4000-8000-000000000010'
  );

  IF NOT (v_metrics ? 'avg_response_time')
     OR v_metrics->'avg_response_time' <> 'null'::jsonb
     OR (v_metrics->>'avg_response_time_sample_count')::integer <> 0
     OR (v_metrics->>'total_revenue')::numeric <> 0
     OR v_metrics->'total_revenue_currency' <> 'null'::jsonb
     OR v_metrics->>'total_revenue_status' <> 'no_retained_revenue'
     OR v_metrics->>'total_revenue_window_basis' <> 'booking_start_time'
     OR (v_metrics->>'contacts_later_booked')::integer <> 0
     OR (v_metrics->>'contacts_later_booked_sample_count')::integer <> 0
     OR v_metrics->>'contacts_later_booked_source'
       <> 'phone_or_email_correlation'
     OR v_metrics ? 'conversion_rate' THEN
    RAISE EXCEPTION 'empty dashboard fabricated response evidence: %', v_metrics;
  END IF;
END;
$test$;

RESET ROLE;

-- Exercise the same private helper used by the production RPC. Adding 24 hours
-- directly to a timestamptz in that helper would fail these assertions.
DO $test$
DECLARE
  v_spring_start timestamptz;
  v_spring_end timestamptz;
  v_autumn_start timestamptz;
  v_autumn_end timestamptz;
BEGIN
  SELECT bounds.today_start, bounds.today_end
  INTO v_spring_start, v_spring_end
  FROM private.dashboard_period_bounds(
    'Europe/Amsterdam', timestamptz '2026-03-29 12:00:00+00'
  ) AS bounds;

  SELECT bounds.today_start, bounds.today_end
  INTO v_autumn_start, v_autumn_end
  FROM private.dashboard_period_bounds(
    'Europe/Amsterdam', timestamptz '2026-10-25 12:00:00+00'
  ) AS bounds;

  IF extract(epoch FROM (v_spring_end - v_spring_start)) / 3600 <> 23
     OR extract(epoch FROM (v_autumn_end - v_autumn_start)) / 3600 <> 25 THEN
    RAISE EXCEPTION 'calendar-local DST boundaries were flattened: spring %, autumn %',
      v_spring_end - v_spring_start,
      v_autumn_end - v_autumn_start;
  END IF;
END;
$test$;

INSERT INTO public.whatsapp_contacts (
  id, phone_number, display_name, linked_customer_email
)
VALUES
  (
    '65000000-0000-4000-8000-000000000020',
    '+31650000020', 'Converted Customer', 'converted@example.invalid'
  ),
  (
    '65000000-0000-4000-8000-000000000021',
    '+31650000021', 'Unconverted Customer', 'unconverted@example.invalid'
  ),
  (
    '65000000-0000-4000-8000-000000000022',
    '+31650000022', 'Old Conversation Customer', 'old-conversation@example.invalid'
  ),
  (
    '65000000-0000-4000-8000-000000000023',
    '+31650000023', 'Foreign Customer', 'foreign-conversation@example.invalid'
  );

INSERT INTO public.whatsapp_conversations (
  id, calendar_id, contact_id, status, created_at
)
VALUES
  (
    '65000000-0000-4000-8000-000000000030',
    '65000000-0000-4000-8000-000000000010',
    '65000000-0000-4000-8000-000000000020',
    'active', now() - interval '10 days'
  ),
  (
    '65000000-0000-4000-8000-000000000031',
    '65000000-0000-4000-8000-000000000010',
    '65000000-0000-4000-8000-000000000021',
    'active', now() - interval '5 days'
  ),
  (
    '65000000-0000-4000-8000-000000000032',
    '65000000-0000-4000-8000-000000000010',
    '65000000-0000-4000-8000-000000000022',
    'closed', now() - interval '40 days'
  ),
  (
    '65000000-0000-4000-8000-000000000033',
    '65000000-0000-4000-8000-000000000011',
    '65000000-0000-4000-8000-000000000023',
    'active', now() - interval '2 days'
  );

-- Failed sends do not count as replies. The second conversation deliberately
-- gives the outbound row a lower UUID at the exact same timestamp as inbound.
INSERT INTO public.whatsapp_messages (
  id, conversation_id, message_id, direction, message_type, content, status,
  created_at
)
VALUES
  (
    '65000000-0000-4000-8000-000000000041',
    '65000000-0000-4000-8000-000000000030',
    'dashboard-response-inbound',
    'inbound', 'text', 'Hallo', 'read', now() - interval '10 minutes'
  ),
  (
    '65000000-0000-4000-8000-000000000042',
    '65000000-0000-4000-8000-000000000030',
    'dashboard-response-failed',
    'outbound', 'text', 'Niet bezorgd', 'failed', now() - interval '8 minutes'
  ),
  (
    '65000000-0000-4000-8000-000000000043',
    '65000000-0000-4000-8000-000000000030',
    'dashboard-response-delivered',
    'outbound', 'text', 'Wel bezorgd', 'delivered', now() - interval '5 minutes'
  ),
  (
    '65000000-0000-4000-8000-000000000044',
    '65000000-0000-4000-8000-000000000030',
    'dashboard-future-response-inbound',
    'inbound', 'text', 'Nog geen antwoord', 'read', now() - interval '1 minute'
  ),
  (
    '65000000-0000-4000-8000-000000000045',
    '65000000-0000-4000-8000-000000000030',
    'dashboard-future-response',
    'outbound', 'text', 'Toekomstig antwoord', 'sent', now() + interval '1 day'
  ),
  (
    '65000000-0000-4000-8000-000000000050',
    '65000000-0000-4000-8000-000000000031',
    'dashboard-tied-response-outbound',
    'outbound', 'text', 'Direct antwoord', 'sent', now() - interval '20 minutes'
  ),
  (
    '65000000-0000-4000-8000-000000000051',
    '65000000-0000-4000-8000-000000000031',
    'dashboard-tied-response-inbound',
    'inbound', 'text', 'Tegelijk bericht', 'read', now() - interval '20 minutes'
  ),
  (
    '65000000-0000-4000-8000-000000000052',
    '65000000-0000-4000-8000-000000000032',
    'dashboard-old-inbound',
    'inbound', 'text', 'Oud bericht', 'read', now() - interval '40 days'
  ),
  (
    '65000000-0000-4000-8000-000000000053',
    '65000000-0000-4000-8000-000000000033',
    'dashboard-foreign-inbound',
    'inbound', 'text', 'Vreemde tenant', 'read', now() - interval '4 minutes'
  ),
  (
    '65000000-0000-4000-8000-000000000054',
    '65000000-0000-4000-8000-000000000033',
    'dashboard-foreign-outbound',
    'outbound', 'text', 'Vreemde tenant antwoord', 'sent', now() - interval '1 minute'
  );

-- Confirmed and completed current-period bookings both count. Every other booking
-- probes an exclusion: both period ends, far future, soft delete, conversion
-- cohort age, or tenant.
INSERT INTO public.bookings (
  id, calendar_id, customer_name, customer_email, customer_phone,
  start_time, end_time, status, total_price, is_deleted, created_at
)
VALUES
  (
    '65000000-0000-4000-8000-000000000060',
    '65000000-0000-4000-8000-000000000010',
    'Current Period Customer', 'period@example.invalid', '+31650000060',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '12 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '13 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    'confirmed', 25, false, now() - interval '1 day'
  ),
  (
    '65000000-0000-4000-8000-000000000070',
    '65000000-0000-4000-8000-000000000010',
    'Completed Period Customer', 'completed-period@example.invalid', '+31650000070',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '16 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '17 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    'completed', 100, false, now() - interval '2 days'
  ),
  (
    '65000000-0000-4000-8000-000000000061',
    '65000000-0000-4000-8000-000000000010',
    'Beyond Both Periods Customer', 'beyond-periods@example.invalid', '+31650000061',
    (
      SELECT greatest(bounds.week_end, bounds.month_end) + interval '1 hour'
      FROM private.dashboard_period_bounds(
        'Europe/Amsterdam', now()
      ) AS bounds
    ),
    (
      SELECT greatest(bounds.week_end, bounds.month_end) + interval '2 hours'
      FROM private.dashboard_period_bounds(
        'Europe/Amsterdam', now()
      ) AS bounds
    ),
    'confirmed', 100, false, now() - interval '1 day'
  ),
  (
    '65000000-0000-4000-8000-000000000062',
    '65000000-0000-4000-8000-000000000010',
    'Far Future Customer', 'far-future@example.invalid', '+31650000062',
    now() + interval '1 year', now() + interval '1 year 1 hour',
    'confirmed', 999, false, now() - interval '1 day'
  ),
  (
    '65000000-0000-4000-8000-000000000063',
    '65000000-0000-4000-8000-000000000010',
    'Deleted Period Customer', 'deleted-period@example.invalid', '+31650000063',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '14 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '15 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    'confirmed', 500, true, now() - interval '1 day'
  ),
  (
    '65000000-0000-4000-8000-000000000064',
    '65000000-0000-4000-8000-000000000010',
    'Converted Customer One', 'converted@example.invalid', '+31650000020',
    now() + interval '2 months', now() + interval '2 months 1 hour',
    'confirmed', 50, false, now() - interval '9 days'
  ),
  (
    '65000000-0000-4000-8000-000000000065',
    '65000000-0000-4000-8000-000000000010',
    'Converted Customer Two', 'converted@example.invalid', '+31650000020',
    now() + interval '3 months', now() + interval '3 months 1 hour',
    'confirmed', 60, false, now() - interval '8 days'
  ),
  (
    '65000000-0000-4000-8000-000000000066',
    '65000000-0000-4000-8000-000000000010',
    'Future Created Customer', 'unconverted@example.invalid', '+31650000021',
    now() + interval '4 months', now() + interval '4 months 1 hour',
    'confirmed', 70, false, now() + interval '1 day'
  ),
  (
    '65000000-0000-4000-8000-000000000067',
    '65000000-0000-4000-8000-000000000010',
    'Old Created Customer', 'unconverted@example.invalid', '+31650000021',
    now() + interval '5 months', now() + interval '5 months 1 hour',
    'confirmed', 80, false, now() - interval '40 days'
  ),
  (
    '65000000-0000-4000-8000-000000000068',
    '65000000-0000-4000-8000-000000000010',
    'Old Conversation Customer', 'old-conversation@example.invalid', '+31650000022',
    now() + interval '6 months', now() + interval '6 months 1 hour',
    'confirmed', 90, false, now() - interval '1 day'
  ),
  (
    '65000000-0000-4000-8000-000000000069',
    '65000000-0000-4000-8000-000000000011',
    'Foreign Customer', 'foreign-conversation@example.invalid', '+31650000023',
    now() + interval '2 months', now() + interval '2 months 1 hour',
    'confirmed', 1000, false, now() - interval '1 day'
  );

-- Preserve explicit pending/completed/no-show statuses through the booking
-- insert trigger by marking these as payment-required rows. The old pending row
-- must not leak into today's count, and only status=confirmed may enter the
-- weekly confirmed metric.
INSERT INTO public.bookings (
  id, calendar_id, customer_name, customer_email, customer_phone,
  start_time, end_time, status, total_price, is_deleted, created_at,
  payment_required, payment_status
)
VALUES
  (
    '65000000-0000-4000-8000-000000000071',
    '65000000-0000-4000-8000-000000000010',
    'Today Pending Customer', 'today-pending@example.invalid', '+31650000071',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '18 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '19 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    'pending', 900, false, now() - interval '1 day', true, 'pending'
  ),
  (
    '65000000-0000-4000-8000-000000000072',
    '65000000-0000-4000-8000-000000000010',
    'Old Pending Customer', 'old-pending@example.invalid', '+31650000072',
    now() - interval '45 days', now() - interval '45 days' + interval '1 hour',
    'pending', 800, false, now() - interval '50 days', true, 'pending'
  ),
  (
    '65000000-0000-4000-8000-000000000073',
    '65000000-0000-4000-8000-000000000010',
    'Today No Show Customer', 'today-no-show@example.invalid', '+31650000073',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '20 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '21 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    'no-show', 700, false, now() - interval '1 day', true, 'paid'
  ),
  (
    '65000000-0000-4000-8000-000000000074',
    '65000000-0000-4000-8000-000000000010',
    'Today Completed Customer', 'today-completed@example.invalid', '+31650000074',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '22 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    (date_trunc('day', now() AT TIME ZONE 'Europe/Amsterdam') + interval '23 hours')
      AT TIME ZONE 'Europe/Amsterdam',
    'completed', 600, false, now() - interval '1 day', true, 'paid'
  );

-- Revenue comes only from captured payment ledgers. Booking prices are
-- deliberately different, the completed payment is partially refunded, the
-- pending payment is unpaid, and retained money on a soft-deleted booking still
-- exists financially until it is refunded.
INSERT INTO public.booking_payments (
  booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents,
  currency, platform_fee_cents, status, refund_amount_cents, stripe_mode
)
VALUES
  (
    '65000000-0000-4000-8000-000000000060', 'pi_r44_captured_eur',
    'acct_r44_contract', 5000, 'eur', 95, 'succeeded', 0, 'test'
  ),
  (
    '65000000-0000-4000-8000-000000000070', 'pi_r44_partial_eur',
    'acct_r44_contract', 10000, 'eur', 190,
    'partially_refunded', 2500, 'test'
  ),
  (
    '65000000-0000-4000-8000-000000000063', 'pi_r44_deleted_retained_eur',
    'acct_r44_contract', 2000, 'eur', 38, 'completed', 0, 'test'
  ),
  (
    '65000000-0000-4000-8000-000000000071', 'pi_r44_pending_eur',
    'acct_r44_contract', 90000, 'eur', 1710, 'pending', 0, 'test'
  ),
  (
    -- A fully refunded second currency must not turn positive retained EUR
    -- into a mixed-currency result.
    '65000000-0000-4000-8000-000000000060', 'pi_r44_fully_refunded_usd',
    'acct_r44_contract', 3000, 'usd', 57, 'refunded', 3000, 'test'
  );

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"65000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_metrics jsonb;
BEGIN
  v_metrics := public.get_dashboard_metrics(
    '65000000-0000-4000-8000-000000000010'
  );

  IF (v_metrics->>'today_bookings')::integer <> 5
     OR (v_metrics->>'pending_bookings')::integer <> 1
     OR (v_metrics->>'week_bookings')::integer <> 2
     OR (v_metrics->>'month_bookings')::integer <> 5 THEN
    RAISE EXCEPTION 'calendar period/status labels did not match SQL: %', v_metrics;
  END IF;

  IF (v_metrics->>'total_revenue')::numeric <> 145
     OR v_metrics->>'total_revenue_currency' <> 'eur'
     OR v_metrics->>'total_revenue_status' <> 'single_currency'
     OR v_metrics->>'total_revenue_window_basis' <> 'booking_start_time'
     OR (v_metrics->>'total_revenue_window_start')::timestamptz IS DISTINCT FROM
       date_trunc('month', now() AT TIME ZONE 'Europe/Amsterdam')
         AT TIME ZONE 'Europe/Amsterdam'
     OR (v_metrics->>'total_revenue_window_end')::timestamptz IS DISTINCT FROM
       (date_trunc('month', now() AT TIME ZONE 'Europe/Amsterdam')
         + interval '1 month') AT TIME ZONE 'Europe/Amsterdam' THEN
    RAISE EXCEPTION 'retained captured revenue was not truthful: %', v_metrics;
  END IF;

  IF (v_metrics->>'contacts_later_booked')::integer <> 1
     OR (v_metrics->>'contacts_later_booked_sample_count')::integer <> 2
     OR v_metrics->>'contacts_later_booked_source'
       <> 'phone_or_email_correlation'
     OR v_metrics ? 'conversion_rate' THEN
    RAISE EXCEPTION 'contact correlation was mislabeled or not distinct: %', v_metrics;
  END IF;

  IF (v_metrics->>'avg_response_time')::numeric <> 2.5
     OR (v_metrics->>'avg_response_time_sample_count')::integer <> 2 THEN
    RAISE EXCEPTION 'delivered/tied response samples were not truthful: %', v_metrics;
  END IF;
END;
$test$;

RESET ROLE;

-- A second retained currency makes a scalar total unsafe. Return null with
-- explicit metadata instead of adding EUR and USD as if they were comparable.
INSERT INTO public.booking_payments (
  booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents,
  currency, platform_fee_cents, status, refund_amount_cents, stripe_mode
) VALUES (
  '65000000-0000-4000-8000-000000000060', 'pi_r44_captured_usd',
  'acct_r44_contract', 3000, 'usd', 57, 'succeeded', 0, 'test'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"65000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_metrics jsonb;
BEGIN
  v_metrics := public.get_dashboard_metrics(
    '65000000-0000-4000-8000-000000000010'
  );

  IF v_metrics->'total_revenue' <> 'null'::jsonb
     OR v_metrics->'total_revenue_currency' <> 'null'::jsonb
     OR v_metrics->>'total_revenue_status' <> 'mixed_currencies' THEN
    RAISE EXCEPTION 'mixed currencies were summed into a lie: %', v_metrics;
  END IF;
END;
$test$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"65000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.get_dashboard_metrics(
      '65000000-0000-4000-8000-000000000010'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_blocked := true;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'foreign dashboard metrics read was not blocked';
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF has_function_privilege('anon', 'public.get_dashboard_metrics(uuid)', 'EXECUTE')
     OR NOT has_function_privilege(
       'authenticated', 'public.get_dashboard_metrics(uuid)', 'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role', 'public.get_dashboard_metrics(uuid)', 'EXECUTE'
     )
     OR has_function_privilege(
       'anon', 'private.dashboard_period_bounds(text,timestamptz)', 'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'private.dashboard_period_bounds(text,timestamptz)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'service_role',
       'private.dashboard_period_bounds(text,timestamptz)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'dashboard metrics function grants drifted';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'DASHBOARD_METRICS_TRUTH_CONTRACT_PASS' AS result;
