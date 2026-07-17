-- R45: make the public booking commit one atomic, server-authoritative operation.
--
-- The old Edge path read payment_settings and then inserted a booking in separate
-- statements. A failed/missing settings read silently became "payment not required",
-- the request supplied end_time, and create-booking-payment could later charge a
-- mutable service_types.price. This migration captures the exact policy, duration,
-- price cents and currency in the same transaction that reserves the slot.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS public_booking_policy_snapshot jsonb;

-- R45 cannot safely invent booking-time policy for an already-active unpaid row.
-- Stop the deployment with a stable count and sorted sample instead of backfilling
-- mutable payment_settings/service_types into historical bookings.
CREATE OR REPLACE FUNCTION public.assert_r45_no_active_payable_legacy_bookings()
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_count bigint;
  v_sample_ids text;
BEGIN
  WITH candidates AS MATERIALIZED (
    SELECT
      booking.id,
      row_number() OVER (ORDER BY booking.id) AS sample_order
    FROM public.bookings AS booking
    WHERE booking.public_booking_policy_snapshot IS NULL
      AND COALESCE(booking.status, 'pending') NOT IN (
        'cancelled', 'completed', 'no-show'
      )
      AND COALESCE(booking.payment_status, 'none') NOT IN (
        'paid', 'partial', 'partially_refunded', 'refund_required', 'refunded'
      )
      AND (
        booking.payment_required IS TRUE
        OR booking.payment_timing = 'pay_now'
        OR COALESCE(booking.payment_status, 'none') IN (
          'pending', 'processing', 'failed'
        )
        OR EXISTS (
          SELECT 1
          FROM public.booking_payments AS payment
          WHERE payment.booking_id = booking.id
            AND payment.status IN ('pending', 'processing')
        )
        OR EXISTS (
          SELECT 1
          FROM public.whatsapp_payment_sessions AS session
          WHERE session.booking_id = booking.id
            AND session.payment_status IN ('pending', 'processing')
        )
        OR (
          COALESCE(booking.payment_timing, '') <> 'pay_on_site'
          AND COALESCE(booking.payment_status, 'none') <> 'pay_on_site'
          AND (
            booking.total_amount_cents IS NULL
            OR booking.total_price IS NULL
            OR booking.total_amount_cents > 0
            OR booking.total_price > 0
          )
        )
      )
  )
  SELECT
    count(*),
    COALESCE(
      string_agg(id::text, ',' ORDER BY id) FILTER (WHERE sample_order <= 10),
      ''
    )
  INTO v_count, v_sample_ids
  FROM candidates;

  IF v_count > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format(
        'R45_PRECHECK_ACTIVE_PAYABLE_LEGACY_BOOKINGS count=%s sample_ids=%s',
        v_count,
        v_sample_ids
      ),
      DETAIL =
        'R45 cannot infer booking-time price, payment, method, currency, or tax policy for active unpaid legacy bookings.',
      HINT =
        'Resolve each booking explicitly before deployment. Never backfill this snapshot from current payment_settings or service_types.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_r45_no_active_payable_legacy_bookings()
  FROM PUBLIC, anon, authenticated, service_role;

SELECT public.assert_r45_no_active_payable_legacy_bookings();

-- Keep this matrix byte-for-byte equivalent in meaning to
-- _shared/bookingPaymentPolicy.ts. NULL means malformed, unknown, or incompatible.
CREATE OR REPLACE FUNCTION public.normalize_public_booking_payment_methods(
  p_methods jsonb,
  p_currency text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
RETURNS NULL ON NULL INPUT
SET search_path = ''
AS $function$
DECLARE
  v_entry jsonb;
  v_raw text;
  v_method text;
  v_currency text := lower(btrim(p_currency));
  v_normalized jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_methods) IS DISTINCT FROM 'array'
     OR v_currency !~ '^[a-z]{3}$' THEN
    RETURN NULL;
  END IF;

  FOR v_entry IN
    SELECT value
    FROM jsonb_array_elements(p_methods)
  LOOP
    IF jsonb_typeof(v_entry) IS DISTINCT FROM 'string' THEN
      RETURN NULL;
    END IF;

    v_raw := lower(btrim(v_entry #>> '{}'));
    IF v_raw = '' THEN
      RETURN NULL;
    END IF;

    v_method := CASE v_raw
      WHEN 'ideal' THEN 'ideal'
      WHEN 'card' THEN 'card'
      WHEN 'cards' THEN 'card'
      WHEN 'cards_eea' THEN 'card'
      WHEN 'cards_uk' THEN 'card'
      WHEN 'cards_international' THEN 'card'
      WHEN 'apple-pay' THEN 'card'
      WHEN 'apple_pay' THEN 'card'
      WHEN 'google-pay' THEN 'card'
      WHEN 'google_pay' THEN 'card'
      WHEN 'cartes-bancaires' THEN 'card'
      WHEN 'cartes_bancaires' THEN 'card'
      WHEN 'bancontact' THEN 'bancontact'
      WHEN 'blik' THEN 'blik'
      WHEN 'twint' THEN 'twint'
      WHEN 'revolut-pay' THEN 'revolut_pay'
      WHEN 'revolut_pay' THEN 'revolut_pay'
      WHEN 'sofort' THEN 'sofort'
      WHEN 'eps' THEN 'eps'
      WHEN 'przelewy24' THEN 'p24'
      WHEN 'p24' THEN 'p24'
      WHEN 'pay-by-bank' THEN 'pay_by_bank'
      WHEN 'pay_by_bank' THEN 'pay_by_bank'
      WHEN 'sepa_debit' THEN 'sepa_debit'
      WHEN 'klarna' THEN 'klarna'
      ELSE NULL
    END;

    IF v_method IS NULL
       OR (
         v_method IN ('ideal', 'bancontact', 'sofort', 'eps', 'sepa_debit')
         AND v_currency <> 'eur'
       )
       OR (v_method = 'blik' AND v_currency <> 'pln')
       OR (v_method = 'twint' AND v_currency <> 'chf')
       OR (v_method = 'p24' AND v_currency NOT IN ('eur', 'pln'))
       OR (v_method = 'pay_by_bank' AND v_currency <> 'gbp') THEN
      RETURN NULL;
    END IF;

    IF NOT v_normalized @> jsonb_build_array(v_method) THEN
      v_normalized := v_normalized || jsonb_build_array(v_method);
    END IF;
  END LOOP;

  RETURN v_normalized;
END;
$function$;

REVOKE ALL ON FUNCTION public.normalize_public_booking_payment_methods(jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_public_policy_snapshot_integrity;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_public_policy_snapshot_integrity CHECK (
    public_booking_policy_snapshot IS NULL
    OR CASE
      WHEN jsonb_typeof(public_booking_policy_snapshot) = 'object'
        AND public_booking_policy_snapshot ->> 'version' = '1'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'captured_at') = 'string'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'secure_payments_enabled') = 'boolean'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'payment_required_for_booking') = 'boolean'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'payment_optional') = 'boolean'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'payment_required') = 'boolean'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'enabled_payment_methods') = 'array'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'allowed_payment_timing') = 'array'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'payout_option') = 'string'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'auto_cancel_unpaid_bookings') = 'boolean'
        AND jsonb_typeof(public_booking_policy_snapshot -> 'payment_deadline_hours') IN ('number', 'null')
        AND jsonb_typeof(public_booking_policy_snapshot -> 'tax') = 'object'
        AND jsonb_typeof(public_booking_policy_snapshot #> '{tax,tax_enabled}') = 'boolean'
        AND jsonb_typeof(public_booking_policy_snapshot #> '{tax,tax_code}') IN ('string', 'null')
        AND jsonb_typeof(public_booking_policy_snapshot #> '{tax,tax_behavior}') = 'string'
        AND jsonb_typeof(public_booking_policy_snapshot #> '{tax,applicable_tax_rate}') IN ('number', 'null')
        AND jsonb_typeof(public_booking_policy_snapshot #> '{tax,business_country}') = 'string'
        AND jsonb_typeof(public_booking_policy_snapshot #> '{tax,supply_type}') = 'string'
        AND jsonb_typeof(public_booking_policy_snapshot #> '{tax,customer_country}') IN ('string', 'null')
        AND jsonb_typeof(public_booking_policy_snapshot #> '{tax,customer_vat_id}') IN ('string', 'null')
      THEN
        total_price IS NOT NULL
        AND total_price >= 0
        AND total_amount_cents IS NOT NULL
        AND total_amount_cents >= 0
        AND total_amount_cents = round(total_price * 100)::integer
        AND payment_currency IS NOT NULL
        AND payment_currency IN ('eur', 'gbp')
        AND booking_duration IS NOT NULL
        AND booking_duration BETWEEN 1 AND 1440
        AND end_time = start_time + make_interval(mins => booking_duration)
        AND payment_required IS NOT NULL
        AND (public_booking_policy_snapshot ->> 'payment_required')::boolean = (
          (public_booking_policy_snapshot ->> 'secure_payments_enabled')::boolean
          AND (public_booking_policy_snapshot ->> 'payment_required_for_booking')::boolean
          AND NOT (public_booking_policy_snapshot ->> 'payment_optional')::boolean
        )
        -- A snapshot-required booking must remain payment-required. A booking
        -- that was optional/not-required at creation may become payment_required
        -- when the customer explicitly starts an online payment later.
        AND (
          NOT (public_booking_policy_snapshot ->> 'payment_required')::boolean
          OR payment_required
        )
        AND (public_booking_policy_snapshot ->> 'payout_option') IN ('standard', 'instant')
        AND (public_booking_policy_snapshot #>> '{tax,tax_behavior}') IN ('inclusive', 'exclusive')
        AND (public_booking_policy_snapshot #>> '{tax,business_country}') ~ '^[A-Z]{2}$'
        AND (public_booking_policy_snapshot #>> '{tax,supply_type}') IN (
          'in_person', 'remote_service', 'digital'
        )
        AND (
          public_booking_policy_snapshot #> '{tax,tax_code}' = 'null'::jsonb
          OR NULLIF(
            btrim(public_booking_policy_snapshot #>> '{tax,tax_code}'),
            ''
          ) IS NOT NULL
        )
        AND (
          public_booking_policy_snapshot #> '{tax,applicable_tax_rate}' = 'null'::jsonb
          OR (
            (public_booking_policy_snapshot #>> '{tax,applicable_tax_rate}')::numeric >= 0
            AND (public_booking_policy_snapshot #>> '{tax,applicable_tax_rate}')::numeric <= 100
          )
        )
        AND (
          public_booking_policy_snapshot #> '{tax,customer_country}' = 'null'::jsonb
          OR (public_booking_policy_snapshot #>> '{tax,customer_country}') ~ '^[A-Z]{2}$'
        )
        AND (
          public_booking_policy_snapshot #> '{tax,customer_vat_id}' = 'null'::jsonb
          OR (public_booking_policy_snapshot #>> '{tax,customer_vat_id}') ~ '^[A-Z]{2}[A-Z0-9]{2,12}$'
        )
        AND (public_booking_policy_snapshot #>> '{tax,customer_country}')
          IS NOT DISTINCT FROM customer_country
        AND (public_booking_policy_snapshot #>> '{tax,customer_vat_id}')
          IS NOT DISTINCT FROM customer_vat_id
        AND (
          jsonb_array_length(public_booking_policy_snapshot -> 'allowed_payment_timing') > 0
        )
        AND (
          NOT payment_required
          OR (
            total_amount_cents > 0
            AND (public_booking_policy_snapshot ->> 'secure_payments_enabled')::boolean
            AND public_booking_policy_snapshot -> 'allowed_payment_timing' @> '["pay_now"]'::jsonb
            AND jsonb_array_length(public_booking_policy_snapshot -> 'enabled_payment_methods') > 0
          )
        )
      ELSE false
    END
  ) NOT VALID;
ALTER TABLE public.bookings
  VALIDATE CONSTRAINT bookings_public_policy_snapshot_integrity;

CREATE OR REPLACE FUNCTION public.guard_public_booking_snapshot_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF (
    OLD.public_booking_policy_snapshot IS NOT NULL
    OR NEW.public_booking_policy_snapshot IS NOT NULL
  ) AND (
    NEW.public_booking_policy_snapshot IS DISTINCT FROM OLD.public_booking_policy_snapshot
    OR NEW.total_price IS DISTINCT FROM OLD.total_price
    OR NEW.total_amount_cents IS DISTINCT FROM OLD.total_amount_cents
    OR NEW.payment_currency IS DISTINCT FROM OLD.payment_currency
    OR NEW.booking_duration IS DISTINCT FROM OLD.booking_duration
    OR NEW.customer_country IS DISTINCT FROM OLD.customer_country
    OR NEW.customer_vat_id IS DISTINCT FROM OLD.customer_vat_id
  ) THEN
    RAISE EXCEPTION 'PUBLIC_BOOKING_SNAPSHOT_IMMUTABLE'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_public_booking_snapshot_immutability()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS guard_public_booking_snapshot_immutability
  ON public.bookings;
CREATE TRIGGER guard_public_booking_snapshot_immutability
  BEFORE UPDATE OF
    public_booking_policy_snapshot,
    total_price,
    total_amount_cents,
    payment_currency,
    booking_duration,
    customer_country,
    customer_vat_id
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_public_booking_snapshot_immutability();

-- Serialize an optional booking's pay-on-site transition with payment-ledger
-- creation. The booking FOR UPDATE lock also conflicts with the FK key-share lock
-- taken by a concurrent booking_payments/whatsapp_payment_sessions insert.
CREATE OR REPLACE FUNCTION public.defer_public_booking_payment_on_site(
  p_booking_id uuid,
  p_expected_booking_status text,
  p_expected_payment_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'BOOKING_NOT_FOUND',
      'error', 'Booking not found.'
    );
  END IF;

  IF v_booking.status IS DISTINCT FROM p_expected_booking_status
     OR v_booking.payment_status IS DISTINCT FROM p_expected_payment_status THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'BOOKING_CHANGED_DURING_PAY_ON_SITE',
      'error', 'The booking changed before pay on site could be saved.'
    );
  END IF;

  IF jsonb_typeof(v_booking.public_booking_policy_snapshot) IS DISTINCT FROM 'object'
     OR v_booking.public_booking_policy_snapshot ->> 'version' IS DISTINCT FROM '1'
     OR v_booking.public_booking_policy_snapshot ->> 'payment_optional' IS DISTINCT FROM 'true'
     OR NOT (
       v_booking.public_booking_policy_snapshot -> 'allowed_payment_timing'
       @> '["pay_on_site"]'::jsonb
     ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAY_ON_SITE_NOT_AVAILABLE',
      'error', 'Pay on site is not available for this booking.'
    );
  END IF;

  -- Lock in the same order used by the payment state machine: booking, web
  -- payments, then hosted/WhatsApp sessions. Any pending provider object blocks.
  PERFORM 1
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN ('pending', 'processing')
    AND NULLIF(btrim(payment.stripe_payment_intent_id), '') IS NOT NULL
  ORDER BY payment.id
  FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PENDING_PAYMENT_ATTEMPT_EXISTS',
      'error', 'An initialized online payment must be completed or cancelled first.'
    );
  END IF;

  PERFORM 1
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
    AND session.payment_status IN ('pending', 'processing')
    AND (
      NULLIF(btrim(session.stripe_session_id), '') IS NOT NULL
      OR NULLIF(btrim(session.stripe_payment_intent_id), '') IS NOT NULL
    )
  ORDER BY session.id
  FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PENDING_PAYMENT_ATTEMPT_EXISTS',
      'error', 'An initialized online payment must be completed or cancelled first.'
    );
  END IF;

  UPDATE public.bookings
  SET
    payment_timing = 'pay_on_site',
    payment_status = 'pay_on_site',
    payment_required = false
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN jsonb_build_object(
    'success', true,
    'payment_timing', 'pay_on_site',
    'booking', to_jsonb(v_booking)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.defer_public_booking_payment_on_site(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.defer_public_booking_payment_on_site(uuid, text, text)
  TO service_role;

COMMENT ON FUNCTION public.defer_public_booking_payment_on_site(uuid, text, text) IS
  'R45 service-role-only atomic optional-payment defer. Locks the booking and rejects any pending Stripe PaymentIntent or Checkout session before changing local state.';

CREATE OR REPLACE FUNCTION public.commit_public_booking(
  p_calendar_slug text,
  p_service_type_id uuid,
  p_start_time timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_notes text,
  p_customer_country text,
  p_customer_vat_id text,
  p_customer_locale text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_service public.service_types%ROWTYPE;
  v_settings public.payment_settings%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_validation jsonb;
  v_payment_required boolean;
  v_price numeric;
  v_price_cents integer;
  v_end_time timestamptz;
  v_currency text;
  v_captured_at timestamptz := now();
  v_policy_snapshot jsonb;
  v_enabled_payment_methods jsonb;
  v_allowed_payment_timing jsonb;
  v_customer_country text;
  v_customer_vat_id text;
  v_tax_enabled boolean;
  v_tax_code text;
  v_tax_behavior text;
  v_applicable_tax_rate numeric;
  v_business_country text;
  v_supply_type text;
BEGIN
  IF NULLIF(btrim(p_calendar_slug), '') IS NULL
     OR p_service_type_id IS NULL
     OR p_start_time IS NULL
     OR NULLIF(btrim(p_customer_name), '') IS NULL
     OR NULLIF(btrim(p_customer_email), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_BOOKING_INPUT',
      'error', 'Required booking fields are missing.'
    );
  END IF;

  v_customer_country := upper(NULLIF(btrim(p_customer_country), ''));
  IF v_customer_country IS NOT NULL
     AND v_customer_country !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_BOOKING_INPUT',
      'error', 'Customer country must be an ISO alpha-2 code.'
    );
  END IF;

  v_customer_vat_id := upper(NULLIF(
    regexp_replace(
      COALESCE(p_customer_vat_id, ''),
      '[[:space:].-]',
      '',
      'g'
    ),
    ''
  ));
  IF v_customer_vat_id IS NOT NULL
     AND v_customer_vat_id !~ '^[A-Z]{2}[A-Z0-9]{2,12}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_BOOKING_INPUT',
      'error', 'Customer VAT ID has an invalid format.'
    );
  END IF;

  SELECT calendar.id
  INTO v_calendar_id
  FROM public.calendars AS calendar
  WHERE calendar.slug = p_calendar_slug
    AND calendar.is_active = true
    AND COALESCE(calendar.is_deleted, false) = false
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'CALENDAR_NOT_FOUND',
      'error', 'Calendar not found.'
    );
  END IF;

  SELECT service.*
  INTO v_service
  FROM public.service_types AS service
  WHERE service.id = p_service_type_id
    AND service.calendar_id = v_calendar_id
    AND service.is_active = true
    AND COALESCE(service.is_deleted, false) = false
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'SERVICE_NOT_FOUND',
      'error', 'Service not found.'
    );
  END IF;

  -- Capture the effective tax inputs now. No later charge may read these fields
  -- from service_types again.
  v_tax_enabled := COALESCE(v_service.tax_enabled, false);
  v_tax_code := NULLIF(btrim(v_service.tax_code), '');
  v_tax_behavior := CASE
    WHEN v_service.tax_behavior = 'inclusive' THEN 'inclusive'
    ELSE 'exclusive'
  END;
  v_applicable_tax_rate := v_service.applicable_tax_rate;
  v_business_country := upper(COALESCE(
    NULLIF(btrim(v_service.business_country), ''),
    'NL'
  ));
  v_supply_type := COALESCE(v_service.supply_type::text, 'in_person');

  IF v_business_country !~ '^[A-Z]{2}$'
     OR v_supply_type NOT IN ('in_person', 'remote_service', 'digital')
     OR (
       v_applicable_tax_rate IS NOT NULL
       AND (
         v_applicable_tax_rate < 0
         OR v_applicable_tax_rate > 100
       )
     ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PUBLIC_BOOKING_TAX_POLICY_INVALID',
      'error', 'Service tax policy cannot be captured safely.'
    );
  END IF;

  v_currency := CASE
    WHEN v_business_country = 'GB' THEN 'gbp'
    ELSE 'eur'
  END;

  SELECT settings.*
  INTO v_settings
  FROM public.payment_settings AS settings
  WHERE settings.calendar_id = v_calendar_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_POLICY_UNAVAILABLE',
      'error', 'Booking payment policy is unavailable.'
    );
  END IF;

  IF v_settings.secure_payments_enabled IS NULL
     OR v_settings.payment_required_for_booking IS NULL
     OR v_settings.payment_optional IS NULL
     OR v_settings.auto_cancel_unpaid_bookings IS NULL
     OR v_settings.payout_option IS NULL
     OR v_settings.payout_option NOT IN ('standard', 'instant')
     OR jsonb_typeof(v_settings.enabled_payment_methods) IS DISTINCT FROM 'array'
     OR jsonb_typeof(v_settings.allowed_payment_timing) IS DISTINCT FROM 'array'
     OR (
       v_settings.payment_deadline_hours IS NOT NULL
       AND v_settings.payment_deadline_hours <= 0
     ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_POLICY_UNAVAILABLE',
      'error', 'Booking payment policy is incomplete.'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_settings.allowed_payment_timing) AS timing(value)
    WHERE jsonb_typeof(timing.value) <> 'string'
      OR lower(btrim(timing.value #>> '{}')) NOT IN ('pay_now', 'pay_on_site')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_POLICY_UNAVAILABLE',
      'error', 'Booking payment policy contains invalid options.'
    );
  END IF;

  v_enabled_payment_methods :=
    public.normalize_public_booking_payment_methods(
      v_settings.enabled_payment_methods,
      v_currency
    );
  IF v_enabled_payment_methods IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_POLICY_UNAVAILABLE',
      'error', 'Booking payment policy contains an unknown or currency-incompatible payment method.'
    );
  END IF;

  SELECT COALESCE(
    jsonb_agg(normalized.timing ORDER BY normalized.first_ordinal),
    '[]'::jsonb
  )
  INTO v_allowed_payment_timing
  FROM (
    SELECT
      lower(btrim(timing.value #>> '{}')) AS timing,
      min(timing.ordinality) AS first_ordinal
    FROM jsonb_array_elements(v_settings.allowed_payment_timing)
      WITH ORDINALITY AS timing(value, ordinality)
    GROUP BY lower(btrim(timing.value #>> '{}'))
  ) AS normalized;

  IF jsonb_array_length(v_allowed_payment_timing) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_POLICY_UNAVAILABLE',
      'error', 'Booking payment policy has no allowed payment timing.'
    );
  END IF;

  v_payment_required := v_settings.secure_payments_enabled
    AND v_settings.payment_required_for_booking
    AND NOT v_settings.payment_optional;

  IF v_payment_required AND (
    NOT (v_allowed_payment_timing @> '["pay_now"]'::jsonb)
    OR jsonb_array_length(v_enabled_payment_methods) = 0
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PAYMENT_POLICY_UNAVAILABLE',
      'error', 'Required online payment has no payable configuration.'
    );
  END IF;

  IF v_service.price IS NULL
     OR v_service.price < 0
     OR v_service.price > 21474836.47 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PUBLIC_BOOKING_PRICE_INVALID',
      'error', 'Service price cannot be captured safely.'
    );
  END IF;
  -- Store the amount at the same two-decimal precision used for the integer charge.
  -- This keeps total_price and total_amount_cents one canonical immutable snapshot.
  v_price := round(v_service.price::numeric, 2);
  v_price_cents := round(v_price * 100)::integer;

  IF v_payment_required AND v_price_cents <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'PUBLIC_BOOKING_PRICE_INVALID',
      'error', 'A required payment needs a positive service price.'
    );
  END IF;

  IF v_service.duration IS NULL OR v_service.duration NOT BETWEEN 1 AND 1440 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'SERVICE_DURATION_INVALID',
      'error', 'Service duration is invalid.'
    );
  END IF;

  v_end_time := p_start_time + make_interval(mins => v_service.duration);

  v_validation := public.validate_booking_security(
    p_calendar_slug,
    p_service_type_id,
    p_start_time,
    v_end_time,
    p_customer_email
  );

  IF v_validation IS NULL OR v_validation ->> 'valid' IS DISTINCT FROM 'true' THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'VALIDATION_FAILED',
      'error', 'Booking validation failed.',
      'errors', COALESCE(v_validation -> 'errors', '[]'::jsonb)
    );
  END IF;

  v_policy_snapshot := jsonb_build_object(
    'version', 1,
    'captured_at', v_captured_at,
    'secure_payments_enabled', v_settings.secure_payments_enabled,
    'payment_required_for_booking', v_settings.payment_required_for_booking,
    'payment_optional', v_settings.payment_optional,
    'payment_required', v_payment_required,
    'enabled_payment_methods', v_enabled_payment_methods,
    'allowed_payment_timing', v_allowed_payment_timing,
    'payout_option', v_settings.payout_option,
    'payment_deadline_hours', v_settings.payment_deadline_hours,
    'auto_cancel_unpaid_bookings', v_settings.auto_cancel_unpaid_bookings,
    'tax', jsonb_build_object(
      'tax_enabled', v_tax_enabled,
      'tax_code', v_tax_code,
      'tax_behavior', v_tax_behavior,
      'applicable_tax_rate', v_applicable_tax_rate,
      'business_country', v_business_country,
      'supply_type', v_supply_type,
      'customer_country', v_customer_country,
      'customer_vat_id', v_customer_vat_id
    )
  );

  INSERT INTO public.bookings (
    calendar_id,
    service_type_id,
    customer_name,
    customer_email,
    customer_phone,
    start_time,
    end_time,
    notes,
    customer_country,
    customer_vat_id,
    customer_locale,
    status,
    confirmation_token,
    service_name,
    booking_duration,
    total_price,
    total_amount_cents,
    payment_currency,
    payment_required,
    payment_status,
    payment_deadline,
    public_booking_policy_snapshot
  ) VALUES (
    v_calendar_id,
    v_service.id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_start_time,
    v_end_time,
    p_notes,
    v_customer_country,
    v_customer_vat_id,
    p_customer_locale,
    'pending',
    gen_random_uuid()::text,
    v_service.name,
    v_service.duration,
    v_price,
    v_price_cents,
    v_currency,
    v_payment_required,
    CASE WHEN v_payment_required THEN 'pending' ELSE 'none' END,
    CASE
      WHEN v_payment_required
        AND v_settings.auto_cancel_unpaid_bookings
        AND v_settings.payment_deadline_hours IS NOT NULL
      THEN v_captured_at + make_interval(hours => v_settings.payment_deadline_hours)
      ELSE NULL
    END,
    v_policy_snapshot
  )
  RETURNING * INTO v_booking;

  RETURN jsonb_build_object(
    'success', true,
    'payment_required', v_payment_required,
    'booking', to_jsonb(v_booking)
  );
EXCEPTION
  WHEN exclusion_violation OR deadlock_detected THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'SLOT_TAKEN',
      'error', 'This time slot is no longer available.'
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.commit_public_booking(
  text, uuid, timestamptz, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.commit_public_booking(
  text, uuid, timestamptz, text, text, text, text, text, text, text
) TO service_role;

COMMENT ON FUNCTION public.commit_public_booking(
  text, uuid, timestamptz, text, text, text, text, text, text, text
) IS
  'R45 service-role-only public booking commit. Locks authoritative calendar/service/payment policy rows, derives end_time from service duration, validates the derived slot, and atomically inserts immutable policy and price snapshots.';
