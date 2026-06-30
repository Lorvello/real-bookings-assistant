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
