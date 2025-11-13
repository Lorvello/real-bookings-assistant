-- Fix generate_confirmation_token to use gen_random_uuid instead of gen_random_bytes
-- This avoids schema prefix issues and simplifies the code

CREATE OR REPLACE FUNCTION public.generate_confirmation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Gebruik gen_random_uuid() dat altijd beschikbaar is
  -- Verwijder hyphens voor een compactere token string
  RETURN replace(gen_random_uuid()::text, '-', '');
END;
$$;

-- Test de functie om zeker te zijn dat het werkt
DO $$
DECLARE
  test_token text;
BEGIN
  test_token := generate_confirmation_token();
  RAISE NOTICE 'Test token generated successfully: %', substring(test_token, 1, 10) || '...';
END;
$$;