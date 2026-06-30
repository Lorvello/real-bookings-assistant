/**
 * Shared Stripe Tax Calculation-API helper (Cross-Border / OSS, target X2).
 *
 * PURE PLUMBING. This module hardcodes NO VAT rate and NO VAT rule. Stripe Tax
 * computes everything (per-country rate, reverse-charge for a valid-format EU B2B
 * VAT id, OSS, not_collecting when no registration covers the destination). Our job
 * is to call the Calculation API with the right inputs, read back the collection
 * state, and hand the charge path a structured decision. Any place a rate or rule is
 * hand-coded would be a bug; route it through this helper instead.
 *
 * WHY the Calculation API and not bare automatic_tax:
 *  - F-TAX-20 (prior loop): `automatic_tax={enabled:true}` on a destination-charge
 *    PaymentIntent (transfer_data + application_fee_amount) is REJECTED by Stripe
 *    ("Received unknown parameter: automatic_tax") -> HTTP 500, PI never created,
 *    merchant cannot take payment. So we never set automatic_tax on the PI.
 *  - Instead we PRE-COMPUTE the tax with /v1/tax/calculations, attach the calc id to
 *    the PI via `metadata[tax_calculation]`, and after payment success record a filing
 *    transaction via /v1/tax/transactions/create_from_calculation. This returns the
 *    per-jurisdiction `tax_breakdown` the reports need and degrades to the existing
 *    manual NL path when Stripe returns not_collecting domestically.
 *  - Docs: https://docs.stripe.com/tax/tax-for-platforms , https://docs.stripe.com/tax/standalone-tax-api
 *
 * ACCOUNT CONTEXT (empirically grounded on Stripe TEST 2026-06-30):
 *  - The documented Connect pattern computes against the CONNECTED account's Stripe
 *    Tax registrations via the `Stripe-Account: <connected>` header (the connected
 *    account is merchant of record under the destination-charge model).
 *  - BUT calling with that header today returns `stripe_tax_inactive` because Stripe
 *    Tax has not been activated on the connected account (the X0 / registration
 *    human-gate). A hard error is not a usable calculation.
 *  - The PLATFORM account HAS Stripe Tax active (status=active, NL head office), so a
 *    platform-context calc DOES return a calculation, and it correctly surfaces
 *    not_collecting (cross-border with no registration) and reverse_charge (valid EU
 *    B2B VAT id) right now.
 *  - Therefore this helper passes the `Stripe-Account` header ONLY when the caller
 *    has confirmed Tax is active on the connected account (`connectedTaxActive`),
 *    and otherwise computes in the platform context. When the merchant completes OSS
 *    + activates Tax on the connected account (the registration human-gate), flip
 *    `connectedTaxActive` true and the SAME code computes against their registrations
 *    and begins returning positive collectible cross-border rates. The branch logic
 *    in the charge path is identical either way; only the context differs.
 *
 * SECURITY: this helper performs a READ-ONLY tax computation. It NEVER creates a
 * charge, never sets transfer_data / application_fee, never moves money. The customer
 * country / VAT id only influence the tax figure (a Stripe-bounded computation), not
 * the destination account or the platform fee, which the charge path pins server-side.
 */

import { z } from "https://esm.sh/zod@3.23.8";

const STRIPE_TAX_API = "https://api.stripe.com/v1/tax/calculations";

/**
 * Collection state we surface to the charge path, derived from Stripe's
 * `tax_breakdown[].taxability_reason`. We do NOT invent these; they map directly to
 * Stripe's reasons (see https://docs.stripe.com/api/tax/calculations/object).
 *  - "collecting"     : a positive rate is being collected (standard_rated / reduced_rate
 *                       / etc.) -> attach the calc id, record a transaction on success.
 *  - "reverse_charge" : valid EU B2B reverse-charge, 0% -> mark the payment reverse_charge.
 *  - "not_collecting" : Stripe is not collecting (no registration covers the destination,
 *                       or the customer is exempt) -> the charge path decides: domestic
 *                       fallback (NL) or the hard cross-border guard.
 */
export type TaxCollectionState = "collecting" | "reverse_charge" | "not_collecting";

/** Input schema. zod-validated so a malformed call fails fast and loud. */
export const TaxCalcInputSchema = z.object({
  /** test|live secret key (already mode-resolved by the caller via validateStripeMode). */
  stripeSecretKey: z.string().min(1),
  /** The connected (destination) account id. Used for the Stripe-Account header ONLY when connectedTaxActive. */
  connectedAccountId: z.string().min(1),
  /**
   * Whether Stripe Tax is ACTIVE on the connected account. When false (today: the
   * registration human-gate is open) we compute in the platform context so we still
   * get a real calculation (not_collecting / reverse_charge); when true we pass the
   * Stripe-Account header to compute against the connected account's registrations.
   */
  connectedTaxActive: z.boolean().default(false),
  /** ISO-4217 lowercase, e.g. "eur". */
  currency: z.string().min(3).max(3),
  /** The line amount in the smallest currency unit (cents). For tax_behavior=exclusive this is the pre-tax base; for inclusive it is the tax-inclusive total. */
  lineAmountCents: z.number().int().nonnegative(),
  /** Stripe product tax code, e.g. "txcd_10000000". Validated format only; Stripe rejects unknown codes. */
  taxCode: z.string().regex(/^txcd_[0-9]+$/, "tax_code must be a txcd_ code"),
  /** "exclusive" (add tax on top) or "inclusive" (tax is inside the amount). */
  taxBehavior: z.enum(["exclusive", "inclusive"]),
  /** REQUIRED for remote/digital: the customer billing country (ISO-3166 alpha-2). */
  customerCountry: z.string().length(2, "customerCountry must be ISO-3166 alpha-2"),
  /** Optional billing postal code. */
  customerPostalCode: z.string().min(1).optional(),
  /**
   * Optional EU B2B VAT id (eu_vat). When present and format-valid Stripe applies
   * reverse_charge (0%). Stripe validates FORMAT only here; real VIES validation is a
   * separate gate (see CROSS_BORDER_OSS_PLAN.md (d)).
   */
  customerVatId: z.string().min(1).optional(),
});

export type TaxCalcInput = z.infer<typeof TaxCalcInputSchema>;

export interface TaxBreakdownEntry {
  amountCents: number;
  inclusive: boolean;
  taxabilityReason: string;
  country: string | null;
  percentageDecimal: string | null;
  taxType: string | null;
}

export interface TaxCalcResult {
  /** The Stripe tax calculation id (taxcalc_...). Attach to the PI metadata[tax_calculation]. */
  calculationId: string;
  /** Derived collection state, the single value the charge path branches on. */
  collectionState: TaxCollectionState;
  /** The tax amount Stripe computed on this line, in cents (0 for reverse_charge / not_collecting). */
  taxAmountCents: number;
  /** The full charged total Stripe computed (amount_total), in cents. For exclusive this is base+tax; for inclusive it is the original amount. */
  amountTotalCents: number;
  /** The per-jurisdiction breakdown, normalized for persistence onto booking_payments.tax_breakdown. */
  breakdown: TaxBreakdownEntry[];
  /** The account context the calc actually ran in, for evidence/debugging. */
  context: "connected" | "platform";
}

/**
 * Normalize Stripe's top-level tax_breakdown array into our persistence shape.
 * Stripe shape: [{ amount, inclusive, taxability_reason, tax_rate_details:{country,percentage_decimal,tax_type}, taxable_amount }]
 */
function normalizeBreakdown(rawBreakdown: unknown): TaxBreakdownEntry[] {
  if (!Array.isArray(rawBreakdown)) return [];
  return rawBreakdown.map((b) => {
    const entry = (b ?? {}) as Record<string, unknown>;
    const rate = (entry.tax_rate_details ?? {}) as Record<string, unknown>;
    return {
      amountCents: typeof entry.amount === "number" ? entry.amount : 0,
      inclusive: entry.inclusive === true,
      taxabilityReason: typeof entry.taxability_reason === "string" ? entry.taxability_reason : "unknown",
      country: typeof rate.country === "string" ? rate.country : null,
      percentageDecimal: typeof rate.percentage_decimal === "string" ? rate.percentage_decimal : null,
      taxType: typeof rate.tax_type === "string" ? rate.tax_type : null,
    };
  });
}

/**
 * Decide the collection state from the breakdown. Stripe reasons map directly:
 *  - any entry "reverse_charge" with no positive tax -> reverse_charge.
 *  - any entry collecting a positive tax (amount > 0) OR a clearly collecting reason
 *    (standard_rated / reduced_rate / zero_rated-as-applicable) -> collecting.
 *  - otherwise (all not_collecting / customer_exempt / product_exempt with 0 tax) -> not_collecting.
 * We treat a positive computed tax as the authoritative "collecting" signal so we
 * never have to enumerate every Stripe reason string (forward-compatible).
 */
function deriveCollectionState(breakdown: TaxBreakdownEntry[], taxAmountCents: number): TaxCollectionState {
  if (taxAmountCents > 0) return "collecting";
  if (breakdown.some((b) => b.taxabilityReason === "reverse_charge")) return "reverse_charge";
  // Some collecting reasons can legitimately be 0% (zero_rated); honor an explicit
  // standard/reduced/zero collecting reason even at amount 0, but only if NOT also
  // flagged not_collecting. In practice 0 tax with no reverse_charge is not_collecting.
  const collectingReasons = new Set(["standard_rated", "reduced_rated", "zero_rated"]);
  if (breakdown.some((b) => collectingReasons.has(b.taxabilityReason))) return "collecting";
  return "not_collecting";
}

/**
 * Interpret a raw Stripe tax calculation response into our structured result (minus
 * the account context, which the caller knows). PURE (no IO) so the breakdown
 * normalization + collection-state derivation can be unit-asserted against captured
 * Stripe TEST shapes without a network call.
 */
export function interpretCalculation(data: Record<string, unknown>, fallbackTotalCents: number): Omit<TaxCalcResult, "context"> {
  const breakdown = normalizeBreakdown(data.tax_breakdown);
  const exclusive = data.tax_amount_exclusive;
  const inclusive = data.tax_amount_inclusive;
  const taxAmountCents = typeof exclusive === "number" && exclusive > 0
    ? exclusive
    : (typeof inclusive === "number" && inclusive > 0 ? inclusive : 0);
  const amountTotalCents = typeof data.amount_total === "number" ? data.amount_total : fallbackTotalCents;
  const collectionState = deriveCollectionState(breakdown, taxAmountCents);
  return {
    calculationId: String(data.id),
    collectionState,
    taxAmountCents,
    amountTotalCents,
    breakdown,
  };
}

/**
 * Call the Stripe Tax Calculation API and return a structured decision. Throws on a
 * Stripe API error (the caller decides whether to fail the charge or fall back). The
 * input is zod-validated; a parse failure throws a ZodError before any network call.
 */
export async function calculateTax(rawInput: TaxCalcInput): Promise<TaxCalcResult> {
  const input = TaxCalcInputSchema.parse(rawInput);

  const useConnectedContext = input.connectedTaxActive === true;

  const form = new URLSearchParams();
  form.set("currency", input.currency.toLowerCase());
  form.set("line_items[0][amount]", String(input.lineAmountCents));
  form.set("line_items[0][reference]", "booking_service");
  form.set("line_items[0][tax_code]", input.taxCode);
  form.set("line_items[0][tax_behavior]", input.taxBehavior);
  form.set("customer_details[address][country]", input.customerCountry.toUpperCase());
  form.set("customer_details[address_source]", "billing");
  if (input.customerPostalCode) {
    form.set("customer_details[address][postal_code]", input.customerPostalCode);
  }
  if (input.customerVatId) {
    form.set("customer_details[tax_ids][0][type]", "eu_vat");
    form.set("customer_details[tax_ids][0][value]", input.customerVatId);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.stripeSecretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  // Connect pattern: compute against the connected account's registrations ONLY when
  // Tax is active there. Otherwise omit the header and compute in the platform context
  // (which has Tax active) so we still get a real not_collecting / reverse_charge result.
  if (useConnectedContext) {
    headers["Stripe-Account"] = input.connectedAccountId;
  }

  const resp = await fetch(STRIPE_TAX_API, { method: "POST", headers, body: form.toString() });
  const data = await resp.json();

  if (!resp.ok || data?.error) {
    const err = data?.error ?? {};
    throw new Error(
      `Stripe Tax calculation failed (${resp.status}): ${err.code ?? "unknown"} ${err.message ?? ""}`.trim(),
    );
  }

  const interpreted = interpretCalculation(data, input.lineAmountCents);
  return {
    ...interpreted,
    context: useConnectedContext ? "connected" : "platform",
  };
}

/**
 * Record a Stripe Tax filing transaction from a completed calculation, called AFTER
 * payment success (case (a) collecting). Idempotent on `reference` (the PI id), so a
 * webhook retry does not double-record. Returns the transaction id. Best-effort: the
 * caller logs failures (a missing filing transaction is a reporting concern, not a
 * money/charge concern, and the persisted tax_breakdown already carries the figures).
 *
 * MUST run in the SAME account context the calculation ran in.
 */
export async function createTaxTransaction(params: {
  stripeSecretKey: string;
  calculationId: string;
  reference: string;
  connectedAccountId: string;
  connectedTaxActive: boolean;
}): Promise<string> {
  const form = new URLSearchParams();
  form.set("calculation", params.calculationId);
  form.set("reference", params.reference);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.stripeSecretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (params.connectedTaxActive === true) {
    headers["Stripe-Account"] = params.connectedAccountId;
  }

  const resp = await fetch("https://api.stripe.com/v1/tax/transactions/create_from_calculation", {
    method: "POST",
    headers,
    body: form.toString(),
  });
  const data = await resp.json();
  if (!resp.ok || data?.error) {
    const err = data?.error ?? {};
    throw new Error(
      `Stripe Tax transaction create failed (${resp.status}): ${err.code ?? "unknown"} ${err.message ?? ""}`.trim(),
    );
  }
  return String(data.id);
}

/** The cross-border hard-guard marker persisted into booking_payments.tax_breakdown
 * when Stripe returns not_collecting for a CROSS-BORDER destination (no registration
 * covers it). Never a silent clean 0%: the reports + X6 must surface this. */
export const CROSS_BORDER_UNAVAILABLE_STATUS = "cross_border_rate_unavailable";
export const CROSS_BORDER_UNAVAILABLE_MESSAGE = "cross-border rate unavailable: register for OSS";
