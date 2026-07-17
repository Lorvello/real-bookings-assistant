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
VALUES (
  '62000000-0000-0000-0000-000000000001',
  'dashboard-event-owner@example.invalid',
  'authenticated',
  'authenticated',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}',
  now(),
  now()
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES (
  '62000000-0000-0000-0000-000000000010',
  '62000000-0000-0000-0000-000000000001',
  'Dashboard Event Contract',
  'dashboard-event-contract',
  true
);

INSERT INTO public.bookings (
  id,
  calendar_id,
  customer_name,
  customer_email,
  customer_phone,
  start_time,
  end_time,
  status,
  notes,
  internal_notes,
  confirmation_token
)
VALUES (
  '62000000-0000-0000-0000-000000000101',
  '62000000-0000-0000-0000-000000000010',
  'Sensitive Customer',
  'sensitive@example.invalid',
  '+31600002101',
  now() + interval '2 days',
  now() + interval '2 days 1 hour',
  'confirmed',
  'private customer note',
  'private owner note',
  'sensitive-confirmation-token'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"62000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

UPDATE public.bookings
SET customer_name = 'Updated Customer'
WHERE id = '62000000-0000-0000-0000-000000000101';

DO $test$
BEGIN
  BEGIN
    DELETE FROM public.bookings
    WHERE id = '62000000-0000-0000-0000-000000000101';
    RAISE EXCEPTION 'browser booking hard delete unexpectedly allowed';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;
END;
$test$;

RESET ROLE;

SET LOCAL ROLE service_role;

DELETE FROM public.bookings
WHERE id = '62000000-0000-0000-0000-000000000101';

RESET ROLE;

DO $test$
DECLARE
  v_bad_payloads integer;
  v_event_count integer;
BEGIN
  SELECT count(*) INTO v_event_count
  FROM public.business_events
  WHERE calendar_id = '62000000-0000-0000-0000-000000000010'
    AND event_type IN ('bookings.insert', 'bookings.update', 'bookings.delete');
  IF v_event_count <> 3 THEN
    RAISE EXCEPTION 'expected insert/update/delete events, got %', v_event_count;
  END IF;

  SELECT count(*) INTO v_bad_payloads
  FROM public.business_events
  WHERE calendar_id = '62000000-0000-0000-0000-000000000010'
    AND (
      event_data ?| ARRAY[
        'customer_name',
        'customer_email',
        'customer_phone',
        'notes',
        'internal_notes',
        'confirmation_token',
        'payment_status'
      ]
      OR event_data->>'record_id' IS DISTINCT FROM
        '62000000-0000-0000-0000-000000000101'
    );
  IF v_bad_payloads <> 0 THEN
    RAISE EXCEPTION '% dashboard events contain PII or wrong identity', v_bad_payloads;
  END IF;
END;
$test$;

-- Recreate one child and prove the parent/account cascade is not blocked by an orphan
-- business_event insert. The whole test rolls back, so no durable fixture remains.
INSERT INTO public.bookings (
  id,
  calendar_id,
  customer_name,
  customer_email,
  start_time,
  end_time,
  status
)
VALUES (
  '62000000-0000-0000-0000-000000000102',
  '62000000-0000-0000-0000-000000000010',
  'Cascade Customer',
  'cascade@example.invalid',
  now() + interval '3 days',
  now() + interval '3 days 1 hour',
  'confirmed'
);

DELETE FROM auth.users
WHERE id = '62000000-0000-0000-0000-000000000001';

DO $test$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.calendars
    WHERE id = '62000000-0000-0000-0000-000000000010'
  ) OR EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '62000000-0000-0000-0000-000000000102'
  ) OR EXISTS (
    SELECT 1 FROM public.business_events
    WHERE calendar_id = '62000000-0000-0000-0000-000000000010'
  ) THEN
    RAISE EXCEPTION 'owner/calendar cascade did not finish cleanly';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'DASHBOARD_EVENT_LIFECYCLE_CONTRACT_PASS';
