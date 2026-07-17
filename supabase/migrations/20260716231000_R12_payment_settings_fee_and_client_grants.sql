-- R12: restore the owner settings UI without allowing clients to rewrite the
-- Bookings Assistant platform fee. The launch contract fixes that fee at 1.9%.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payment_settings
    WHERE platform_fee_percentage IS DISTINCT FROM 1.90
  ) THEN
    RAISE EXCEPTION
      'payment_settings contains a platform fee other than the reviewed 1.9%%';
  END IF;
END;
$$;

ALTER TABLE public.payment_settings
  DROP CONSTRAINT IF EXISTS payment_settings_platform_fee_fixed;
ALTER TABLE public.payment_settings
  ADD CONSTRAINT payment_settings_platform_fee_fixed
  CHECK (platform_fee_percentage = 1.90);

REVOKE INSERT, UPDATE, DELETE
  ON TABLE public.payment_settings
  FROM authenticated;
GRANT SELECT
  ON TABLE public.payment_settings
  TO authenticated;

GRANT INSERT (
  calendar_id,
  secure_payments_enabled,
  payment_required_for_booking,
  allow_partial_refunds,
  refund_policy_text,
  payment_deadline_hours,
  auto_cancel_unpaid_bookings,
  enabled_payment_methods,
  payout_option,
  payment_optional,
  allowed_payment_timing
) ON public.payment_settings TO authenticated;

GRANT UPDATE (
  secure_payments_enabled,
  payment_required_for_booking,
  allow_partial_refunds,
  refund_policy_text,
  payment_deadline_hours,
  auto_cancel_unpaid_bookings,
  enabled_payment_methods,
  payout_option,
  payment_optional,
  allowed_payment_timing
) ON public.payment_settings TO authenticated;

-- Pricing and authoritative Stripe price IDs are intentionally public product
-- configuration. The RLS policy already limits reads to active rows.
GRANT SELECT ON TABLE public.subscription_tiers TO anon, authenticated;
