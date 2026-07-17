export interface BookingPaymentLedgerIdentity {
  booking_id: string;
  stripe_payment_intent_id: string;
  stripe_account_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  currency: string;
  status: string;
  stripe_mode: "test" | "live";
}

/**
 * A Stripe idempotency replay is safe to reuse only when the durable local row
 * represents the exact same booking, destination and money amounts.
 */
export function bookingPaymentLedgerMatches(
  existing: Partial<BookingPaymentLedgerIdentity> | null | undefined,
  expected: BookingPaymentLedgerIdentity,
): boolean {
  if (!existing) return false;
  return existing.booking_id === expected.booking_id &&
    existing.stripe_payment_intent_id === expected.stripe_payment_intent_id &&
    existing.stripe_account_id === expected.stripe_account_id &&
    existing.amount_cents === expected.amount_cents &&
    existing.platform_fee_cents === expected.platform_fee_cents &&
    existing.currency === expected.currency &&
    existing.status === expected.status &&
    existing.stripe_mode === expected.stripe_mode;
}
