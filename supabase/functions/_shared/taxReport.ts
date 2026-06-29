/**
 * Shared tax-report helpers.
 *
 * F-TAX-02 fix: a single authoritative source for the tax cents on a booking
 * PaymentIntent, used by BOTH generate-tax-report and export-tax-report so the
 * VAT figures match exactly.
 *
 * Data model (proven against Stripe TEST):
 *  - The charged total `paymentIntent.amount` is always the GROSS (tax-inclusive
 *    of the total) in both tax behaviors.
 *  - Stripe's automatic_tax path populates `amount_details.tax.amount` (cents).
 *  - BA's manual-tax path (the common case: a service with tax_enabled that is
 *    not on a professional/enterprise automatic_tax PI) writes the tax into the
 *    PI metadata as `tax_amount` (a EUR string, e.g. "21.00").
 *  - A plain PaymentIntent has NO `amount_details.tax`, so reading only that
 *    field returned 0 for every manual-tax booking, collapsing net to gross and
 *    reporting a 0% VAT rate. This helper resolves the authoritative tax in
 *    priority order so net = gross - tax and rate = tax / net are exact.
 */

interface AmountDetailsTax {
  amount_details?: { tax?: { amount?: number | null } | null } | null;
  metadata?: Record<string, string> | null;
}

/**
 * Resolve the authoritative tax amount (in cents) for a booking PaymentIntent.
 * Priority: Stripe automatic_tax amount_details.tax.amount -> BA metadata
 * tax_amount (EUR string -> cents) -> 0.
 */
export function resolvePaymentTaxCents(paymentIntent: AmountDetailsTax): number {
  const autoTaxCents = paymentIntent.amount_details?.tax?.amount;
  if (typeof autoTaxCents === 'number' && autoTaxCents > 0) {
    return autoTaxCents;
  }

  const metaTax = paymentIntent.metadata?.tax_amount;
  if (typeof metaTax === 'string' && metaTax.length > 0) {
    const eur = Number.parseFloat(metaTax);
    if (Number.isFinite(eur) && eur > 0) {
      return Math.round(eur * 100);
    }
  }

  return 0;
}
