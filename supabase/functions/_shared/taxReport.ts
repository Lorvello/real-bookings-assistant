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

/**
 * F-TAX-21: retrieve a booking PaymentIntent in the CORRECT Stripe account context.
 *
 * The product has TWO charge models and the report retrieval must match each:
 *  - DESTINATION charges (create-booking-payment, whatsapp-payment-handler,
 *    create-checkout service bookings): created with transfer_data.destination +
 *    application_fee_amount and NO stripeAccount header, so the PI lives on the
 *    PLATFORM account. These are the REAL booking-flow charges.
 *  - DIRECT charges (create-installment-payment): created WITH a stripeAccount
 *    header, so the PI lives on the CONNECTED account.
 *
 * Before this fix the reports retrieved every PI with { stripeAccount: connected },
 * which is correct for installment PIs but throws `resource_missing` for the
 * destination-charge PIs that back real bookings, and the per-payment try silently
 * swallowed it -> the transaction was dropped -> filing reports showed EUR0 VAT on
 * real charges.
 *
 * This helper tries the PLATFORM context first (where the real booking-flow
 * destination charges live, the dominant case), then falls back to the CONNECTED
 * context (installment direct charges). If BOTH miss it RE-THROWS so the seam is
 * visible (callers log it as a dropped transaction instead of silently swallowing).
 * It does NOT change any charge economics; it only changes how the report READS the
 * PI back.
 *
 * `stripe` is a Stripe client. `Sentinel` typing kept loose (Deno esm import).
 */
export async function retrieveBookingPaymentIntent(
  // deno-lint-ignore no-explicit-any
  stripe: any,
  paymentIntentId: string,
  connectedAccountId: string,
  // deno-lint-ignore no-explicit-any
  expand: string[] = ['latest_charge'],
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const isResourceMissing = (err: unknown): boolean => {
    const e = err as { code?: string; statusCode?: number; rawType?: string } | null;
    return e?.code === 'resource_missing' || e?.statusCode === 404;
  };

  // 1) Platform context (no stripeAccount header) -> destination-charge PIs (real bookings).
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId, { expand });
  } catch (platformErr) {
    if (!isResourceMissing(platformErr)) {
      // A non-missing error (auth, network, rate-limit) is a real failure: re-throw.
      throw platformErr;
    }
    // 2) Connected-account context -> installment direct-charge PIs.
    try {
      return await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { expand },
        { stripeAccount: connectedAccountId },
      );
    } catch (connectedErr) {
      if (isResourceMissing(connectedErr)) {
        // Genuinely not found in either context: surface a clear, attributable error
        // so the caller can LOG the dropped transaction (no longer silently swallowed).
        throw new Error(
          `PaymentIntent ${paymentIntentId} not found in platform or connected (${connectedAccountId}) context (resource_missing in both)`,
        );
      }
      throw connectedErr;
    }
  }
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
 * F-TAX-23: build the booking_payments row for a WhatsApp / hosted-Checkout booking
 * payment, so the charge becomes visible to the tax filing reports.
 *
 * The WhatsApp pay-and-book path (whatsapp-payment-handler) creates a hosted Stripe
 * Checkout session and a whatsapp_payment_sessions row, but never a booking_payments
 * row. The web path (create-booking-payment) is the only inserter, and the tax reports
 * (generate-tax-report / export-tax-report) read FROM booking_payments, so a paid
 * WhatsApp VAT charge showed EUR0 in the filing report. On checkout.session.completed
 * the stripe-webhook now INSERTs a booking_payments row mirroring create-booking-payment.
 *
 * This builder is PURE (no IO) so the row shape can be unit-asserted. It mirrors
 * create-booking-payment's insert EXACTLY for the columns the reports + the
 * F-TAX-21 retrieveBookingPaymentIntent rely on:
 *  - stripe_payment_intent_id (UNIQUE -> the natural idempotency key)
 *  - stripe_account_id  = the CONNECTED account the destination charge transfers to
 *                         (transfer_data.destination), which is exactly the value the
 *                         reports filter booking_payments by. NOT the platform account.
 *  - amount_cents       = paymentIntent.amount (the GROSS total incl. tax).
 *  - currency           = paymentIntent.currency.
 *  - status 'succeeded' = the report filter is status IN (succeeded, completed).
 *  - platform_fee_cents = the application fee (so app-state stays consistent).
 *  - customer_email/name= carried from the booking for the report's display join.
 *  - payment_method_type= best-effort from the PI/charge.
 * The tax AMOUNT itself is read by the reports from the PI metadata.tax_amount (which
 * whatsapp-payment-handler stamps), NOT from this row.
 *
 * CROSS-BORDER (X3b-1): the row ALSO mirrors create-booking-payment's three X1 tax
 * columns so a WhatsApp remote/digital charge is report-visible with per-jurisdiction
 * VAT (X6) and reverse-charge 0% markers, not just a blended figure:
 *  - customer_country = the billing country the cross-border calc ran against (null for
 *                       in_person / domestic, no regression).
 *  - tax_breakdown    = Stripe's per-jurisdiction breakdown (+ any guard marker), the
 *                       same jsonb the web path persists; null when no calc ran.
 *  - reverse_charge   = true when a valid EU B2B reverse-charge 0% was applied.
 * These are sourced from the PI metadata stamped by whatsapp-payment-handler (the
 * webhook is the WhatsApp path's only inserter), so the F-TAX-23 idempotent insert now
 * also carries the cross-border fields. in_person / legacy callers omit them -> the row
 * defaults to null/null/false (byte-identical to before for the domestic case).
 */
export interface WhatsappPaymentRowInput {
  bookingId: string;
  paymentIntentId: string;
  connectedAccountId: string;
  amountCents: number;
  currency: string;
  applicationFeeCents?: number | null;
  customerEmail?: string | null;
  customerName?: string | null;
  paymentMethodType?: string | null;
  /** X3b-1: the cross-border billing country the calc ran against (null = domestic/in_person). */
  customerCountry?: string | null;
  /** X3b-1: Stripe's per-jurisdiction tax_breakdown (+ guard markers); null when no calc ran. */
  taxBreakdown?: unknown | null;
  /** X3b-1: true when a valid EU B2B reverse-charge 0% was applied. Defaults false. */
  reverseCharge?: boolean | null;
}

export interface BookingPaymentRow {
  booking_id: string;
  stripe_payment_intent_id: string;
  stripe_account_id: string;
  amount_cents: number;
  currency: string;
  platform_fee_cents: number;
  status: 'succeeded';
  customer_email: string | null;
  customer_name: string | null;
  payment_method_type: string | null;
  /** X3b-1 cross-border persistence (mirrors create-booking-payment). */
  customer_country: string | null;
  tax_breakdown: unknown | null;
  reverse_charge: boolean;
}

export function buildWhatsappBookingPaymentRow(input: WhatsappPaymentRowInput): BookingPaymentRow {
  return {
    booking_id: input.bookingId,
    stripe_payment_intent_id: input.paymentIntentId,
    stripe_account_id: input.connectedAccountId,
    amount_cents: Math.round(input.amountCents),
    currency: (input.currency || 'eur').toLowerCase(),
    platform_fee_cents: Math.max(0, Math.round(input.applicationFeeCents ?? 0)),
    status: 'succeeded',
    customer_email: input.customerEmail ?? null,
    customer_name: input.customerName ?? null,
    payment_method_type: input.paymentMethodType ?? null,
    // X3b-1: cross-border columns. Default null/false so the domestic / in_person /
    // legacy case stays byte-identical to the pre-X3b-1 row (no regression).
    customer_country: input.customerCountry ?? null,
    tax_breakdown: input.taxBreakdown ?? null,
    reverse_charge: input.reverseCharge === true,
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
