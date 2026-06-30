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

// CB-F-10: the EU-member-state set is the SINGLE source of truth for EU-vs-non-EU OSS
// classification, shared with ossThreshold.isCrossBorderB2C so the report OSS bucket and
// the threshold monitor can NEVER diverge on which destinations are inside the EU.
import { isEuMemberState } from "./ossThreshold.ts";

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

// ---------------------------------------------------------------------------
// X6 (Cross-Border / OSS VAT loop): per-jurisdiction VAT summary + reverse-charge
// markers + OSS-eligible bucket for the tax reports.
//
// Until X6 the reports resolved ONE blended figure (taxBreakdown.standardRate =
// total tax / total net) which is correct for a single-jurisdiction NL merchant but
// loses information the moment cross-border charges exist: a Dutch VAT filing + an
// OSS return need the VAT collected PER destination country, a B2B reverse-charge 0%
// line must be auditable AS reverse-charge (not an indistinguishable bare 0%), and
// the cross-border B2C sales must tie to the X5 OSS EUR10k threshold.
//
// This resolver is PURE (no IO) and reads ONLY the AUTHORITATIVE persisted fields the
// charge paths write onto booking_payments at charge time (X1 columns):
//  - customer_country  : the destination/billing country the calc ran against.
//  - tax_breakdown      : Stripe's per-jurisdiction breakdown (+ any guard marker).
//  - reverse_charge     : true when a valid EU B2B reverse-charge 0% was applied.
// plus the per-row refund-adjusted money figures the report already computes via
// computeRefundAdjustedRow (so the per-jurisdiction VAT nets refunds exactly like the
// blended total, F-TAX-17 preserved).
//
// CB-F-04 (cosmetic, dispositioned here): on the guard / reverse-charge paths the
// charge fns also stamp a legacy `manual_tax_calculated=true` / `tax_rate=21` in the
// PI METADATA alongside the correct `tax_amount=0`. This resolver NEVER reads PI
// metadata.tax_rate; it reads the authoritative tax_breakdown + reverse_charge + the
// refund-adjusted taxCents, so the stale metadata cannot mislead the per-jurisdiction
// or reverse-charge output. The per-country VAT is taken from the row's kept taxCents
// (refund-adjusted), NOT recomputed from a metadata rate, so a 0% guard / reverse-
// charge row contributes 0 VAT and is shown distinctly, never a fabricated 21%.
//
// NOTE on country resolution: a row's tax_breakdown may carry the destination country
// even when customer_country was not separately persisted (legacy / older rows). We
// prefer customer_country (the X1 column) and fall back to the breakdown's country, so
// no taxed line is bucketed as "unknown" when the country is recoverable.
// ---------------------------------------------------------------------------

/** taxabilityReason markers that mean a B2B reverse-charge 0% line. */
const REVERSE_CHARGE_REASON = "reverse_charge";
/** taxabilityReason markers that mean the cross-border-rate-unavailable HARD GUARD. */
const CROSS_BORDER_GUARD_REASON = "cross_border_rate_unavailable";
/** taxabilityReason marker that means a domestic-rate-unavailable guard (CB-F-03). */
const DOMESTIC_GUARD_REASON = "domestic_rate_unavailable";

/** A persisted tax_breakdown entry (the normalized shape taxCalc.ts writes). */
interface PersistedBreakdownEntry {
  amountCents?: number | null;
  amount?: number | null;
  taxabilityReason?: string | null;
  country?: string | null;
  percentageDecimal?: string | null;
}

/** The per-jurisdiction line classification for a single report row. */
export type JurisdictionLineType =
  /** VAT was actually collected for this destination (a positive-rate line). */
  | "collected"
  /** A valid EU B2B reverse-charge 0% (auditable AS reverse-charge, not a bare 0%). */
  | "reverse_charge"
  /** EU cross-border with no registration: the X2 HARD GUARD (register for OSS). */
  | "cross_border_unavailable"
  /**
   * CB-F-10: a NON-EU cross-border destination (US / GB / CH ...). The OSS scheme is
   * EU-only, so this is NOT "register for OSS"; it is an out-of-OSS-scope marker. Still a
   * non-silent marker (never a clean 0%): the charge is Stripe-computed 0% / not
   * collecting today, but the report shows it DISTINCTLY as outside OSS.
   */
  | "non_eu_unavailable"
  /** Domestic with no usable rate: the CB-F-03 guard (never a silent 0%). */
  | "domestic_unavailable"
  /** Domestic / standard-rated NL (the manual NL fallback path) or any plain taxed line. */
  | "domestic";

/**
 * The minimal per-row input the X6 resolver needs. The caller passes the persisted
 * cross-border columns (authoritative) + the refund-adjusted money figures it already
 * computed for the blended total, so the per-jurisdiction figures net refunds exactly.
 */
export interface JurisdictionRowInput {
  /** booking_payments.customer_country (X1). null for in_person / domestic legacy. */
  customerCountry: string | null;
  /** booking_payments.tax_breakdown (X1). Stripe's per-jurisdiction breakdown + markers. */
  taxBreakdown: unknown;
  /** booking_payments.reverse_charge (X1). true for a valid EU B2B reverse-charge. */
  reverseCharge: boolean | null;
  /** kept gross (refund-adjusted) for this row, in cents (computeRefundAdjustedRow.grossCents). */
  grossCents: number;
  /** kept tax (refund-adjusted) for this row, in cents (computeRefundAdjustedRow.taxCents). */
  taxCents: number;
  /** kept net (refund-adjusted) for this row, in cents (computeRefundAdjustedRow.netCents). */
  netCents: number;
}

/** A per-country VAT summary line in the report. */
export interface JurisdictionSummaryLine {
  /** ISO-3166 alpha-2 destination country, or "UNKNOWN" when not recoverable. */
  country: string;
  /** number of transactions attributed to this country. */
  transactionCount: number;
  /** summed kept gross for this country, in cents. */
  grossCents: number;
  /** summed kept VAT collected for this country, in cents (refund-adjusted). */
  taxCents: number;
  /** summed kept net for this country, in cents. */
  netCents: number;
  /** effective rate for this country = tax / net * 100 (0 for 0%/guard/reverse lines). */
  effectiveRatePct: number;
  /** the line classification (collected / reverse_charge / guard / domestic). */
  lineType: JurisdictionLineType;
  /**
   * true when this country line is a B2B reverse-charge 0% (a marker so the UI / CSV
   * can show it DISTINCTLY from a not_collecting 0%). A country can have BOTH a
   * reverse-charge line and a collected line if it had both kinds of charges; this
   * resolver keys per (country + lineType) so they stay distinct.
   */
  reverseCharge: boolean;
}

export interface PerJurisdictionReport {
  /** one line per (country + lineType), so reverse-charge 0% is distinct from a bare 0%. */
  lines: JurisdictionSummaryLine[];
  /** total VAT collected across all positive-rate (collected/domestic) lines, in cents. */
  totalCollectedTaxCents: number;
  /** number of distinct destination countries seen (excluding UNKNOWN). */
  countryCount: number;
  /** count of rows that were B2B reverse-charge 0%. */
  reverseChargeTransactionCount: number;
  /**
   * count of rows that tripped the EU cross-border HARD GUARD (register for OSS). CB-F-10:
   * this counts ONLY EU destinations now; a non-EU guard/0% row is counted in
   * nonEuTransactionCount instead (it is NOT a "register for OSS" case).
   */
  crossBorderGuardTransactionCount: number;
  /**
   * CB-F-10: count of NON-EU cross-border rows (US / GB / CH ...). Outside OSS scope:
   * not counted toward the EUR10k bucket and NOT shown "register for OSS". Surfaced as a
   * non-silent marker so a non-EU remote sale is never an indistinguishable clean 0%.
   */
  nonEuTransactionCount: number;
  /**
   * the OSS-eligible bucket: EU cross-border B2C sales (customer_country IN EU,
   * != merchant, not reverse_charge), consistent with the X5 EUR10k definition, so the
   * report ties to get-tax-thresholds. Aggregated from the SAME refund-adjusted figures.
   * CB-F-10: non-EU destinations are EXCLUDED (OSS is EU-only).
   */
  ossEligible: {
    /** count of cross-border B2C transactions. */
    transactionCount: number;
    /** summed kept gross of cross-border B2C sales, in cents. */
    grossCents: number;
    /**
     * summed TAXABLE (net-of-VAT, net-of-refund) value of cross-border B2C sales, in
     * cents. This is the figure the X5 OSS EUR10k threshold is measured on (taxable
     * value), so the report's OSS bucket reconciles with get-tax-thresholds.
     */
    taxableCents: number;
    /** the destination countries that contributed to the OSS bucket. */
    countries: string[];
  };
}

/** Parse a persisted tax_breakdown into a typed entry array (defensive). */
function parsePersistedBreakdown(breakdown: unknown): PersistedBreakdownEntry[] {
  if (!Array.isArray(breakdown)) return [];
  const out: PersistedBreakdownEntry[] = [];
  for (const entry of breakdown) {
    if (entry && typeof entry === "object") out.push(entry as PersistedBreakdownEntry);
  }
  return out;
}

/** The destination country for a row: prefer the X1 column, fall back to the breakdown. */
function resolveRowCountry(
  customerCountry: string | null,
  entries: PersistedBreakdownEntry[],
): string {
  const cc = (customerCountry ?? "").toUpperCase();
  if (cc.length === 2) return cc;
  for (const e of entries) {
    const ec = (e.country ?? "").toUpperCase();
    if (ec.length === 2) return ec;
  }
  return "UNKNOWN";
}

/**
 * Classify a single report row into a per-jurisdiction line type, reading ONLY the
 * authoritative persisted fields (reverse_charge flag + the breakdown's taxability
 * reasons + the refund-adjusted taxCents), NEVER the stale PI metadata.tax_rate
 * (CB-F-04). Priority:
 *  1. reverse_charge flag OR a reverse_charge breakdown marker -> reverse_charge.
 *  2. a cross_border_rate_unavailable marker -> cross_border_unavailable (HARD GUARD).
 *  3. a domestic_rate_unavailable marker -> domestic_unavailable (CB-F-03 guard).
 *  4. positive kept tax -> collected.
 *  5. otherwise -> domestic (the plain NL / standard-rated / 0-tax exempt line).
 */
export function classifyJurisdictionLine(
  reverseCharge: boolean | null,
  entries: PersistedBreakdownEntry[],
  taxCents: number,
): JurisdictionLineType {
  const reasons = new Set(
    entries
      .map((e) => (typeof e.taxabilityReason === "string" ? e.taxabilityReason : ""))
      .filter((r) => r.length > 0),
  );
  if (reverseCharge === true || reasons.has(REVERSE_CHARGE_REASON)) return "reverse_charge";
  if (reasons.has(CROSS_BORDER_GUARD_REASON)) return "cross_border_unavailable";
  if (reasons.has(DOMESTIC_GUARD_REASON)) return "domestic_unavailable";
  if (taxCents > 0) return "collected";
  return "domestic";
}

/**
 * Sum the persisted tax cents on a breakdown (used only as a cross-check; the report
 * uses the refund-adjusted taxCents as the authoritative per-row VAT). Mirrors
 * ossThreshold.taxCentsFromBreakdown so the two layers agree.
 */
function breakdownTaxCents(entries: PersistedBreakdownEntry[]): number {
  let total = 0;
  for (const e of entries) {
    const v = typeof e.amountCents === "number" ? e.amountCents
      : typeof e.amount === "number" ? e.amount
      : 0;
    if (Number.isFinite(v) && v > 0) total += v;
  }
  return total;
}

/**
 * X6: reduce the report's per-row inputs to the per-jurisdiction VAT summary +
 * reverse-charge markers + OSS-eligible bucket. PURE (no IO). The caller has already
 * scoped + refund-adjusted the rows (one owner, one period). merchantCountry decides
 * the OSS cross-border boundary (matches the X5 isCrossBorderB2C definition).
 *
 * The per-country VAT is taken from each row's kept (refund-adjusted) taxCents, so it
 * reconciles to the cent with the blended totalTax. A row whose breakdown carries no
 * country falls under "UNKNOWN" (kept visible, never silently dropped).
 */
export function computePerJurisdictionReport(
  rows: JurisdictionRowInput[],
  merchantCountry: string,
): PerJurisdictionReport {
  const mc = (merchantCountry || "NL").toUpperCase();

  // key = `${country}::${lineType}` so a reverse-charge 0% line is a DISTINCT bucket
  // from a collected line for the same country (auditability).
  const lineMap = new Map<string, JurisdictionSummaryLine>();

  let totalCollectedTaxCents = 0;
  let reverseChargeTransactionCount = 0;
  let crossBorderGuardTransactionCount = 0;
  let nonEuTransactionCount = 0;

  let ossTxCount = 0;
  let ossGrossCents = 0;
  let ossTaxableCents = 0;
  const ossCountries = new Set<string>();
  const seenCountries = new Set<string>();

  for (const row of rows) {
    const entries = parsePersistedBreakdown(row.taxBreakdown);
    const country = resolveRowCountry(row.customerCountry, entries);
    let lineType = classifyJurisdictionLine(row.reverseCharge, entries, row.taxCents);

    // CB-F-10: the OSS scheme is EU-only. A cross-border (country != merchant, known)
    // destination that is NOT an EU member state must NOT be shown as the EU
    // "register for OSS" guard. Re-map a cross_border_unavailable line on a non-EU
    // destination to the distinct non_eu_unavailable marker (still non-silent: it is
    // shown as out-of-OSS-scope, never an indistinguishable clean 0%). Collected /
    // reverse-charge / domestic-guard lines are unchanged (a positive non-EU rate, if a
    // registration ever covered it, stays "collected"; reverse-charge is its own marker).
    const isKnownCrossBorder = country !== "UNKNOWN" && country !== mc;
    const isEu = isEuMemberState(country);
    if (lineType === "cross_border_unavailable" && isKnownCrossBorder && !isEu) {
      lineType = "non_eu_unavailable";
    }

    if (country !== "UNKNOWN") seenCountries.add(country);
    if (lineType === "reverse_charge") reverseChargeTransactionCount += 1;
    // crossBorderGuardTransactionCount is the "register for OSS" count -> EU only now.
    if (lineType === "cross_border_unavailable") crossBorderGuardTransactionCount += 1;
    if (lineType === "non_eu_unavailable") nonEuTransactionCount += 1;
    if (lineType === "collected" || lineType === "domestic") {
      totalCollectedTaxCents += Math.max(0, row.taxCents);
    }

    const key = `${country}::${lineType}`;
    const existing = lineMap.get(key);
    if (existing) {
      existing.transactionCount += 1;
      existing.grossCents += row.grossCents;
      existing.taxCents += row.taxCents;
      existing.netCents += row.netCents;
    } else {
      lineMap.set(key, {
        country,
        transactionCount: 1,
        grossCents: row.grossCents,
        taxCents: row.taxCents,
        netCents: row.netCents,
        effectiveRatePct: 0, // computed after accumulation
        lineType,
        reverseCharge: lineType === "reverse_charge",
      });
    }

    // OSS-eligible bucket: EU cross-border B2C (country IN EU, != merchant, not
    // reverse-charge), consistent with X5 isCrossBorderB2C (CB-F-10: EU-only). Taxable =
    // net-of-VAT, net-of-refund (the refund-adjusted netCents already excludes VAT +
    // refunds), matching the X5 taxableCents derivation so the report ties to
    // get-tax-thresholds. A non-EU destination is OUTSIDE OSS scope -> excluded.
    const isOssEligible = isKnownCrossBorder && isEu && lineType !== "reverse_charge";
    if (isOssEligible) {
      ossTxCount += 1;
      ossGrossCents += row.grossCents;
      ossTaxableCents += Math.max(0, row.netCents);
      ossCountries.add(country);
    }
  }

  // Finalize effective rate per line (tax / net * 100), 2 dp. 0 for guard / reverse /
  // 0-tax lines (net>0 but tax==0 -> 0%).
  const lines = Array.from(lineMap.values()).map((l) => ({
    ...l,
    effectiveRatePct: l.taxCents > 0 && l.netCents > 0
      ? Math.round((l.taxCents / l.netCents) * 100 * 100) / 100
      : 0,
  }));
  // Stable sort: by country, then collected/domestic before reverse_charge before guards.
  const typeOrder: Record<JurisdictionLineType, number> = {
    collected: 0,
    domestic: 1,
    reverse_charge: 2,
    cross_border_unavailable: 3,
    non_eu_unavailable: 4,
    domestic_unavailable: 5,
  };
  lines.sort((a, b) =>
    a.country === b.country
      ? typeOrder[a.lineType] - typeOrder[b.lineType]
      : a.country.localeCompare(b.country)
  );

  return {
    lines,
    totalCollectedTaxCents,
    countryCount: seenCountries.size,
    reverseChargeTransactionCount,
    crossBorderGuardTransactionCount,
    nonEuTransactionCount,
    ossEligible: {
      transactionCount: ossTxCount,
      grossCents: ossGrossCents,
      taxableCents: ossTaxableCents,
      countries: Array.from(ossCountries).sort(),
    },
  };
}

// Re-export the breakdown cross-check so report fns / tests can assert the persisted
// breakdown tax agrees with the refund-adjusted taxCents (belt-and-suspenders).
export { breakdownTaxCents as _breakdownTaxCentsForCrosscheck };

// ---------------------------------------------------------------------------
// CB-F-11 (filing-period boundary): the ONE canonical filing-period window for ALL the
// tax report functions (generate-tax-report, export-tax-report, get-tax-data), so the
// boundary can never diverge between them.
//
// THE BUG: the report fns computed the period END as `new Date(year, q*3, 0)` = the LAST
// DAY of the period at 00:00:00 (Deno edge runs TZ=UTC, so 2026-06-30T00:00:00.000Z for
// Q2), then filtered `created_at <= endDate`. So every charge created AFTER midnight on
// the last day of the period (essentially the ENTIRE last day: Jun 30 / Sep 30 / Dec 31
// / Mar 31, and the last day of every month) was SILENTLY DROPPED from the filing report,
// under-reporting the VAT filing the merchant submits. This affected the existing
// domestic NL filing too (real EUR VAT missing on a last-day booking), not only the
// cross-border lines.
//
// THE FIX: a HALF-OPEN interval [periodStart, nextPeriodStart) with an EXCLUSIVE upper
// bound at the START of the next period, so the whole last day is included and a charge
// at exactly 00:00:00.000 of the next period falls in the NEXT period (no gap, no
// double-count). All bounds are pinned in UTC (Date.UTC) to match the edge runtime and
// be deterministic regardless of the host TZ. Callers filter `created_at >= startIso AND
// created_at < endExclusiveIso` (note the strict `<`).
// ---------------------------------------------------------------------------

export type TaxReportPeriodType = "quarterly" | "monthly" | "annual";

export interface TaxReportPeriod {
  /** inclusive lower bound, ISO-8601 UTC (filter: created_at >= startIso). */
  startIso: string;
  /** EXCLUSIVE upper bound = start of the next period, ISO-8601 UTC (filter: created_at < endExclusiveIso). */
  endExclusiveIso: string;
}

/**
 * Compute the half-open filing-period window for a tax report. PURE + deterministic
 * (UTC), so the boundary is unit-assertable and identical across every report fn.
 *
 *  - quarterly: [year-Q1, start of next quarter)        e.g. Q2 2026 -> [Apr 1, Jul 1)
 *  - monthly:   [year-month-01, start of next month)    e.g. Jun 2026 -> [Jun 1, Jul 1)
 *  - annual:    [year-01-01, start of next year)        e.g. 2026     -> [Jan 1 2026, Jan 1 2027)
 *
 * The next-period start naturally rolls the year over (quarter 4 -> Jan 1 next year;
 * December -> Jan 1 next year) because Date.UTC normalizes an out-of-range month.
 */
export function computeReportPeriod(
  reportType: TaxReportPeriodType,
  year: number,
  quarter?: number,
  month?: number,
): TaxReportPeriod {
  let startMs: number;
  let endExclusiveMs: number;

  if (reportType === "quarterly") {
    const q = quarter ?? 1;
    const startMonth = (q - 1) * 3; // 0,3,6,9
    startMs = Date.UTC(year, startMonth, 1);
    endExclusiveMs = Date.UTC(year, startMonth + 3, 1); // start of the next quarter
  } else if (reportType === "monthly") {
    if (!month) throw new Error("Month is required for monthly reports");
    startMs = Date.UTC(year, month - 1, 1);
    endExclusiveMs = Date.UTC(year, month, 1); // start of the next month
  } else if (reportType === "annual") {
    startMs = Date.UTC(year, 0, 1);
    endExclusiveMs = Date.UTC(year + 1, 0, 1); // start of the next year
  } else {
    throw new Error("Invalid report type. Must be quarterly, monthly, or annual");
  }

  return {
    startIso: new Date(startMs).toISOString(),
    endExclusiveIso: new Date(endExclusiveMs).toISOString(),
  };
}
