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

/**
 * F-TAX-17: a PaymentIntent shape carrying the authoritative refund figure.
 *
 * Reports MUST read the refund from Stripe (not from the BA DB columns), so the
 * figure is correct regardless of whether a refund webhook has fired. The
 * authoritative refunded cents on a PI live on its latest charge
 * (`charge.amount_refunded`). When the report retrieves the PI it expands
 * `latest_charge`, so `latest_charge.amount_refunded` is available. We also
 * tolerate older shapes (`charges.data[0].amount_refunded` when `expand`ing the
 * charges list, or a flat `amount_refunded` if a charge object is passed).
 */
interface RefundablePaymentIntent {
  amount_refunded?: number | null;
  latest_charge?: { amount_refunded?: number | null } | string | null;
  charges?: { data?: Array<{ amount_refunded?: number | null }> | null } | null;
}

/**
 * Resolve the authoritative refunded amount (in cents) for a booking
 * PaymentIntent. Reads `latest_charge.amount_refunded` first (the report
 * retrieves the PI with `expand: ['latest_charge']`), then falls back to the
 * legacy `charges.data[0].amount_refunded`, then a flat `amount_refunded`.
 * Returns 0 when nothing was refunded (or only an unexpanded charge id is
 * present, which carries no figure to read).
 */
export function resolveRefundedCents(paymentIntent: RefundablePaymentIntent): number {
  const latest = paymentIntent.latest_charge;
  if (latest && typeof latest === 'object') {
    const c = latest.amount_refunded;
    if (typeof c === 'number' && c > 0) return c;
  }

  const fromList = paymentIntent.charges?.data?.[0]?.amount_refunded;
  if (typeof fromList === 'number' && fromList > 0) return fromList;

  const flat = paymentIntent.amount_refunded;
  if (typeof flat === 'number' && flat > 0) return flat;

  return 0;
}

export interface TaxReportRow {
  /** kept gross (gross minus the refunded amount), in cents */
  grossCents: number;
  /** kept tax (tax prorated to the kept net), in cents */
  taxCents: number;
  /** kept net (kept gross minus kept tax), in cents */
  netCents: number;
  /** refunded amount that was removed from the original gross, in cents */
  refundedCents: number;
  /** true when the original gross was fully refunded (kept gross == 0) */
  fullyRefunded: boolean;
}

/**
 * F-TAX-17: compute the refund-adjusted, per-row tax figures for one booking
 * payment, in CENTS, so a refunded booking is never reported at full gross+VAT.
 *
 * Inputs (all cents):
 *  - grossOrigCents = paymentIntent.amount (the original charged total).
 *  - taxOrigCents   = resolvePaymentTaxCents(pi) (the original tax).
 *  - refundedCents  = resolveRefundedCents(pi) (authoritative refund from Stripe).
 *
 * Arithmetic (deterministic, jurisdiction-agnostic; the refunded amount is
 * removed from the taxable base, the rate is unchanged):
 *  - netOrig   = grossOrig - taxOrig
 *  - keptGross = max(0, grossOrig - refunded)
 *  - keptTax   = netOrig > 0 ? round(taxOrig * keptNetProportion) : 0, where the
 *               proportion is keptNet/netOrig. We compute keptTax by prorating on
 *               GROSS (keptGross/grossOrig) which equals the net proportion when
 *               the rate is uniform, then derive keptNet = keptGross - keptTax so
 *               the row stays internally consistent (keptGross == keptNet+keptTax).
 *  - FULL refund (refunded >= grossOrig): 0 / 0 / 0, fullyRefunded = true.
 *
 * Prorating on gross keeps row arithmetic exact to the cent (keptNet is derived,
 * not independently rounded), and for a uniform-rate booking gross-proportion ==
 * net-proportion, so keptTax = taxOrig * keptNet/netOrig as specified.
 */
export function computeRefundAdjustedRow(
  grossOrigCents: number,
  taxOrigCents: number,
  refundedCents: number,
): TaxReportRow {
  const gross = Math.max(0, Math.round(grossOrigCents));
  const tax = Math.max(0, Math.round(taxOrigCents));
  const refunded = Math.max(0, Math.round(refundedCents));

  // No refund: unchanged, refund-aware shape.
  if (refunded <= 0) {
    const net = gross - tax;
    return { grossCents: gross, taxCents: tax, netCents: net, refundedCents: 0, fullyRefunded: false };
  }

  // Full (or over-) refund: nothing is kept, so 0 gross / 0 tax / 0 net.
  if (refunded >= gross) {
    return { grossCents: 0, taxCents: 0, netCents: 0, refundedCents: gross, fullyRefunded: true };
  }

  // Partial refund: prorate the kept tax to the kept gross. keptTax/keptGross ==
  // tax/gross, and keptNet = keptGross - keptTax stays exact (no double rounding).
  const keptGross = gross - refunded;
  const keptTax = gross > 0 ? Math.round((tax * keptGross) / gross) : 0;
  const keptNet = keptGross - keptTax;

  return {
    grossCents: keptGross,
    taxCents: keptTax,
    netCents: keptNet,
    refundedCents: refunded,
    fullyRefunded: false,
  };
}

/**
 * F-TAX-18: decide the per-country registration status from the merchant's
 * AGGREGATE revenue (summed across all of the owner's calendars), not a single
 * calendar's revenue. registration_required when aggregate >= threshold;
 * registration_recommended at >= 80% of the threshold. Pure + deterministic so a
 * multi-calendar same-country aggregate can be unit-asserted.
 */
export function computeRegistrationStatus(
  aggregateRevenue: number,
  thresholdAmount: number,
): { registrationRequired: boolean; registrationRecommended: boolean } {
  return {
    registrationRequired: aggregateRevenue >= thresholdAmount,
    registrationRecommended: aggregateRevenue >= thresholdAmount * 0.8,
  };
}
