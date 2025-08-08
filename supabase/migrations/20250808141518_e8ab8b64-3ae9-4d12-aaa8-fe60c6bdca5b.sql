-- Add QR code data column to users table
ALTER TABLE public.users ADD COLUMN qr_code_data text;

-- Update the handle_new_user function to generate QR code data
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
  qr_data_json := json_build_object(
    'user_id', NEW.id,
    'app', 'bookingassistant',
    'type', 'user_profile',
    'created', extract(epoch from NOW()),
    'hash', encode(digest(NEW.id::text || extract(epoch from NOW())::text, 'sha256'), 'hex')
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