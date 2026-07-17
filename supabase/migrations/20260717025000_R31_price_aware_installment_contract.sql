-- R31: make persisted installment plans valid for the service price that will
-- actually be charged. Shape-only validation accepted e.g. EUR 40 + EUR 40 for
-- a EUR 100 service and a EUR 150 fixed deposit for that same service, while the
-- Edge runtime correctly rejected both only after a customer tried to pay.

CREATE OR REPLACE FUNCTION public.installment_plan_is_runtime_valid_for_price(
  p_plan jsonb,
  p_service_price numeric
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_deposit jsonb;
  v_amount_total_cents numeric := 0;
BEGIN
  IF p_service_price IS NULL
     OR p_service_price <= 0
     OR NOT public.installment_plan_is_runtime_valid(p_plan) THEN
    RETURN false;
  END IF;

  IF p_plan->>'type' = 'preset'
     AND p_plan->>'preset' = 'fixed_deposit' THEN
    RETURN round((p_plan->>'fixed_deposit_amount')::numeric * 100)
      BETWEEN 1 AND round(p_service_price * 100) - 1;
  END IF;

  IF p_plan->>'type' = 'custom'
     AND jsonb_array_length(p_plan->'deposits') = 2
     AND (p_plan->'deposits'->0) ? 'amount' THEN
    FOR v_deposit IN SELECT value FROM jsonb_array_elements(p_plan->'deposits')
    LOOP
      v_amount_total_cents := v_amount_total_cents
        + round((v_deposit->>'amount')::numeric * 100);
    END LOOP;
    RETURN v_amount_total_cents = round(p_service_price * 100);
  END IF;

  -- Valid percentage plans and the fixed 100%/50-50 presets scale with price.
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.installment_plan_is_runtime_valid_for_price(jsonb, numeric)
  FROM PUBLIC, anon, authenticated;

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.service_types AS service
    WHERE service.installments_enabled IS TRUE
      AND NOT public.installment_plan_is_runtime_valid_for_price(
        service.custom_installment_plan,
        service.price
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.service_installment_configs AS config
    JOIN public.service_types AS service
      ON service.id = config.service_type_id
    WHERE config.enabled IS TRUE
      AND NOT public.installment_plan_is_runtime_valid_for_price(
        CASE
          WHEN config.plan_type = 'preset' THEN jsonb_strip_nulls(
            jsonb_build_object(
              'type', 'preset',
              'preset', config.preset_plan,
              'fixed_deposit_amount', config.fixed_deposit_amount
            )
          )
          ELSE jsonb_build_object(
            'type', 'custom',
            'deposits', config.custom_deposits
          )
        END,
        service.price
      )
  ) THEN
    RAISE EXCEPTION
      'INSTALLMENT_LEGACY_PLAN_PRICE_REQUIRES_EXPLICIT_RECONCILIATION'
      USING ERRCODE = '23514';
  END IF;
END;
$preflight$;

ALTER TABLE public.service_types
  DROP CONSTRAINT IF EXISTS service_types_installment_plan_price_check,
  ADD CONSTRAINT service_types_installment_plan_price_check CHECK (
    installments_enabled IS NOT TRUE
    OR public.installment_plan_is_runtime_valid_for_price(
      custom_installment_plan,
      price
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_service_installment_plan_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_service_price numeric;
  v_plan jsonb;
BEGIN
  IF NEW.enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT service.price
  INTO v_service_price
  FROM public.service_types AS service
  WHERE service.id = NEW.service_type_id;

  v_plan := CASE
    WHEN NEW.plan_type = 'preset' THEN jsonb_strip_nulls(
      jsonb_build_object(
        'type', 'preset',
        'preset', NEW.preset_plan,
        'fixed_deposit_amount', NEW.fixed_deposit_amount
      )
    )
    ELSE jsonb_build_object(
      'type', 'custom',
      'deposits', NEW.custom_deposits
    )
  END;

  IF NOT public.installment_plan_is_runtime_valid_for_price(
    v_plan,
    v_service_price
  ) THEN
    RAISE EXCEPTION 'INSTALLMENT_PLAN_PRICE_INVALID'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_service_installment_plan_price()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_service_installment_plan_price
  ON public.service_installment_configs;
CREATE TRIGGER enforce_service_installment_plan_price
BEFORE INSERT OR UPDATE OF
  service_type_id,
  enabled,
  plan_type,
  preset_plan,
  custom_deposits,
  fixed_deposit_amount
ON public.service_installment_configs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_service_installment_plan_price();

COMMENT ON FUNCTION public.installment_plan_is_runtime_valid_for_price(jsonb, numeric) IS
  'R31 mirrors Edge installment rounding: fixed deposits must be below the service price and custom amount installments must total the service price exactly in cents.';
