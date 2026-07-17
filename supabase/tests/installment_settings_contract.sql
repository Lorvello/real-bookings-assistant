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
    '00000000-0000-0000-0000-00000000d301',
    'installment-owner-a@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Installment Owner A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-00000000d302',
    'installment-owner-b@example.invalid',
    'authenticated',
    'authenticated',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Installment Owner B"}'::jsonb,
    now(),
    now()
  );

UPDATE public.users
SET subscription_tier = 'professional'
WHERE id IN (
  '00000000-0000-0000-0000-00000000d301',
  '00000000-0000-0000-0000-00000000d302'
);

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES
  (
    '00000000-0000-0000-0000-00000000e301',
    '00000000-0000-0000-0000-00000000d301',
    'Installment Contract A',
    'installment-contract-a',
    true
  ),
  (
    '00000000-0000-0000-0000-00000000e302',
    '00000000-0000-0000-0000-00000000d302',
    'Installment Contract B',
    'installment-contract-b',
    true
  );

INSERT INTO public.service_types (
  id,
  calendar_id,
  name,
  duration,
  price,
  installments_enabled
)
VALUES
  (
    '00000000-0000-0000-0000-00000000f301',
    '00000000-0000-0000-0000-00000000e301',
    'Owner A paid service',
    60,
    100,
    false
  ),
  (
    '00000000-0000-0000-0000-00000000f302',
    '00000000-0000-0000-0000-00000000e301',
    'Owner A free service',
    30,
    0,
    false
  ),
  (
    '00000000-0000-0000-0000-00000000f303',
    '00000000-0000-0000-0000-00000000e302',
    'Owner B paid service',
    60,
    100,
    false
  );

DO $test$
DECLARE
  v_default text;
BEGIN
  SELECT column_default
  INTO v_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'default_installment_plan';

  IF v_default NOT LIKE '%"type": "preset"%'
     OR v_default NOT LIKE '%"preset": "50_50"%' THEN
    RAISE EXCEPTION 'installment default is still malformed: %', v_default;
  END IF;

  IF has_function_privilege(
    'anon',
    'public.apply_installment_settings(uuid,boolean,boolean,jsonb,text,jsonb)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'public.apply_installment_settings(uuid,boolean,boolean,jsonb,text,jsonb)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.apply_installment_settings(uuid,boolean,boolean,jsonb,text,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'atomic installment RPC grants are incorrect';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE oid = 'public.apply_installment_settings(uuid,boolean,boolean,jsonb,text,jsonb)'::regprocedure
      AND NOT (
        prosecdef
        AND proconfig @> ARRAY['search_path=""']::text[]
      )
  ) THEN
    RAISE EXCEPTION 'atomic installment RPC hardening is incomplete';
  END IF;
END;
$test$;

SET LOCAL ROLE service_role;
SELECT public.apply_installment_settings(
  '00000000-0000-0000-0000-00000000d301',
  true,
  true,
  '{"type":"preset","preset":"50_50"}'::jsonb,
  'selected',
  '[{
    "serviceTypeId":"00000000-0000-0000-0000-00000000f301",
    "enabled":true,
    "plan":{"type":"preset","preset":"50_50"},
    "allowCustomerChoice":true
  }]'::jsonb
);
RESET ROLE;

DO $test$
DECLARE
  v_failed boolean := false;
BEGIN
  BEGIN
    PERFORM public.apply_installment_settings(
      '00000000-0000-0000-0000-00000000d301',
      true,
      false,
      '{"type":"custom","deposits":[
        {"percentage":20,"timing":"now"},
        {"percentage":20,"timing":"appointment"}
      ]}'::jsonb,
      'all',
      '[]'::jsonb
    );
  EXCEPTION
    WHEN invalid_parameter_value THEN
      v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'invalid 40-percent default plan was accepted';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM public.apply_installment_settings(
      '00000000-0000-0000-0000-00000000d301',
      true,
      false,
      '{"type":"preset","preset":"50_50","unexpected":true}'::jsonb,
      'all',
      '[]'::jsonb
    );
  EXCEPTION
    WHEN invalid_parameter_value THEN
      v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'strict runtime plan accepted an unknown field';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM public.apply_installment_settings(
      '00000000-0000-0000-0000-00000000d301',
      true,
      false,
      '{"type":"preset","preset":"25_25_50"}'::jsonb,
      'all',
      '[]'::jsonb
    );
  EXCEPTION
    WHEN invalid_parameter_value THEN
      v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'unsupported delayed preset was accepted';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM public.apply_installment_settings(
      '00000000-0000-0000-0000-00000000d301',
      true,
      false,
      '{"type":"custom","deposits":[
        {"amount":40,"timing":"now"},
        {"amount":40,"timing":"appointment"}
      ]}'::jsonb,
      'all',
      '[]'::jsonb
    );
  EXCEPTION
    WHEN check_violation THEN
      v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'EUR 80 amount plan was accepted for a EUR 100 service';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM public.apply_installment_settings(
      '00000000-0000-0000-0000-00000000d301',
      true,
      false,
      '{"type":"preset","preset":"fixed_deposit","fixed_deposit_amount":150}'::jsonb,
      'all',
      '[]'::jsonb
    );
  EXCEPTION
    WHEN check_violation THEN
      v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'EUR 150 fixed deposit was accepted for a EUR 100 service';
  END IF;

  v_failed := false;
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = '00000000-0000-0000-0000-00000000d301'
      AND installments_enabled IS TRUE
      AND installment_scope = 'selected'
      AND allow_customer_installment_choice IS FALSE
      AND default_installment_plan =
        '{"type":"preset","preset":"50_50"}'::jsonb
  ) THEN
    RAISE EXCEPTION 'selected owner state was not saved';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.service_installment_configs
    WHERE service_type_id = '00000000-0000-0000-0000-00000000f301'
      AND enabled IS TRUE
      AND allow_customer_choice IS FALSE
      AND preset_plan = '50_50'
  ) THEN
    RAISE EXCEPTION 'selected service config was not saved';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.service_types
    WHERE calendar_id = '00000000-0000-0000-0000-00000000e301'
      AND installments_enabled IS TRUE
  ) THEN
    RAISE EXCEPTION 'selected mode leaked into all-service flags';
  END IF;

  BEGIN
    PERFORM public.apply_installment_settings(
      '00000000-0000-0000-0000-00000000d301',
      true,
      true,
      '{"type":"preset","preset":"100_at_booking"}'::jsonb,
      'selected',
      '[{
        "serviceTypeId":"00000000-0000-0000-0000-00000000f303",
        "enabled":true,
        "plan":{"type":"preset","preset":"50_50"},
        "allowCustomerChoice":true
      }]'::jsonb
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'foreign service config did not fail closed';
  END IF;
END;
$test$;

CREATE FUNCTION public.installment_contract_injected_failure()
RETURNS trigger
LANGUAGE plpgsql
AS $trigger$
BEGIN
  IF NEW.id = '00000000-0000-0000-0000-00000000d301'
     AND NEW.default_installment_plan IS DISTINCT FROM OLD.default_installment_plan THEN
    RAISE EXCEPTION 'INSTALLMENT_CONTRACT_INJECTED_FAILURE';
  END IF;
  RETURN NEW;
END;
$trigger$;

CREATE TRIGGER installment_contract_injected_failure
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.installment_contract_injected_failure();

DO $test$
DECLARE
  v_failed boolean := false;
BEGIN
  BEGIN
    PERFORM public.apply_installment_settings(
      '00000000-0000-0000-0000-00000000d301',
      true,
      true,
      '{"type":"preset","preset":"100_at_booking"}'::jsonb,
      'all',
      '[]'::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT LIKE '%INSTALLMENT_CONTRACT_INJECTED_FAILURE%' THEN
        RAISE;
      END IF;
      v_failed := true;
  END;

  IF NOT v_failed THEN
    RAISE EXCEPTION 'injected final-write failure did not fire';
  END IF;

  -- Every earlier service/config mutation must have rolled back with the final write.
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = '00000000-0000-0000-0000-00000000d301'
      AND installment_scope = 'selected'
      AND default_installment_plan =
        '{"type":"preset","preset":"50_50"}'::jsonb
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.service_installment_configs
    WHERE service_type_id = '00000000-0000-0000-0000-00000000f301'
      AND enabled IS TRUE
  ) OR EXISTS (
    SELECT 1
    FROM public.service_types
    WHERE calendar_id = '00000000-0000-0000-0000-00000000e301'
      AND installments_enabled IS TRUE
  ) THEN
    RAISE EXCEPTION 'atomic save exposed partial state after an injected failure';
  END IF;
END;
$test$;

DROP TRIGGER installment_contract_injected_failure ON public.users;
DROP FUNCTION public.installment_contract_injected_failure();

SET LOCAL ROLE service_role;
SELECT public.apply_installment_settings(
  '00000000-0000-0000-0000-00000000d301',
  true,
  false,
  '{"type":"preset","preset":"100_at_booking"}'::jsonb,
  'all',
  '[]'::jsonb
);
RESET ROLE;

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = '00000000-0000-0000-0000-00000000d301'
      AND installments_enabled IS TRUE
      AND installment_scope = 'all'
      AND allow_customer_installment_choice IS FALSE
      AND default_installment_plan =
        '{"type":"preset","preset":"100_at_booking"}'::jsonb
  ) THEN
    RAISE EXCEPTION 'all-services owner state was not saved';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.service_installment_configs AS config
    JOIN public.service_types AS service
      ON service.id = config.service_type_id
    WHERE service.calendar_id = '00000000-0000-0000-0000-00000000e301'
  ) THEN
    RAISE EXCEPTION 'all-services mode retained a shadowing override';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.service_types
    WHERE id = '00000000-0000-0000-0000-00000000f301'
      AND installments_enabled IS TRUE
      AND custom_installment_plan =
        '{"type":"preset","preset":"100_at_booking"}'::jsonb
  ) OR EXISTS (
    SELECT 1
    FROM public.service_types
    WHERE id = '00000000-0000-0000-0000-00000000f302'
      AND installments_enabled IS TRUE
  ) THEN
    RAISE EXCEPTION 'all-services flags did not match paid-service scope';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'INSTALLMENT_SETTINGS_CONTRACT_PASS' AS result;
