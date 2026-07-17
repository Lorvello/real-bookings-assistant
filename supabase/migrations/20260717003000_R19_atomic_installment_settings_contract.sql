-- R19: make installment configuration one canonical, atomic contract.
--
-- Before this migration manage-installment-settings performed up to four independent
-- PostgREST writes. A failure in the final users write could therefore leave services
-- enabled with a new plan while the owner row and per-service configs still described
-- the old state. The UI also had no persisted source for the all-vs-selected scope.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS installment_scope text NOT NULL DEFAULT 'all';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_installment_scope_check,
  ADD CONSTRAINT users_installment_scope_check
    CHECK (installment_scope IN ('all', 'selected'));

-- Recover the only scope that can be inferred unambiguously from legacy rows.
UPDATE public.users AS owner_profile
SET installment_scope = 'selected'
WHERE owner_profile.installments_enabled IS TRUE
  AND EXISTS (
    SELECT 1
    FROM public.calendars AS calendar
    JOIN public.service_types AS service
      ON service.calendar_id = calendar.id
    JOIN public.service_installment_configs AS config
      ON config.service_type_id = service.id
    WHERE calendar.user_id = owner_profile.id
      AND config.enabled IS TRUE
  );

-- Legacy all-services saves only disabled old overrides instead of removing them.
-- whatsapp-payment-handler gives any override row precedence, so those disabled rows
-- shadow an enabled service and fail with INSTALLMENTS_NOT_ENABLED. Once scope has been
-- recovered, all-mode owners must not retain per-service override rows.
DELETE FROM public.service_installment_configs AS config
USING public.service_types AS service,
      public.calendars AS calendar,
      public.users AS owner_profile
WHERE config.service_type_id = service.id
  AND service.calendar_id = calendar.id
  AND calendar.user_id = owner_profile.id
  AND owner_profile.installment_scope = 'all';

-- The original column default used {type:"50_50", deposits:[...]}; every current
-- consumer requires {type:"preset", preset:"50_50"}. Normalize legacy preset values
-- before adding a lightweight shape constraint.
ALTER TABLE public.users
  ALTER COLUMN default_installment_plan
  SET DEFAULT '{"type":"preset","preset":"50_50"}'::jsonb;

CREATE OR REPLACE FUNCTION public.installment_deposits_are_runtime_valid(
  p_deposits jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_deposit jsonb;
  v_percentage_count integer := 0;
  v_amount_count integer := 0;
  v_now_count integer := 0;
  v_percentage_total numeric := 0;
BEGIN
  IF jsonb_typeof(p_deposits) <> 'array'
     OR jsonb_array_length(p_deposits) <> 2 THEN
    RETURN false;
  END IF;

  FOR v_deposit IN SELECT value FROM jsonb_array_elements(p_deposits)
  LOOP
    IF jsonb_typeof(v_deposit) <> 'object'
       OR EXISTS (
         SELECT 1
         FROM jsonb_object_keys(v_deposit) AS key_name
         WHERE key_name NOT IN ('percentage', 'amount', 'timing')
       )
       OR v_deposit->>'timing' NOT IN ('now', 'appointment') THEN
      RETURN false;
    END IF;

    IF v_deposit->>'timing' = 'now' THEN
      v_now_count := v_now_count + 1;
    END IF;

    IF v_deposit ? 'percentage' THEN
      IF v_deposit ? 'amount'
         OR jsonb_typeof(v_deposit->'percentage') <> 'number'
         OR (v_deposit->>'percentage')::numeric <= 0
         OR (v_deposit->>'percentage')::numeric > 100 THEN
        RETURN false;
      END IF;
      v_percentage_count := v_percentage_count + 1;
      v_percentage_total := v_percentage_total
        + (v_deposit->>'percentage')::numeric;
    ELSIF v_deposit ? 'amount' THEN
      IF jsonb_typeof(v_deposit->'amount') <> 'number'
         OR (v_deposit->>'amount')::numeric <= 0 THEN
        RETURN false;
      END IF;
      v_amount_count := v_amount_count + 1;
    ELSE
      RETURN false;
    END IF;
  END LOOP;

  RETURN v_now_count = 1
    AND (
      (v_percentage_count = 2 AND v_amount_count = 0
        AND abs(v_percentage_total - 100) < 0.000001)
      OR (v_amount_count = 2 AND v_percentage_count = 0)
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.installment_plan_is_runtime_valid(p_plan jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_type text;
  v_preset text;
BEGIN
  IF jsonb_typeof(p_plan) <> 'object' THEN
    RETURN false;
  END IF;

  v_type := p_plan->>'type';
  IF v_type = 'preset' THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(p_plan) AS key_name
      WHERE key_name NOT IN ('type', 'preset', 'fixed_deposit_amount')
    ) THEN
      RETURN false;
    END IF;
    v_preset := p_plan->>'preset';
    IF v_preset NOT IN ('100_at_booking', '50_50', 'fixed_deposit') THEN
      RETURN false;
    END IF;
    RETURN (
      v_preset = 'fixed_deposit'
      AND jsonb_typeof(p_plan->'fixed_deposit_amount') = 'number'
      AND (p_plan->>'fixed_deposit_amount')::numeric > 0
    ) OR (
      v_preset <> 'fixed_deposit'
      AND NOT (p_plan ? 'fixed_deposit_amount')
    );
  END IF;

  IF v_type = 'custom' THEN
    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(p_plan) AS key_name
      WHERE key_name NOT IN ('type', 'deposits')
    ) THEN
      RETURN false;
    END IF;
    RETURN public.installment_deposits_are_runtime_valid(p_plan->'deposits');
  END IF;

  RETURN false;
END;
$function$;

REVOKE ALL ON FUNCTION public.installment_plan_is_runtime_valid(jsonb)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.installment_deposits_are_runtime_valid(jsonb)
FROM PUBLIC, anon, authenticated;

-- Delayed online collection was visible in an older settings UI, but the product has
-- no scheduler, customer-consent contract or retry path for it. Never silently rewrite
-- a merchant's existing payment agreement during deployment. A production preflight
-- must first identify and explicitly reconcile every unsupported legacy plan.
DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE default_installment_plan IS NOT NULL
      AND NOT public.installment_plan_is_runtime_valid(default_installment_plan)
      AND NOT (
        default_installment_plan->>'type' IN (
          '100_at_booking', '50_50', 'fixed_deposit'
        )
        AND (
          default_installment_plan->>'type' <> 'fixed_deposit'
          OR (
            jsonb_typeof(default_installment_plan->'fixed_deposit_amount') = 'number'
            AND (default_installment_plan->>'fixed_deposit_amount')::numeric > 0
          )
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.service_types
    WHERE custom_installment_plan IS NOT NULL
      AND NOT public.installment_plan_is_runtime_valid(custom_installment_plan)
      AND NOT (
        custom_installment_plan->>'type' IN (
          '100_at_booking', '50_50', 'fixed_deposit'
        )
        AND (
          custom_installment_plan->>'type' <> 'fixed_deposit'
          OR (
            jsonb_typeof(custom_installment_plan->'fixed_deposit_amount') = 'number'
            AND (custom_installment_plan->>'fixed_deposit_amount')::numeric > 0
          )
        )
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.service_installment_configs
    WHERE enabled IS TRUE
      AND NOT (
        (plan_type = 'preset'
          AND preset_plan IN ('100_at_booking', '50_50', 'fixed_deposit')
          AND (preset_plan <> 'fixed_deposit'
            OR (fixed_deposit_amount IS NOT NULL AND fixed_deposit_amount > 0)))
        OR (plan_type = 'custom'
          AND public.installment_deposits_are_runtime_valid(custom_deposits))
      )
  ) THEN
    RAISE EXCEPTION
      'INSTALLMENT_LEGACY_PLAN_REQUIRES_EXPLICIT_RECONCILIATION'
      USING ERRCODE = '23514';
  END IF;
END;
$preflight$;

UPDATE public.users
SET default_installment_plan = CASE
  WHEN default_installment_plan IS NULL THEN
    '{"type":"preset","preset":"50_50"}'::jsonb
  WHEN default_installment_plan->>'type' IN (
    '100_at_booking', '50_50', 'fixed_deposit'
  ) THEN
    jsonb_strip_nulls(
      jsonb_build_object(
        'type', 'preset',
        'preset', default_installment_plan->>'type',
        'fixed_deposit_amount', default_installment_plan->'fixed_deposit_amount'
      )
    )
  WHEN public.installment_plan_is_runtime_valid(default_installment_plan) THEN
    default_installment_plan
  ELSE
    default_installment_plan
END;

ALTER TABLE public.service_installment_configs
  DROP CONSTRAINT IF EXISTS service_installment_configs_preset_plan_check,
  ADD CONSTRAINT service_installment_configs_preset_plan_check CHECK (
    preset_plan IS NULL
    OR preset_plan IN ('100_at_booking', '50_50', 'fixed_deposit')
  ),
  DROP CONSTRAINT IF EXISTS service_installment_configs_no_delayed_collection_check,
  ADD CONSTRAINT service_installment_configs_no_delayed_collection_check CHECK (
    NOT jsonb_path_exists(
      COALESCE(custom_deposits, '[]'::jsonb),
      '$[*] ? (@.timing == "hours_after")'
    )
  ),
  DROP CONSTRAINT IF EXISTS service_installment_configs_plan_shape_check,
  ADD CONSTRAINT service_installment_configs_plan_shape_check CHECK (
    enabled IS NOT TRUE
    OR (
      plan_type = 'preset'
      AND preset_plan IN ('100_at_booking', '50_50', 'fixed_deposit')
      AND (
        preset_plan <> 'fixed_deposit'
        OR (fixed_deposit_amount IS NOT NULL AND fixed_deposit_amount > 0)
      )
    )
    OR (
      plan_type = 'custom'
      AND public.installment_deposits_are_runtime_valid(custom_deposits)
    )
  );

ALTER TABLE public.users
  ALTER COLUMN default_installment_plan SET NOT NULL,
  DROP CONSTRAINT IF EXISTS users_default_installment_plan_shape_check,
  ADD CONSTRAINT users_default_installment_plan_shape_check CHECK (
    public.installment_plan_is_runtime_valid(default_installment_plan)
  );

ALTER TABLE public.service_types
  DROP CONSTRAINT IF EXISTS service_types_installment_plan_shape_check,
  ADD CONSTRAINT service_types_installment_plan_shape_check CHECK (
    custom_installment_plan IS NULL
    OR public.installment_plan_is_runtime_valid(custom_installment_plan)
  );

-- The legacy "customer chooses" flags were never consumed by the booking/payment
-- journeys. Keeping them true would advertise a financial choice that does not exist:
-- WhatsApp requires the configured first installment, while the public booking page
-- follows its own full-payment or no-online-payment setting. Preserve the columns and
-- RPC argument for rolling-deployment compatibility, but canonicalize them fail-closed.
UPDATE public.users
SET allow_customer_installment_choice = false
WHERE allow_customer_installment_choice IS DISTINCT FROM false;

ALTER TABLE public.users
  ALTER COLUMN allow_customer_installment_choice SET DEFAULT false,
  ALTER COLUMN allow_customer_installment_choice SET NOT NULL,
  DROP CONSTRAINT IF EXISTS users_installment_customer_choice_disabled_check,
  ADD CONSTRAINT users_installment_customer_choice_disabled_check
    CHECK (allow_customer_installment_choice IS FALSE);

UPDATE public.service_installment_configs
SET allow_customer_choice = false
WHERE allow_customer_choice IS DISTINCT FROM false;

ALTER TABLE public.service_installment_configs
  ALTER COLUMN allow_customer_choice SET DEFAULT false,
  ALTER COLUMN allow_customer_choice SET NOT NULL,
  DROP CONSTRAINT IF EXISTS service_installment_customer_choice_disabled_check,
  ADD CONSTRAINT service_installment_customer_choice_disabled_check
    CHECK (allow_customer_choice IS FALSE);

DROP FUNCTION IF EXISTS public.apply_installment_settings(
  uuid,
  boolean,
  boolean,
  jsonb,
  text,
  jsonb
);

CREATE FUNCTION public.apply_installment_settings(
  p_owner_id uuid,
  p_enabled boolean,
  p_allow_customer_choice boolean,
  p_default_plan jsonb,
  p_apply_to_services text,
  p_service_configs jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_owned_service_count integer;
  v_config_count integer;
BEGIN
  IF p_owner_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users AS owner_profile
    WHERE owner_profile.id = p_owner_id
      AND owner_profile.account_owner_id IS NULL
  ) THEN
    RAISE EXCEPTION 'INSTALLMENT_OWNER_INVALID' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(p_apply_to_services, '') NOT IN ('all', 'selected') THEN
    RAISE EXCEPTION 'INSTALLMENT_SCOPE_INVALID' USING ERRCODE = '22023';
  END IF;

  IF NOT public.installment_plan_is_runtime_valid(p_default_plan) THEN
    RAISE EXCEPTION 'INSTALLMENT_DEFAULT_PLAN_INVALID' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(COALESCE(p_service_configs, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'INSTALLMENT_CONFIGS_INVALID' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_service_configs, '[]'::jsonb)) AS config
    WHERE NOT public.installment_plan_is_runtime_valid(config->'plan')
  ) THEN
    RAISE EXCEPTION 'INSTALLMENT_CONFIGS_INVALID' USING ERRCODE = '22023';
  END IF;

  -- Serialize concurrent owner saves before changing any dependent row. Every statement
  -- below is part of this one RPC transaction; an exception rolls the complete save back.
  PERFORM 1
  FROM public.users AS owner_profile
  WHERE owner_profile.id = p_owner_id
  FOR UPDATE;

  SELECT count(*)
  INTO v_owned_service_count
  FROM public.calendars AS calendar
  JOIN public.service_types AS service
    ON service.calendar_id = calendar.id
  WHERE calendar.user_id = p_owner_id;

  SELECT count(*)
  INTO v_config_count
  FROM jsonb_array_elements(COALESCE(p_service_configs, '[]'::jsonb));

  IF p_apply_to_services = 'selected' AND p_enabled AND v_config_count = 0 THEN
    RAISE EXCEPTION 'INSTALLMENT_SELECTED_SERVICES_REQUIRED'
      USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(DISTINCT config->>'serviceTypeId')
    FROM jsonb_array_elements(COALESCE(p_service_configs, '[]'::jsonb)) AS config
  ) <> v_config_count THEN
    RAISE EXCEPTION 'INSTALLMENT_CONFIG_DUPLICATE_SERVICE'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_service_configs, '[]'::jsonb)) AS config
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.calendars AS calendar
      JOIN public.service_types AS service
        ON service.calendar_id = calendar.id
      WHERE calendar.user_id = p_owner_id
        AND service.id = (config->>'serviceTypeId')::uuid
    )
  ) THEN
    RAISE EXCEPTION 'INSTALLMENT_SERVICE_NOT_OWNED' USING ERRCODE = '42501';
  END IF;

  UPDATE public.service_types AS service
  SET
    installments_enabled = false,
    custom_installment_plan = NULL
  FROM public.calendars AS calendar
  WHERE service.calendar_id = calendar.id
    AND calendar.user_id = p_owner_id;

  IF p_apply_to_services = 'all' THEN
    -- A disabled legacy config shadows service_types in whatsapp-payment-handler. Delete
    -- all per-service overrides when all-services mode is canonical, so no stale row can
    -- make an otherwise enabled service fail with INSTALLMENTS_NOT_ENABLED.
    DELETE FROM public.service_installment_configs AS config
    USING public.service_types AS service, public.calendars AS calendar
    WHERE config.service_type_id = service.id
      AND service.calendar_id = calendar.id
      AND calendar.user_id = p_owner_id;

    IF p_enabled THEN
      UPDATE public.service_types AS service
      SET
        installments_enabled = true,
        custom_installment_plan = p_default_plan
      FROM public.calendars AS calendar
      WHERE service.calendar_id = calendar.id
        AND calendar.user_id = p_owner_id
        AND service.price > 0;
    END IF;
  ELSE
    -- Selected mode is a complete replacement, not a merge with invisible stale rows.
    DELETE FROM public.service_installment_configs AS config
    USING public.service_types AS service, public.calendars AS calendar
    WHERE config.service_type_id = service.id
      AND service.calendar_id = calendar.id
      AND calendar.user_id = p_owner_id;

    INSERT INTO public.service_installment_configs (
      service_type_id,
      enabled,
      plan_type,
      preset_plan,
      custom_deposits,
      fixed_deposit_amount,
      allow_customer_choice
    )
    SELECT
      (config->>'serviceTypeId')::uuid,
      COALESCE((config->>'enabled')::boolean, true),
      config->'plan'->>'type',
      CASE
        WHEN config->'plan'->>'type' = 'preset'
          THEN config->'plan'->>'preset'
        ELSE NULL
      END,
      CASE
        WHEN config->'plan'->>'type' = 'custom'
          THEN config->'plan'->'deposits'
        ELSE '[]'::jsonb
      END,
      CASE
        WHEN config->'plan'->>'preset' = 'fixed_deposit'
          THEN (config->'plan'->>'fixed_deposit_amount')::numeric
        ELSE NULL
      END,
      false
    FROM jsonb_array_elements(COALESCE(p_service_configs, '[]'::jsonb)) AS config;
  END IF;

  UPDATE public.users
  SET
    installments_enabled = p_enabled,
    default_installment_plan = p_default_plan,
    allow_customer_installment_choice = false,
    installment_scope = p_apply_to_services
  WHERE id = p_owner_id;

  RETURN jsonb_build_object(
    'success', true,
    'enabled', p_enabled,
    'applyToServices', p_apply_to_services,
    'ownedServiceCount', v_owned_service_count,
    'configuredServiceCount', v_config_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_installment_settings(
  uuid,
  boolean,
  boolean,
  jsonb,
  text,
  jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_installment_settings(
  uuid,
  boolean,
  boolean,
  jsonb,
  text,
  jsonb
) TO service_role;
