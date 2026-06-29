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
import { resolvePaymentTaxCents } from "./taxReport.ts";

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
