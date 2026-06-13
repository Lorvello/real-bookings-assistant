-- Pay & Book platform-fee consistentie (audit HIGH): de getoonde fee is 1,9% (het
-- gedocumenteerde verdienmodel, CLAUDE.md), maar de DB-default + trigger zetten 2,50%
-- en de charge-functies rekenen die door -> businesses werden 0,6pp te veel belast.
-- Eén waarheid: 1,90%. Kolom-default, trigger-default en bestaande (default-)rijen.

-- 1. Kolom-default naar 1.90
ALTER TABLE public.payment_settings
  ALTER COLUMN platform_fee_percentage SET DEFAULT 1.90;

-- 2. Trigger-default naar 1.90 (was 2.50 hardcoded)
CREATE OR REPLACE FUNCTION public.create_default_payment_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.payment_settings (
    calendar_id,
    payment_required_for_booking,
    secure_payments_enabled,
    auto_cancel_unpaid_bookings,
    payment_deadline_hours,
    allow_partial_refunds,
    platform_fee_percentage,
    enabled_payment_methods,
    payout_option
  ) VALUES (
    NEW.id,
    false,
    false,
    true,
    24,
    true,
    1.90,
    '["ideal"]'::jsonb,
    'standard'
  );
  RETURN NEW;
END;
$function$;

-- 3. Bestaande rijen die nog op de oude default 2.50 staan -> 1.90.
-- (Alle huidige rijen staan op de trigger-default 2.50; geen bewust aangepaste waarde.)
UPDATE public.payment_settings
  SET platform_fee_percentage = 1.90
  WHERE platform_fee_percentage = 2.50;
