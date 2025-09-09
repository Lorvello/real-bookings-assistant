-- Create missing payment settings for existing calendars that don't have them
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
)
SELECT 
  c.id,
  false,
  false,
  true,
  24,
  true,
  2.50,
  '["ideal"]'::jsonb,
  'standard'
FROM public.calendars c
LEFT JOIN public.payment_settings ps ON ps.calendar_id = c.id
WHERE ps.id IS NULL;

-- Fix duplicate stripe accounts with null platform_account_id
UPDATE public.business_stripe_accounts 
SET platform_account_id = 'acct_1RqIgEPyiLcfGjGY'
WHERE platform_account_id IS NULL;

-- Additional security fixes: Create a general audit function
CREATE OR REPLACE FUNCTION public.log_error(p_calendar_id uuid, p_error_type text, p_error_message text, p_error_context jsonb DEFAULT NULL::jsonb, p_user_id uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.error_logs (calendar_id, error_type, error_message, error_context, user_id)
  VALUES (p_calendar_id, p_error_type, p_error_message, p_error_context, p_user_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;