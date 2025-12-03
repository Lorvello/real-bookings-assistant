-- Fix handle_new_user() function to use fully qualified extensions.digest()
-- This fixes the "function digest(text, unknown) does not exist" error during OAuth signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  qr_data_json text;
BEGIN
  -- Generate QR code data as JSON string
  -- Use extensions.digest() with fully qualified schema name
  qr_data_json := json_build_object(
    'user_id', NEW.id,
    'app', 'bookingassistant',
    'type', 'user_profile',
    'created', extract(epoch from NOW()),
    'hash', encode(extensions.digest(NEW.id::text || extract(epoch from NOW())::text, 'sha256'), 'hex')
  )::text;

  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    subscription_status,
    subscription_tier,
    trial_start_date,
    trial_end_date,
    business_name,
    business_type,
    qr_code_data,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'phone',
    'trial',
    'professional',
    NOW(),
    NOW() + interval '30 days',
    NULL,
    NULL,
    qr_data_json,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;