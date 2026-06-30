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
 *
 * VIES (target X4): Stripe applies reverse_charge on the FORMAT validity of the eu_vat
 * only; it does NOT confirm the number is real via VIES (the EU VAT Information Exchange
 * System). Whether to TRUST a format-only reverse-charge or REQUIRE a real VIES check is
 * a business/compliance decision (the VIES-trust human-gate, CROSS_BORDER_OSS_PLAN.md
 * (g)). This helper builds BOTH modes behind one boolean (`requireViesValidation`,
 * sourced from the `TAX_REQUIRE_VIES` env flag by the caller, default OFF = today's
 * format-only behavior). When ON, a format-valid-but-VIES-UNVERIFIED number does NOT
 * silently get a 0% reverse-charge: the helper surfaces a `vat_id_unverified` state so
 * the charge path can hold/flag instead of trusting it. The POLICY default stays
 * format-only until the owner flips the flag; flipping it is a one-liner.
 */

import { z } from "https://esm.sh/zod@3.23.8";

const STRIPE_TAX_API = "https://api.stripe.com/v1/tax/calculations";
const STRIPE_VAT_VALIDATION_API = "https://api.stripe.com/v1/tax_ids";

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
 *  - "vat_id_unverified" : (X4, ONLY when requireViesValidation is ON) Stripe applied
 *                       reverse_charge on FORMAT validity but the real VIES check could
 *                       not confirm the number. NOT a silent 0%: the charge path must
 *                       hold/flag rather than trust the reverse-charge. Never produced
 *                       when the flag is OFF (default), where format-only -> reverse_charge.
 */
export type TaxCollectionState =
  | "collecting"
  | "reverse_charge"
  | "not_collecting"
  | "vat_id_unverified";

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
  /**
   * VIES-trust policy (X4). When false (DEFAULT, today's behavior) a format-valid eu_vat
   * gets Stripe's automatic reverse_charge (format-only). When true we additionally run a
   * real VIES check; a format-valid-but-VIES-unverified number is downgraded to
   * `vat_id_unverified` so it does NOT silently get 0%. Flipping this (one boolean,
   * sourced from the `TAX_REQUIRE_VIES` env flag) is the only change needed to enforce
   * the stricter policy. This is the VIES-trust human-gate; the helper builds both modes.
   */
  requireViesValidation: z.boolean().default(false),
});

/**
 * The INPUT type for calculateTax. We use z.input (not z.infer/z.output) so the fields
 * that have a zod `.default()` (connectedTaxActive, requireViesValidation) are OPTIONAL
 * for callers; zod fills the defaults at parse time. Using z.output here would wrongly
 * force every caller to pass those booleans explicitly.
 */
export type TaxCalcInput = z.input<typeof TaxCalcInputSchema>;

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
  /**
   * VIES verification result for the supplied eu_vat (X4). Only meaningful when a
   * customerVatId was supplied AND requireViesValidation was ON:
   *  - "verified"   : VIES confirmed the number is real (reverse_charge honored).
   *  - "unverified" : VIES could not confirm it (number invalid OR VIES unavailable) ->
   *                   collectionState was downgraded to "vat_id_unverified" (not a silent 0%).
   *  - "not_checked": the flag was OFF (format-only, today's default) or no VAT id supplied.
   */
  viesStatus: "verified" | "unverified" | "not_checked";
  /**
   * True when a supplied customerVatId was REJECTED by Stripe as format-invalid
   * (code tax_id_invalid) and the calc was transparently retried as B2C (no
   * reverse-charge). The charge path surfaces this so an invalid VAT id is visible
   * rather than silently honored. False when no VAT id was supplied or it was accepted.
   */
  vatIdRejected: boolean;
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
export function interpretCalculation(data: Record<string, unknown>, fallbackTotalCents: number): Omit<TaxCalcResult, "context" | "viesStatus" | "vatIdRejected"> {
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
 * The result of a real VIES check on an eu_vat number.
 *  - "verified"   : VIES says the number is registered/real.
 *  - "unverified" : VIES says it is NOT valid (a definitive negative).
 *  - "unavailable": VIES did not give a definitive answer (the service was down or the
 *                   check is still pending). We treat this as NON-trusting under the
 *                   require-VIES policy (do not honor reverse-charge on an unconfirmed id).
 */
export type ViesCheckResult = "verified" | "unverified" | "unavailable";

/** Read verification.status off a Stripe tax_id object into our tri-state, or null if
 * the status is not yet definitive (pending / missing). */
function mapViesStatus(data: Record<string, unknown>): ViesCheckResult | null {
  const verification = (data.verification ?? {}) as Record<string, unknown>;
  const status = typeof verification.status === "string" ? verification.status : "";
  if (status === "verified") return "verified";
  if (status === "unverified") return "unverified";
  if (status === "unavailable") return "unavailable";
  // "pending" or missing -> not yet definitive.
  return null;
}

/**
 * Run a REAL VIES validation on an eu_vat via Stripe's Tax ID Validation API (X4). Only
 * called when the require-VIES policy is ON. It creates an account-level
 * (owner[type]=self) tax_id, which makes Stripe validate eu_vat numbers against VIES,
 * then reads back verification.status. The created object is a lightweight validation
 * record (no money, no customer side effect).
 *
 * IMPORTANT (empirical, Stripe TEST 2026-06-30): Stripe runs the real VIES check in LIVE
 * mode; in TEST mode verification.status is not populated (stays null/pending), so this
 * returns "unavailable" in TEST -> the caller fails CLOSED (a held reverse-charge), which
 * is the safe default for the require-VIES policy. Stripe's validation can also be
 * ASYNCHRONOUS in live (the definitive status arrives via the customer.tax_id.updated
 * webhook). We do a brief bounded poll for a synchronous definitive answer; if none
 * arrives we return "unavailable" (fail closed). Whether to additionally wire the webhook
 * (vs this fail-closed sync default) is part of the VIES-trust human-gate (the owner's
 * policy), not decided here. Docs: https://docs.stripe.com/api/tax_ids , https://docs.stripe.com/tax/customer-tax-ids
 *
 * A definitive Stripe FORMAT rejection (code tax_id_invalid) maps to "unverified"; any
 * other API/network error maps to "unavailable" (fail closed; never a false "verified").
 */
export async function validateVatIdViaVies(params: {
  stripeSecretKey: string;
  vatId: string;
  /** Max synchronous poll attempts for a definitive status (default 3). */
  maxPolls?: number;
  /** Delay between polls in ms (default 350). */
  pollDelayMs?: number;
}): Promise<ViesCheckResult> {
  const form = new URLSearchParams();
  form.set("owner[type]", "self");
  form.set("type", "eu_vat");
  form.set("value", params.vatId);

  let created: Record<string, unknown>;
  try {
    const resp = await fetch(STRIPE_VAT_VALIDATION_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    created = await resp.json();
    if (!resp.ok || created?.error) {
      const code = ((created?.error ?? {}) as Record<string, unknown>).code;
      if (code === "tax_id_invalid") return "unverified";
      return "unavailable";
    }
  } catch (_err) {
    return "unavailable";
  }

  // First read off the create response.
  const first = mapViesStatus(created);
  if (first) return first;

  // Not yet definitive -> brief bounded poll by re-fetching the tax_id object.
  const id = typeof created.id === "string" ? created.id : "";
  const maxPolls = params.maxPolls ?? 3;
  const pollDelayMs = params.pollDelayMs ?? 350;
  if (id) {
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, pollDelayMs));
      try {
        const resp = await fetch(`${STRIPE_VAT_VALIDATION_API}/${id}`, {
          headers: { Authorization: `Bearer ${params.stripeSecretKey}` },
        });
        const data = await resp.json();
        if (resp.ok && !data?.error) {
          const mapped = mapViesStatus(data as Record<string, unknown>);
          if (mapped) return mapped;
        }
      } catch (_err) {
        // keep polling; fall through to fail-closed below.
      }
    }
  }
  // No definitive answer in time -> fail closed (do not trust an unconfirmed id).
  return "unavailable";
}

/**
 * Call the Stripe Tax Calculation API and return a structured decision. Throws on a
 * Stripe API error (the caller decides whether to fail the charge or fall back). The
 * input is zod-validated; a parse failure throws a ZodError before any network call.
 *
 * X4 / VIES: when requireViesValidation is ON and the calc returned reverse_charge for a
 * supplied eu_vat, we additionally run a real VIES check. If VIES does not CONFIRM the
 * number (unverified or unavailable) we downgrade the collection state to
 * "vat_id_unverified" so the charge path holds/flags instead of trusting a 0%
 * reverse-charge. When the flag is OFF (default) we keep Stripe's format-only behavior.
 */
export async function calculateTax(rawInput: TaxCalcInput): Promise<TaxCalcResult> {
  const input = TaxCalcInputSchema.parse(rawInput);

  const useConnectedContext = input.connectedTaxActive === true;

  // Build + send one calculation request. `withVatId` controls whether the supplied
  // eu_vat is attached, so we can transparently RETRY as B2C if Stripe rejects the VAT
  // id format (see the no-abuse path below). Returns {ok,data} or {ok:false,code}.
  async function runCalc(withVatId: boolean): Promise<{ ok: boolean; data: Record<string, unknown>; status: number; code: string }> {
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
    if (withVatId && input.customerVatId) {
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
    const data = (await resp.json()) as Record<string, unknown>;
    const err = (data?.error ?? {}) as Record<string, unknown>;
    return {
      ok: resp.ok && !data?.error,
      data,
      status: resp.status,
      code: typeof err.code === "string" ? err.code : "",
    };
  }

  let result = await runCalc(true);

  // NO-ABUSE / graceful path: Stripe rejects a FORMAT-invalid eu_vat with code
  // `tax_id_invalid`. A bogus VAT id must NEVER yield a reverse-charge. Rather than block
  // the whole booking on a customer typo, drop the invalid id and recompute as B2C; the
  // result then falls to not_collecting (-> the cross-border / domestic guard in the
  // charge path) or to a full collectible rate if a registration covers the destination.
  // `vatIdRejected` is surfaced so the charge path can flag that the supplied id was
  // invalid. The customer pays the correct (non-reverse-charge) amount; they cannot evade
  // VAT with an invalid number.
  let vatIdRejected = false;
  if (!result.ok && result.code === "tax_id_invalid" && input.customerVatId) {
    vatIdRejected = true;
    result = await runCalc(false);
  }

  if (!result.ok) {
    const err = (result.data?.error ?? {}) as Record<string, unknown>;
    throw new Error(
      `Stripe Tax calculation failed (${result.status}): ${err.code ?? "unknown"} ${err.message ?? ""}`.trim(),
    );
  }

  const interpreted = interpretCalculation(result.data, input.lineAmountCents);

  // X4 / VIES policy. By default (flag OFF) keep Stripe's format-only result untouched.
  // When ON, and ONLY when Stripe applied reverse_charge for a supplied eu_vat, require a
  // real VIES confirmation; downgrade to "vat_id_unverified" if it cannot be confirmed so
  // the charge path never silently ships a 0% reverse-charge on an unconfirmed number.
  let collectionState = interpreted.collectionState;
  let viesStatus: TaxCalcResult["viesStatus"] = "not_checked";
  if (
    input.requireViesValidation === true &&
    input.customerVatId &&
    !vatIdRejected &&
    interpreted.collectionState === "reverse_charge"
  ) {
    const vies = await validateVatIdViaVies({
      stripeSecretKey: input.stripeSecretKey,
      vatId: input.customerVatId,
    });
    if (vies === "verified") {
      viesStatus = "verified";
    } else {
      // unverified OR unavailable -> do not trust the reverse-charge.
      viesStatus = "unverified";
      collectionState = "vat_id_unverified";
    }
  }

  return {
    ...interpreted,
    collectionState,
    viesStatus,
    vatIdRejected,
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

/** The DOMESTIC hard-guard marker (X4, fixes CB-F-03). Persisted when a remote DOMESTIC
 * (destination == merchant country) taxable service has NO usable rate: Stripe returns
 * not_collecting (e.g. the NL registration is expired) AND the manual domestic block did
 * not apply a positive rate (applicable_tax_rate was NULL/0). Without this guard such a
 * booking would SILENTLY charge 0% domestic VAT. We surface it instead of inventing a
 * rate (no hardcoded VAT law) or shipping a fake 0%. */
export const DOMESTIC_RATE_UNAVAILABLE_STATUS = "domestic_rate_unavailable";
export const DOMESTIC_RATE_UNAVAILABLE_MESSAGE = "domestic VAT rate unavailable: set applicable_tax_rate or activate Stripe Tax for the home country";

/** The VAT-ID-unverified hard-guard marker (X4). Persisted when the require-VIES policy
 * is ON and a format-valid eu_vat could NOT be confirmed via VIES. Never a silent 0%
 * reverse-charge: the reports must surface that the reverse-charge is unconfirmed. */
export const VAT_ID_UNVERIFIED_STATUS = "vat_id_unverified";
export const VAT_ID_UNVERIFIED_MESSAGE = "VAT id not verified via VIES: reverse-charge not applied (require-VIES policy on)";
