// Unit tests for the Cross-Border / OSS tax-calc decision logic (target X2).
//
// The network call to /v1/tax/calculations is proven via the REAL create-booking-payment
// flow (two-layer evidence). These tests pin the PURE decision logic: zod input
// validation + interpretCalculation (breakdown normalization + collection-state
// derivation) against the EXACT Stripe TEST response shapes captured 2026-06-30
// (platform context, EUR100 line, txcd_10000000): DE-B2C -> not_collecting,
// DE-B2B+eu_vat -> reverse_charge, NL-B2C -> not_collecting; plus a synthetic
// positive-collection shape (the registration-gated case, D-CB-REG).

import { assertEquals, assertThrows } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  interpretCalculation,
  TaxCalcInputSchema,
  CROSS_BORDER_UNAVAILABLE_STATUS,
  DOMESTIC_RATE_UNAVAILABLE_STATUS,
  VAT_ID_UNVERIFIED_STATUS,
  calculateTax,
  validateVatIdViaVies,
} from "./taxCalc.ts";

// ---- Captured real Stripe TEST shapes (platform context, line amount 10000 cents) ----

// DE B2C: cross-border, no registration -> not_collecting 0%.
const DE_B2C = {
  id: "taxcalc_de_b2c",
  amount_total: 10000,
  tax_amount_exclusive: 0,
  tax_amount_inclusive: 0,
  tax_breakdown: [
    {
      amount: 0,
      inclusive: false,
      taxability_reason: "not_collecting",
      taxable_amount: 0,
      tax_rate_details: { country: "DE", percentage_decimal: "0.0", rate_type: "percentage", tax_type: "vat" },
    },
  ],
};

// DE B2B with a format-valid EU VAT id -> reverse_charge 0% (Stripe applies automatically).
const DE_B2B = {
  id: "taxcalc_de_b2b",
  amount_total: 10000,
  tax_amount_exclusive: 0,
  tax_amount_inclusive: 0,
  tax_breakdown: [
    {
      amount: 0,
      inclusive: false,
      taxability_reason: "reverse_charge",
      taxable_amount: 0,
      tax_rate_details: { country: "DE", percentage_decimal: "0.0", rate_type: "percentage", tax_type: "vat" },
    },
  ],
};

// NL B2C: NL registration expired -> not_collecting 0% (destination == merchant NL -> manual fallback).
const NL_B2C = {
  id: "taxcalc_nl_b2c",
  amount_total: 10000,
  tax_amount_exclusive: 0,
  tax_amount_inclusive: 0,
  tax_breakdown: [
    {
      amount: 0,
      inclusive: false,
      taxability_reason: "not_collecting",
      taxable_amount: 0,
      tax_rate_details: { country: "NL", percentage_decimal: "0.0", rate_type: "percentage", tax_type: "vat" },
    },
  ],
};

// Synthetic POSITIVE collection (registration-gated, D-CB-REG): DE standard_rated 19%.
// Shape mirrors Stripe's when a registration covers the destination.
const DE_B2C_COLLECTING = {
  id: "taxcalc_de_collecting",
  amount_total: 11900,
  tax_amount_exclusive: 1900,
  tax_amount_inclusive: 0,
  tax_breakdown: [
    {
      amount: 1900,
      inclusive: false,
      taxability_reason: "standard_rated",
      taxable_amount: 10000,
      tax_rate_details: { country: "DE", percentage_decimal: "19.0", rate_type: "percentage", tax_type: "vat" },
    },
  ],
};

Deno.test("X2: DE B2C -> not_collecting (the hard-guard trigger for cross-border)", () => {
  const r = interpretCalculation(DE_B2C, 10000);
  assertEquals(r.collectionState, "not_collecting");
  assertEquals(r.taxAmountCents, 0);
  assertEquals(r.amountTotalCents, 10000);
  assertEquals(r.breakdown[0].country, "DE");
  assertEquals(r.breakdown[0].taxabilityReason, "not_collecting");
  assertEquals(r.breakdown[0].taxType, "vat");
  assertEquals(r.calculationId, "taxcalc_de_b2c");
});

Deno.test("X2: DE B2B + eu_vat -> reverse_charge (0%, marked)", () => {
  const r = interpretCalculation(DE_B2B, 10000);
  assertEquals(r.collectionState, "reverse_charge");
  assertEquals(r.taxAmountCents, 0);
  assertEquals(r.breakdown[0].taxabilityReason, "reverse_charge");
});

Deno.test("X2: NL B2C -> not_collecting (destination == NL -> manual NL fallback decided by caller)", () => {
  const r = interpretCalculation(NL_B2C, 10000);
  assertEquals(r.collectionState, "not_collecting");
  assertEquals(r.breakdown[0].country, "NL");
});

Deno.test("X2: positive rate -> collecting (D-CB-REG; needs an active registration)", () => {
  const r = interpretCalculation(DE_B2C_COLLECTING, 10000);
  assertEquals(r.collectionState, "collecting");
  assertEquals(r.taxAmountCents, 1900);
  assertEquals(r.amountTotalCents, 11900);
  assertEquals(r.breakdown[0].percentageDecimal, "19.0");
  assertEquals(r.breakdown[0].taxabilityReason, "standard_rated");
});

Deno.test("X2: empty / malformed breakdown -> not_collecting, never a fabricated rate", () => {
  const r = interpretCalculation({ id: "taxcalc_x", amount_total: 5000, tax_breakdown: null }, 5000);
  assertEquals(r.collectionState, "not_collecting");
  assertEquals(r.taxAmountCents, 0);
  assertEquals(r.breakdown.length, 0);
});

Deno.test("X2: zod rejects a missing customer country (required for remote)", () => {
  assertThrows(() =>
    TaxCalcInputSchema.parse({
      stripeSecretKey: "rk_test_x",
      connectedAccountId: "acct_x",
      currency: "eur",
      lineAmountCents: 10000,
      taxCode: "txcd_10000000",
      taxBehavior: "exclusive",
      // customerCountry missing
    })
  );
});

Deno.test("X2: zod rejects a non-txcd tax code (no arbitrary code injection)", () => {
  assertThrows(() =>
    TaxCalcInputSchema.parse({
      stripeSecretKey: "rk_test_x",
      connectedAccountId: "acct_x",
      currency: "eur",
      lineAmountCents: 10000,
      taxCode: "not_a_code",
      taxBehavior: "exclusive",
      customerCountry: "DE",
    })
  );
});

Deno.test("X2: zod accepts a valid remote input incl optional eu_vat + defaults connectedTaxActive false", () => {
  const parsed = TaxCalcInputSchema.parse({
    stripeSecretKey: "rk_test_x",
    connectedAccountId: "acct_x",
    currency: "eur",
    lineAmountCents: 10000,
    taxCode: "txcd_10000000",
    taxBehavior: "exclusive",
    customerCountry: "de",
    customerVatId: "DE123456789",
  });
  assertEquals(parsed.connectedTaxActive, false);
  assertEquals(parsed.customerVatId, "DE123456789");
});

Deno.test("X2: the cross-border guard status constant is stable (reports key off it)", () => {
  assertEquals(CROSS_BORDER_UNAVAILABLE_STATUS, "cross_border_rate_unavailable");
});

// =====================================================================================
// X4: VAT-ID / reverse-charge + optional VIES guard + CB-F-03 (domestic silent-0% fix).
// The real Stripe calls are proven via the REAL create-booking-payment flow (two-layer).
// These tests pin (1) the VIES response-mapping, (2) calculateTax's VIES policy in BOTH
// modes via a stubbed fetch, (3) the CB-F-03 domestic-guard decision, (4) zod bounds.
// =====================================================================================

// A stubbed fetch that maps a Stripe endpoint -> a canned JSON body. Lets us drive
// calculateTax deterministically (calc endpoint) + the VIES check (tax_ids endpoint)
// with zero network. `calc` may be a single body or an ARRAY of bodies consumed in order
// (to model the tax_id_invalid retry: first call rejects, second succeeds). A body with
// an `error` key is returned with the matching non-200 status. Restores fetch in finally.
function withStubbedFetch(
  routes: { calc?: unknown | unknown[]; vies?: { ok?: boolean; body: unknown } },
  fn: () => Promise<void>,
): () => Promise<void> {
  return async () => {
    const realFetch = globalThis.fetch;
    const calcQueue: unknown[] = Array.isArray(routes.calc) ? [...routes.calc] : [routes.calc ?? {}];
    let lastCalc: unknown = calcQueue[calcQueue.length - 1] ?? {};
    globalThis.fetch = ((input: string | URL | Request, _init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/v1/tax/calculations")) {
        const body = calcQueue.length > 0 ? calcQueue.shift() : lastCalc;
        lastCalc = body;
        const hasError = !!(body && (body as Record<string, unknown>).error);
        return Promise.resolve(
          new Response(JSON.stringify(body ?? {}), {
            status: hasError ? 400 : 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.includes("/v1/tax_ids")) {
        const v = routes.vies ?? { ok: true, body: {} };
        return Promise.resolve(
          new Response(JSON.stringify(v.body), {
            status: v.ok === false ? 400 : 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as typeof fetch;
    try {
      await fn();
    } finally {
      globalThis.fetch = realFetch;
    }
  };
}

const REMOTE_VAT_INPUT = {
  stripeSecretKey: "rk_test_x",
  connectedAccountId: "acct_x",
  currency: "eur",
  lineAmountCents: 10000,
  taxCode: "txcd_10000000" as const,
  taxBehavior: "exclusive" as const,
  customerCountry: "DE",
  customerVatId: "DE123456789",
};

// ---- (1) VIES response mapping (validateVatIdViaVies) ----

Deno.test(
  "X4 VIES: verification.status=verified -> verified",
  withStubbedFetch({ vies: { ok: true, body: { verification: { status: "verified" } } } }, async () => {
    const r = await validateVatIdViaVies({ stripeSecretKey: "rk_test_x", vatId: "DE123456789" });
    assertEquals(r, "verified");
  }),
);

Deno.test(
  "X4 VIES: verification.status=unverified -> unverified (definitive negative)",
  withStubbedFetch({ vies: { ok: true, body: { verification: { status: "unverified" } } } }, async () => {
    const r = await validateVatIdViaVies({ stripeSecretKey: "rk_test_x", vatId: "DE000000000" });
    assertEquals(r, "unverified");
  }),
);

Deno.test(
  "X4 VIES: verification.status=pending -> unavailable (no definitive yes, fail closed)",
  withStubbedFetch({ vies: { ok: true, body: { verification: { status: "pending" } } } }, async () => {
    // maxPolls 0 -> no bounded poll delay in the unit test; pending stays unavailable.
    const r = await validateVatIdViaVies({ stripeSecretKey: "rk_test_x", vatId: "DE123456789", maxPolls: 0 });
    assertEquals(r, "unavailable");
  }),
);

Deno.test(
  "X4 VIES: Stripe tax_id_invalid error -> unverified (format rejected)",
  withStubbedFetch({ vies: { ok: false, body: { error: { code: "tax_id_invalid" } } } }, async () => {
    const r = await validateVatIdViaVies({ stripeSecretKey: "rk_test_x", vatId: "NOTAVATID" });
    assertEquals(r, "unverified");
  }),
);

Deno.test(
  "X4 VIES: other Stripe error -> unavailable (fail closed, never a false 'verified')",
  withStubbedFetch({ vies: { ok: false, body: { error: { code: "rate_limit" } } } }, async () => {
    const r = await validateVatIdViaVies({ stripeSecretKey: "rk_test_x", vatId: "DE123456789", maxPolls: 0 });
    assertEquals(r, "unavailable");
  }),
);

Deno.test(
  "X4 VIES: pending then a poll resolves to verified (async live shape)",
  async () => {
    const realFetch = globalThis.fetch;
    let createDone = false;
    globalThis.fetch = ((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/v1/tax_ids")) {
        // the create call: returns pending + an id.
        createDone = true;
        return Promise.resolve(new Response(JSON.stringify({ id: "txi_poll", verification: { status: "pending" } }), { status: 200 }));
      }
      if (url.includes("/v1/tax_ids/txi_poll")) {
        // the poll GET: now verified.
        return Promise.resolve(new Response(JSON.stringify({ id: "txi_poll", verification: { status: "verified" } }), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as typeof fetch;
    try {
      const r = await validateVatIdViaVies({ stripeSecretKey: "rk_test_x", vatId: "DE143593636", maxPolls: 2, pollDelayMs: 1 });
      assertEquals(createDone, true);
      assertEquals(r, "verified");
    } finally {
      globalThis.fetch = realFetch;
    }
  },
);

// ---- (2) calculateTax VIES policy, BOTH modes (the human-gate flag) ----

Deno.test(
  "X4 VIES OFF (default): format-valid eu_vat -> reverse_charge, not_checked (today's behavior)",
  withStubbedFetch({ calc: DE_B2B }, async () => {
    const r = await calculateTax({ ...REMOTE_VAT_INPUT }); // requireViesValidation defaults false
    assertEquals(r.collectionState, "reverse_charge");
    assertEquals(r.viesStatus, "not_checked");
    assertEquals(r.vatIdRejected, false);
    assertEquals(r.taxAmountCents, 0);
  }),
);

Deno.test(
  "X4 VIES ON + VIES verified: reverse_charge honored, viesStatus=verified",
  withStubbedFetch(
    { calc: DE_B2B, vies: { ok: true, body: { verification: { status: "verified" } } } },
    async () => {
      const r = await calculateTax({ ...REMOTE_VAT_INPUT, requireViesValidation: true });
      assertEquals(r.collectionState, "reverse_charge");
      assertEquals(r.viesStatus, "verified");
    },
  ),
);

Deno.test(
  "X4 VIES ON + VIES unverified: downgraded to vat_id_unverified (NOT a silent 0% reverse-charge)",
  withStubbedFetch(
    { calc: DE_B2B, vies: { ok: true, body: { verification: { status: "unverified" } } } },
    async () => {
      const r = await calculateTax({ ...REMOTE_VAT_INPUT, requireViesValidation: true });
      assertEquals(r.collectionState, "vat_id_unverified");
      assertEquals(r.viesStatus, "unverified");
    },
  ),
);

Deno.test(
  "X4 VIES ON + VIES unavailable: fail closed -> vat_id_unverified (no trust on an unconfirmed id)",
  withStubbedFetch(
    { calc: DE_B2B, vies: { ok: true, body: { verification: { status: "unavailable" } } } },
    async () => {
      const r = await calculateTax({ ...REMOTE_VAT_INPUT, requireViesValidation: true });
      assertEquals(r.collectionState, "vat_id_unverified");
    },
  ),
);

Deno.test(
  "X4 VIES ON but NOT a reverse_charge result (DE B2C not_collecting): VIES not run, state unchanged",
  withStubbedFetch(
    { calc: DE_B2C, vies: { ok: true, body: { verification: { status: "unverified" } } } },
    async () => {
      // No customerVatId -> reverse_charge never happens -> VIES path is not entered.
      const r = await calculateTax({
        ...REMOTE_VAT_INPUT,
        customerVatId: undefined,
        requireViesValidation: true,
      });
      assertEquals(r.collectionState, "not_collecting");
      assertEquals(r.viesStatus, "not_checked");
    },
  ),
);

// ---- (2b) NO-ABUSE: a format-INVALID eu_vat is rejected by Stripe -> retry as B2C ----
// The calc with the VAT id returns tax_id_invalid; calculateTax drops the id and retries,
// landing on not_collecting (the charge path then fires its cross-border / domestic guard).
// A bogus number can NEVER produce a reverse-charge.

const STRIPE_TAX_ID_INVALID = { error: { code: "tax_id_invalid", message: "Invalid value for eu_vat." } };

Deno.test(
  "X4 NO-ABUSE: invalid-format eu_vat -> retried as B2C -> not_collecting, NOT reverse_charge, vatIdRejected=true",
  withStubbedFetch({ calc: [STRIPE_TAX_ID_INVALID, DE_B2C] }, async () => {
    const r = await calculateTax({ ...REMOTE_VAT_INPUT, customerVatId: "NOTAVATID" });
    assertEquals(r.collectionState, "not_collecting"); // never reverse_charge
    assertEquals(r.vatIdRejected, true);
    assertEquals(r.taxAmountCents, 0);
  }),
);

Deno.test(
  "X4 NO-ABUSE: invalid eu_vat + VIES ON -> still B2C (VIES not even consulted; no reverse-charge to trust)",
  withStubbedFetch(
    { calc: [STRIPE_TAX_ID_INVALID, DE_B2C], vies: { ok: true, body: { verification: { status: "verified" } } } },
    async () => {
      const r = await calculateTax({ ...REMOTE_VAT_INPUT, customerVatId: "NOTAVATID", requireViesValidation: true });
      assertEquals(r.collectionState, "not_collecting");
      assertEquals(r.vatIdRejected, true);
      assertEquals(r.viesStatus, "not_checked"); // VIES skipped: not a reverse_charge result
    },
  ),
);

Deno.test(
  "X4 NO-ABUSE: a NON-tax_id error is NOT swallowed (real failures still throw)",
  withStubbedFetch({ calc: { error: { code: "api_error", message: "boom" } } }, async () => {
    let threw = false;
    try {
      await calculateTax({ ...REMOTE_VAT_INPUT });
    } catch (_e) {
      threw = true;
    }
    assertEquals(threw, true);
  }),
);

// ---- (3) CB-F-03: the domestic-guard decision (mirrors create-booking-payment case (c)) ----
// The fix: case (c) is a clean manual fallback ONLY when the manual block applied a
// positive rate (automaticTaxEnabled && taxAmount>0); otherwise fire the domestic guard
// instead of a silent 0%. This pins that decision shape.
function decideDomesticCaseC(args: { automaticTaxEnabled: boolean; taxAmountCents: number }): "manual_fallback" | "domestic_guard" {
  return (args.automaticTaxEnabled && args.taxAmountCents > 0) ? "manual_fallback" : "domestic_guard";
}

Deno.test("X4 CB-F-03: NL remote, applicable_tax_rate NULL (manual skipped) -> domestic_guard (never silent 0%)", () => {
  assertEquals(decideDomesticCaseC({ automaticTaxEnabled: false, taxAmountCents: 0 }), "domestic_guard");
});

Deno.test("X4 CB-F-03: NL remote, applicable_tax_rate 21 (manual applied 21%) -> manual_fallback (no regression)", () => {
  assertEquals(decideDomesticCaseC({ automaticTaxEnabled: true, taxAmountCents: 2100 }), "manual_fallback");
});

Deno.test("X4 CB-F-03: manual enabled but computed 0 tax -> domestic_guard (defensive, still never 0% silently)", () => {
  assertEquals(decideDomesticCaseC({ automaticTaxEnabled: true, taxAmountCents: 0 }), "domestic_guard");
});

Deno.test("X4: guard status constants are stable (reports/X6 key off them)", () => {
  assertEquals(DOMESTIC_RATE_UNAVAILABLE_STATUS, "domestic_rate_unavailable");
  assertEquals(VAT_ID_UNVERIFIED_STATUS, "vat_id_unverified");
});

// ---- (4) zod bounds for the new flag ----

Deno.test("X4: zod accepts requireViesValidation and defaults it false (policy default = format-only)", () => {
  const parsed = TaxCalcInputSchema.parse({
    stripeSecretKey: "rk_test_x",
    connectedAccountId: "acct_x",
    currency: "eur",
    lineAmountCents: 10000,
    taxCode: "txcd_10000000",
    taxBehavior: "exclusive",
    customerCountry: "DE",
    customerVatId: "DE123456789",
  });
  assertEquals(parsed.requireViesValidation, false);
});

Deno.test("X4: zod accepts requireViesValidation true (the one-liner flip)", () => {
  const parsed = TaxCalcInputSchema.parse({
    stripeSecretKey: "rk_test_x",
    connectedAccountId: "acct_x",
    currency: "eur",
    lineAmountCents: 10000,
    taxCode: "txcd_10000000",
    taxBehavior: "exclusive",
    customerCountry: "DE",
    requireViesValidation: true,
  });
  assertEquals(parsed.requireViesValidation, true);
});
