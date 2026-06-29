// Regression guard for F-TAX-02 (generate-tax-report / export-tax-report VAT math).
// The bug: tax was read ONLY from `amount_details.tax.amount`, which is absent on
// BA's manual-tax PaymentIntents (the common path), so tax collapsed to 0, net to
// gross, and the reported VAT rate to 0%. resolvePaymentTaxCents() is the single
// authoritative source both report fns use: Stripe automatic_tax cents first, then
// the BA metadata.tax_amount (EUR string) fallback. With net = gross - tax and
// rate = tax / net, an inclusive 21% NL amount is arithmetically exact.
//
// Run: deno test supabase/functions/_shared/taxReport.test.ts
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  computeRefundAdjustedRow,
  computeRegistrationStatus,
  resolvePaymentTaxCents,
  resolveRefundedCents,
} from "./taxReport.ts";

Deno.test("F-TAX-02: automatic_tax amount_details.tax.amount is authoritative when present", () => {
  // gross 12100 cents (121.00), Stripe-calculated tax 2100 cents (21.00)
  assertEquals(resolvePaymentTaxCents({ amount_details: { tax: { amount: 2100 } } }), 2100);
});

Deno.test("F-TAX-02: falls back to metadata.tax_amount (EUR string) for the manual-tax path", () => {
  // No amount_details.tax (raw PI = {"tip":{}}); BA wrote tax_amount "21.00".
  assertEquals(resolvePaymentTaxCents({ amount_details: { tip: {} } as any, metadata: { tax_amount: "21.00" } }), 2100);
  // metadata tax_amount with cents precision
  assertEquals(resolvePaymentTaxCents({ metadata: { tax_amount: "8.68" } }), 868);
});

Deno.test("F-TAX-02: automatic_tax takes priority over metadata", () => {
  assertEquals(
    resolvePaymentTaxCents({ amount_details: { tax: { amount: 2100 } }, metadata: { tax_amount: "99.99" } }),
    2100,
  );
});

Deno.test("F-TAX-02: no tax anywhere -> 0 (untaxed booking, not a fabricated rate)", () => {
  assertEquals(resolvePaymentTaxCents({ amount_details: { tip: {} } as any }), 0);
  assertEquals(resolvePaymentTaxCents({}), 0);
  assertEquals(resolvePaymentTaxCents({ metadata: {} }), 0);
});

Deno.test("F-TAX-02: malformed / non-positive tax values are ignored", () => {
  assertEquals(resolvePaymentTaxCents({ amount_details: { tax: { amount: 0 } } }), 0);
  assertEquals(resolvePaymentTaxCents({ metadata: { tax_amount: "not-a-number" } }), 0);
  assertEquals(resolvePaymentTaxCents({ metadata: { tax_amount: "-5.00" } }), 0);
});

Deno.test("F-TAX-02: NL 21% inclusive is arithmetically exact (net/tax/rate)", () => {
  const grossCents = 12100;
  const taxCents = resolvePaymentTaxCents({ metadata: { tax_amount: "21.00" } });
  const netCents = grossCents - taxCents;
  assertEquals(taxCents, 2100);
  assertEquals(netCents, 10000);
  // VAT rate = tax / net (net is the taxable base); 2100/10000 = 21.00%
  assertEquals(Math.round((taxCents / netCents) * 100 * 100) / 100, 21.0);
});

Deno.test("F-TAX-02: EU rate (DE 19% inclusive) is exact", () => {
  // gross 119.00, inclusive 19% -> tax 19.00, net 100.00
  const grossCents = 11900;
  const taxCents = resolvePaymentTaxCents({ metadata: { tax_amount: "19.00" } });
  const netCents = grossCents - taxCents;
  assertEquals(taxCents, 1900);
  assertEquals(netCents, 10000);
  assertEquals(Math.round((taxCents / netCents) * 100 * 100) / 100, 19.0);
});

Deno.test("F-TAX-02: exempt service (tax disabled) -> 0 tax, 0% rate, gross == net", () => {
  const grossCents = 10000;
  const taxCents = resolvePaymentTaxCents({ amount_details: { tip: {} } as any, metadata: {} });
  const netCents = grossCents - taxCents;
  assertEquals(taxCents, 0);
  assertEquals(netCents, grossCents);
  const rate = taxCents > 0 && netCents > 0 ? (taxCents / netCents) * 100 : 0;
  assertEquals(rate, 0);
});

// ---- F-TAX-17: refunds must be reflected in every tax figure ----

Deno.test("F-TAX-17: resolveRefundedCents reads latest_charge.amount_refunded (expanded charge)", () => {
  assertEquals(resolveRefundedCents({ latest_charge: { amount_refunded: 6050 } }), 6050);
});

Deno.test("F-TAX-17: resolveRefundedCents tolerates legacy charges.data[0] + flat amount_refunded", () => {
  assertEquals(resolveRefundedCents({ charges: { data: [{ amount_refunded: 6050 }] } }), 6050);
  assertEquals(resolveRefundedCents({ amount_refunded: 6050 }), 6050);
});

Deno.test("F-TAX-17: resolveRefundedCents = 0 when not refunded or only an unexpanded charge id", () => {
  assertEquals(resolveRefundedCents({}), 0);
  assertEquals(resolveRefundedCents({ latest_charge: "ch_123" }), 0); // id, no figure
  assertEquals(resolveRefundedCents({ latest_charge: { amount_refunded: 0 } }), 0);
  assertEquals(resolveRefundedCents({ amount_refunded: 0 }), 0);
});

Deno.test("F-TAX-17: NO refund -> row unchanged (121/21/100)", () => {
  // NL 121.00 incl 21% -> tax 21.00, net 100.00, no refund.
  const row = computeRefundAdjustedRow(12100, 2100, 0);
  assertEquals(row, { grossCents: 12100, taxCents: 2100, netCents: 10000, refundedCents: 0, fullyRefunded: false });
});

Deno.test("F-TAX-17: PARTIAL refund 60.50 on 121/21 -> 60.50 gross / 10.50 VAT / 50.00 net (the proven case)", () => {
  // gross 121.00, tax 21.00, partial refund 60.50 (exactly half). keptGross 60.50,
  // keptTax = round(2100 * 6050 / 12100) = round(1050) = 1050 (10.50), keptNet 50.00.
  const row = computeRefundAdjustedRow(12100, 2100, 6050);
  assertEquals(row.grossCents, 6050);
  assertEquals(row.taxCents, 1050);
  assertEquals(row.netCents, 5000);
  assertEquals(row.refundedCents, 6050);
  assertEquals(row.fullyRefunded, false);
  // internally consistent: gross == net + tax
  assertEquals(row.grossCents, row.netCents + row.taxCents);
  // tax_kept == round(tax * net_kept / net_orig): 2100 * 5000 / 10000 = 1050
  assertEquals(Math.round((2100 * row.netCents) / 10000), row.taxCents);
});

Deno.test("F-TAX-17: FULL refund on 121/21 -> 0 / 0 / 0, fullyRefunded", () => {
  const row = computeRefundAdjustedRow(12100, 2100, 12100);
  assertEquals(row, { grossCents: 0, taxCents: 0, netCents: 0, refundedCents: 12100, fullyRefunded: true });
});

Deno.test("F-TAX-17: over-refund (refund > gross, defensive) -> still 0 / 0 / 0", () => {
  const row = computeRefundAdjustedRow(12100, 2100, 99999);
  assertEquals(row.grossCents, 0);
  assertEquals(row.taxCents, 0);
  assertEquals(row.netCents, 0);
  assertEquals(row.fullyRefunded, true);
});

Deno.test("F-TAX-17: partial refund stays internally consistent at an awkward rounding point", () => {
  // gross 100.00, tax 8.68 (an odd-cent VAT), refund 33.33.
  const row = computeRefundAdjustedRow(10000, 868, 3333);
  // keptGross 66.67, keptTax = round(868 * 6667 / 10000) = round(578.6...) = 579
  assertEquals(row.grossCents, 6667);
  assertEquals(row.taxCents, 579);
  assertEquals(row.netCents, 6667 - 579);
  // row is always self-consistent (no double rounding): gross == net + tax
  assertEquals(row.grossCents, row.netCents + row.taxCents);
});

Deno.test("F-TAX-17: rows sum to the TOTAL (no double counting across a mixed batch)", () => {
  // NL full-price, NL half-refunded, DE fully-refunded.
  const r1 = computeRefundAdjustedRow(12100, 2100, 0);     // 121 / 21 / 100
  const r2 = computeRefundAdjustedRow(12100, 2100, 6050);  // 60.50 / 10.50 / 50
  const r3 = computeRefundAdjustedRow(11900, 1900, 11900); // 0 / 0 / 0
  const totalGross = r1.grossCents + r2.grossCents + r3.grossCents;
  const totalTax = r1.taxCents + r2.taxCents + r3.taxCents;
  const totalNet = r1.netCents + r2.netCents + r3.netCents;
  assertEquals(totalGross, 18150); // 121.00 + 60.50 + 0
  assertEquals(totalTax, 3150);    // 21.00 + 10.50 + 0
  assertEquals(totalNet, 15000);   // 100.00 + 50.00 + 0
  // TOTAL itself is internally consistent.
  assertEquals(totalGross, totalNet + totalTax);
});

Deno.test("F-TAX-17: refund on an exempt (0-tax) booking removes gross only, tax stays 0", () => {
  // gross 100.00, tax 0, refund 40.00 -> keptGross 60.00, keptTax 0, keptNet 60.00.
  const row = computeRefundAdjustedRow(10000, 0, 4000);
  assertEquals(row.grossCents, 6000);
  assertEquals(row.taxCents, 0);
  assertEquals(row.netCents, 6000);
  assertEquals(row.refundedCents, 4000);
});

// ---- F-TAX-18: per-country registration reflects the merchant AGGREGATE ----

Deno.test("F-TAX-18: aggregate >= threshold -> required (multi-calendar sum crosses it)", () => {
  // Threshold 20000. Cal A 12000 + Cal B 9000 = 21000 aggregate.
  // The bug clobbered the row with only the LAST calendar's revenue (e.g. 9000 <
  // 20000 -> not required). The aggregate correctly flags required.
  const calA = 12000, calB = 9000, threshold = 20000;
  // Single-calendar (buggy) view would NOT require:
  assertEquals(computeRegistrationStatus(calB, threshold).registrationRequired, false);
  // Aggregate view DOES require:
  const agg = computeRegistrationStatus(calA + calB, threshold);
  assertEquals(agg.registrationRequired, true);
  assertEquals(agg.registrationRecommended, true);
});

Deno.test("F-TAX-18: aggregate at 80% -> recommended but not required", () => {
  const status = computeRegistrationStatus(16000, 20000); // exactly 80%
  assertEquals(status.registrationRequired, false);
  assertEquals(status.registrationRecommended, true);
});

Deno.test("F-TAX-18: aggregate below 80% -> neither", () => {
  const status = computeRegistrationStatus(10000, 20000);
  assertEquals(status.registrationRequired, false);
  assertEquals(status.registrationRecommended, false);
});

Deno.test("F-TAX-18: aggregate exactly at threshold -> required", () => {
  const status = computeRegistrationStatus(20000, 20000);
  assertEquals(status.registrationRequired, true);
});
