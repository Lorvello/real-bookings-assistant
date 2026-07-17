BEGIN;

INSERT INTO auth.users (
  id,
  email,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  '47000000-0000-4000-8000-000000000001',
  'r47-victim@example.test',
  now(),
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  'authenticated',
  'authenticated'
);

UPDATE public.users
SET subscription_tier = 'enterprise'
WHERE id = '47000000-0000-4000-8000-000000000001';

DO $test$
BEGIN
  IF has_function_privilege(
       'anon',
       'public.get_user_subscription_tier(uuid)',
       'EXECUTE'
     ) OR has_function_privilege(
       'authenticated',
       'public.get_user_subscription_tier(uuid)',
       'EXECUTE'
     ) OR NOT has_function_privilege(
       'service_role',
       'public.get_user_subscription_tier(uuid)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'subscription-tier RPC grants are incorrect';
  END IF;
END;
$test$;

SET LOCAL ROLE anon;
DO $test$
BEGIN
  BEGIN
    PERFORM public.get_user_subscription_tier(
      '47000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'anonymous role read another user subscription tier';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;

RESET ROLE;
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  BEGIN
    PERFORM public.get_user_subscription_tier(
      '47000000-0000-4000-8000-000000000001'
    );
    RAISE EXCEPTION 'authenticated role read an arbitrary user subscription tier';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;

RESET ROLE;
SET LOCAL ROLE service_role;
DO $test$
DECLARE
  v_tier text;
BEGIN
  SELECT public.get_user_subscription_tier(
    '47000000-0000-4000-8000-000000000001'
  ) INTO v_tier;

  IF v_tier <> 'enterprise' THEN
    RAISE EXCEPTION 'service role lost required subscription-tier lookup: %', v_tier;
  END IF;
END;
$test$;

RESET ROLE;
ROLLBACK;

SELECT 'SUBSCRIPTION_TIER_RPC_GRANTS_CONTRACT_PASS';
