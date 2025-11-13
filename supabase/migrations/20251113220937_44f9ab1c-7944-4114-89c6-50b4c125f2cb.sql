-- Fix validate_booking_insert to remove dependency on gen_random_bytes and use public.generate_confirmation_token()
-- Also set a safe search_path to public so referenced functions resolve correctly

CREATE OR REPLACE FUNCTION public.validate_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Validate required fields
  IF NEW.customer_name IS NULL OR trim(NEW.customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  
  IF NEW.customer_email IS NULL OR NEW.customer_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Valid customer email is required';
  END IF;
  
  IF NEW.start_time <= now() THEN
    RAISE EXCEPTION 'Cannot book appointments in the past';
  END IF;
  
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  -- Sanitize input data
  NEW.customer_name := trim(NEW.customer_name);
  NEW.customer_email := lower(trim(NEW.customer_email));
  
  -- Generate confirmation token if not provided
  IF NEW.confirmation_token IS NULL OR NEW.confirmation_token = '' THEN
    NEW.confirmation_token := public.generate_confirmation_token();
  END IF;
  
  RETURN NEW;
END;
$function$;