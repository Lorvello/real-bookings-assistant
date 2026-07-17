
-- Activeer de pgcrypto extensie voor gen_random_bytes functie
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update de generate_confirmation_token functie om een fallback te hebben
CREATE OR REPLACE FUNCTION public.generate_confirmation_token()
RETURNS text AS $$
BEGIN
  -- Probeer eerst gen_random_bytes, fall back naar random als het niet werkt
  BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
  EXCEPTION WHEN OTHERS THEN
    -- Fallback naar een simpelere random string
    RETURN md5(random()::text || clock_timestamp()::text);
  END;
END;
$$ LANGUAGE plpgsql;
