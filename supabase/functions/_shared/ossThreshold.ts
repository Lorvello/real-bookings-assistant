// _shared/ossThreshold.ts
//
// X5 (Cross-Border / OSS VAT loop): the single post-2021 pan-EU OSS monitoring
// threshold + the cumulative cross-border B2C bucket arithmetic, kept as a pure,
// unit-testable helper (mirrors the _shared/taxCalc.ts pattern). The Edge Function
// get-tax-thresholds reads real booking_payments rows, classifies them with the
// predicates here, sums the taxable amount, and surfaces "OSS registration required"
// when the cumulative crosses the threshold.
//
// WHY THIS REPLACES THE OLD NUMBERS
// Before 1 July 2021 each EU country had its OWN distance-selling threshold
// (DE EUR100k earlier / EUR22k, FR EUR35.7k, IT EUR65k, ...). The 2021 VAT
// e-commerce package ABOLISHED those per-country thresholds and replaced them with
// ONE union-wide EUR10,000 threshold that applies to the SUM of a seller's
// cross-border B2C supplies to ALL other EU member states combined. Once total
// cross-border B2C sales in a calendar year exceed EUR10,000, the seller must charge
// destination-country VAT and can register for the One-Stop-Shop (OSS) to file it in
// a single return. The old per-country numbers in this function were therefore
// factually wrong (F-TAX-19 stale-numbers half).
// Source: https://stripe.com/guides/introduction-to-eu-vat-and-european-vat-oss
//
// LEGAL BOUNDARY (loop rule): the EUR10,000 here is a MONITORING THRESHOLD CONSTANT,
// NOT a VAT rate. We never hardcode a VAT rate; rates stay Stripe-computed. This
// constant is only used for the >= comparison and the progress / remaining figure.

/**
 * The single pan-EU OSS monitoring threshold, in EUR cents.
 * EUR 10,000.00 = 1,000,000 cents. Union-wide, ONE combined bucket across all
 * non-merchant-country EU B2C cross-border supplies (NOT per-country).
 */
export const OSS_PAN_EU_THRESHOLD_CENTS = 1_000_000;

/** Bucket identifier surfaced to the frontend / reports for the single OSS bucket. */
export const OSS_BUCKET_KEY = "EU_OSS";

/** The "near" warning band: at >= 80% of the threshold we flag an approaching crossing. */
export const OSS_NEAR_FRACTION = 0.8;

/** A minimal shape of a booking_payments row, only the fields the bucket needs. */
export interface BookingPaymentRowLike {
  /** Gross charge amount in cents (booking_payments.amount_cents). */
  amount_cents: number;
  /** ISO-3166 alpha-2 destination/customer country, or null for in_person/domestic. */
  customer_country: string | null;
  /** True when Stripe applied a B2B reverse-charge (0%) for a valid EU VAT id. */
  reverse_charge: boolean | null;
  /** Refunded amount in cents (booking_payments.refund_amount_cents), if any. */
  refund_amount_cents?: number | null;
  /**
   * Stripe per-jurisdiction tax breakdown persisted at charge time
   * (booking_payments.tax_breakdown). Used to derive the net/taxable amount.
   */
  tax_breakdown?: unknown;
  /** Payment status; only succeeded/paid rows count toward the threshold. */
  status?: string | null;
}

/**
 * Is this payment a CROSS-BORDER B2C supply that counts toward the OSS bucket?
 *
 * Bucket definition (matches the X2 charge-path branch logic + the X1 data model):
 *  - customer_country is set (the remote/digital supply path is the ONLY path that
 *    sets it; in_person bookings leave it null) -> this excludes in_person DOMESTIC.
 *  - customer_country != merchant country (NL) -> cross-border only (excludes the
 *    domestic NL remote bucket, which is not an OSS supply).
 *  - reverse_charge is false -> B2C only (excludes B2B reverse-charge supplies, which
 *    are 0%-to-the-buyer and do NOT count toward the OSS distance-selling threshold).
 *
 * @param merchantCountry ISO-3166 alpha-2 of the merchant's home country (e.g. "NL").
 */
export function isCrossBorderB2C(
  row: BookingPaymentRowLike,
  merchantCountry: string,
): boolean {
  const cc = (row.customer_country ?? "").toUpperCase();
  if (cc.length !== 2) return false; // null/blank => in_person domestic, excluded
  if (cc === merchantCountry.toUpperCase()) return false; // domestic, excluded
  if (row.reverse_charge === true) return false; // B2B reverse-charge, excluded
  return true;
}

/**
 * Sum the tax cents recorded in a persisted tax_breakdown (Stripe's per-jurisdiction
 * amountCents fields). Robust to the legacy/normalized shapes we persist
 * (taxCalc.ts normalizeBreakdown -> [{ amountCents }]) and to Stripe's raw
 * tax_breakdown (amount). Returns 0 when nothing is parseable (e.g. not_collecting,
 * the cross-border-unavailable guard marker, or a null breakdown).
 */
export function taxCentsFromBreakdown(breakdown: unknown): number {
  if (!Array.isArray(breakdown)) return 0;
  let total = 0;
  for (const entry of breakdown) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const v = typeof e.amountCents === "number"
      ? e.amountCents
      : typeof e.amount === "number"
      ? e.amount
      : 0;
    if (Number.isFinite(v) && v > 0) total += v;
  }
  return total;
}

/**
 * The TAXABLE (net-of-VAT, net-of-refund) amount of a single payment, in cents.
 *
 * The OSS EUR10k threshold is measured on the taxable value of the cross-border B2C
 * supplies. booking_payments has no dedicated net column, so we derive:
 *   net = amount_cents - tax(tax_breakdown) - refund_amount_cents
 * floored at 0.
 *
 * DOCUMENTED FIELD CHOICE: amount_cents is the gross charge; tax comes from the
 * persisted Stripe tax_breakdown; refunds are subtracted so a refunded cross-border
 * sale stops counting toward the threshold (consistent with the F-TAX-17 refund
 * convention used by the tax reports). For the cross-border B2C bucket TODAY the tax
 * is 0 (not_collecting until OSS + registration), so net == gross-minus-refunds;
 * once collection is enabled the tax is correctly excluded.
 */
export function taxableCents(row: BookingPaymentRowLike): number {
  const gross = Number.isFinite(row.amount_cents) ? row.amount_cents : 0;
  const tax = taxCentsFromBreakdown(row.tax_breakdown);
  const refund = typeof row.refund_amount_cents === "number" && row.refund_amount_cents > 0
    ? row.refund_amount_cents
    : 0;
  const net = gross - tax - refund;
  return net > 0 ? net : 0;
}

/** Only these payment statuses count toward the threshold (settled money). */
const COUNTED_STATUSES = new Set(["succeeded", "paid", "completed"]);

export function isCountedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return COUNTED_STATUSES.has(status.toLowerCase());
}

export interface OssBucketResult {
  /** Cumulative taxable cross-border B2C sales this year, in cents. */
  cumulativeCents: number;
  /** The threshold constant, in cents (EUR10,000.00). */
  thresholdCents: number;
  /** cents remaining until the threshold (0 once crossed). */
  remainingCents: number;
  /** cumulative / threshold * 100, capped at 100 for the progress bar. */
  percentage: number;
  /** Has the cumulative reached or exceeded the threshold? */
  registrationRequired: boolean;
  /** 'under' | 'near' (>=80%) | 'exceeded' (>=100%). */
  status: "under" | "near" | "exceeded";
  /** Number of cross-border B2C payments that contributed to the cumulative. */
  contributingPayments: number;
}

/**
 * Reduce a list of booking_payments rows to the single pan-EU OSS bucket result.
 * Pure: no I/O. The caller is responsible for having scoped the rows to ONE owner
 * (account_owner_id / stripe_account_id) and to the current year.
 */
export function computeOssBucket(
  rows: BookingPaymentRowLike[],
  merchantCountry: string,
): OssBucketResult {
  let cumulativeCents = 0;
  let contributingPayments = 0;
  for (const row of rows) {
    if (!isCountedStatus(row.status ?? "succeeded")) continue;
    if (!isCrossBorderB2C(row, merchantCountry)) continue;
    cumulativeCents += taxableCents(row);
    contributingPayments += 1;
  }

  const thresholdCents = OSS_PAN_EU_THRESHOLD_CENTS;
  const remainingCents = Math.max(thresholdCents - cumulativeCents, 0);
  const rawPct = thresholdCents > 0 ? (cumulativeCents / thresholdCents) * 100 : 0;
  const percentage = Math.min(rawPct, 100);
  const registrationRequired = cumulativeCents >= thresholdCents;
  const status: "under" | "near" | "exceeded" = registrationRequired
    ? "exceeded"
    : rawPct >= OSS_NEAR_FRACTION * 100
    ? "near"
    : "under";

  return {
    cumulativeCents,
    thresholdCents,
    remainingCents,
    percentage,
    registrationRequired,
    status,
    contributingPayments,
  };
}
