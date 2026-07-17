-- R13: make WhatsApp booking-payment persistence replay-safe.
--
-- Stripe idempotency guarantees one provider session per booking request, but the
-- local ledger previously had no booking link and no uniqueness for either
-- stripe_session_id or installment number. A retry could therefore create duplicate
-- schedules or leave a payment session that could not be traced to its booking.

ALTER TABLE public.whatsapp_payment_sessions
  ADD COLUMN IF NOT EXISTS booking_id uuid
  REFERENCES public.bookings(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS
  whatsapp_payment_sessions_booking_id_key
ON public.whatsapp_payment_sessions (booking_id)
WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  whatsapp_payment_sessions_stripe_session_id_key
ON public.whatsapp_payment_sessions (stripe_session_id)
WHERE stripe_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  installment_payments_booking_number_key
ON public.installment_payments (booking_id, installment_number);

ALTER TABLE public.whatsapp_payment_sessions
  DROP CONSTRAINT IF EXISTS whatsapp_payment_sessions_positive_amount,
  ADD CONSTRAINT whatsapp_payment_sessions_positive_amount
    CHECK (amount_cents > 0) NOT VALID;

ALTER TABLE public.installment_payments
  DROP CONSTRAINT IF EXISTS installment_payments_positive_amount,
  ADD CONSTRAINT installment_payments_positive_amount
    CHECK (amount_cents > 0) NOT VALID,
  DROP CONSTRAINT IF EXISTS installment_payments_valid_position,
  ADD CONSTRAINT installment_payments_valid_position
    CHECK (
      installment_number >= 1
      AND total_installments >= 1
      AND installment_number <= total_installments
    ) NOT VALID;

COMMENT ON COLUMN public.whatsapp_payment_sessions.booking_id IS
  'Authoritative booking linked to this hosted payment session; unique when present.';
