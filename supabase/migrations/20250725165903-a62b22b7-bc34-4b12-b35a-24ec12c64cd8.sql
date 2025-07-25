-- Update handle_new_user to save phone number from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,                  -- Add phone field
    subscription_status,
    subscription_tier,
    trial_start_date,
    trial_end_date,
    business_name,      -- Keep NULL for setup incomplete
    business_type,      -- Keep NULL for setup incomplete
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'phone',  -- Extract phone from metadata
    'trial',
    'professional',
    NOW(),
    NOW() + interval '7 days',
    NULL,               -- Force NULL for setup incomplete
    NULL,               -- Force NULL for setup incomplete
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;