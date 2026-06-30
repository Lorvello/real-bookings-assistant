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
  buildWhatsappBookingPaymentRow,
  classifyJurisdictionLine,
  computePerJurisdictionReport,
  computeRefundAdjustedRow,
  computeRegistrationStatus,
  type JurisdictionRowInput,
  resolvePaymentTaxCents,
  resolveRefundedCents,
  retrieveBookingPaymentIntent,
} from "./taxReport.ts";

import { assertRejects } from "https://deno.land/std@0.190.0/testing/asserts.ts";

// X5 helper, used to PROVE the X6 OSS-eligible bucket reconciles with the X5 threshold
// resolver on the same rows (one source of truth for "what counts cross-border B2C").
import { computeOssBucket, type BookingPaymentRowLike } from "./ossThreshold.ts";

// A minimal Stripe double whose paymentIntents.retrieve resolves only when called in
// the configured "live" account context (platform = no opts.stripeAccount; connected =
// opts.stripeAccount === connectedId). Any other context throws a resource_missing
// shaped error, exactly like the real Stripe SDK.
function makeStripeDouble(
  pi: Record<string, unknown>,
  livesOn: "platform" | "connected",
  connectedId: string,
) {
  const missing = () => {
    const e = new Error("No such payment_intent") as Error & { code: string; statusCode: number };
    e.code = "resource_missing";
    e.statusCode = 404;
    return e;
  };
  const calls: Array<{ ctx: "platform" | "connected" }> = [];
  return {
    calls,
    paymentIntents: {
      // deno-lint-ignore no-explicit-any
      retrieve: (_id: string, _params?: any, opts?: { stripeAccount?: string }) => {
        const ctx: "platform" | "connected" = opts?.stripeAccount ? "connected" : "platform";
        calls.push({ ctx });
        if (ctx === livesOn && (ctx === "platform" || opts?.stripeAccount === connectedId)) {
          return Promise.resolve(pi);
        }
        return Promise.reject(missing());
      },
    },
  };
}

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

// ---------------------------------------------------------------------------
// F-TAX-21: report PI retrieval must use the CORRECT account context.
// Real booking-flow charges are DESTINATION charges on the PLATFORM account;
// installment charges are DIRECT charges on the CONNECTED account. The shared
// retriever tries platform first then connected, and re-throws if both miss so
// the dropped transaction is surfaced (not silently swallowed).
// ---------------------------------------------------------------------------

Deno.test("F-TAX-21: destination-charge PI is found in PLATFORM context (the real-booking case)", async () => {
  const pi = { id: "pi_dest", amount: 12100, metadata: { tax_amount: "21.00" } };
  const s = makeStripeDouble(pi, "platform", "acct_connected");
  const got = await retrieveBookingPaymentIntent(s, "pi_dest", "acct_connected", ["latest_charge"]);
  assertEquals((got as { id: string }).id, "pi_dest");
  // Platform context tried first and succeeded; connected never called.
  assertEquals(s.calls.length, 1);
  assertEquals(s.calls[0].ctx, "platform");
});

Deno.test("F-TAX-21: installment direct-charge PI falls back to CONNECTED context", async () => {
  const pi = { id: "pi_installment", amount: 5000 };
  const s = makeStripeDouble(pi, "connected", "acct_connected");
  const got = await retrieveBookingPaymentIntent(s, "pi_installment", "acct_connected", ["latest_charge"]);
  assertEquals((got as { id: string }).id, "pi_installment");
  // Platform tried (miss) then connected (hit).
  assertEquals(s.calls.length, 2);
  assertEquals(s.calls[0].ctx, "platform");
  assertEquals(s.calls[1].ctx, "connected");
});

Deno.test("F-TAX-21: PI missing in BOTH contexts RE-THROWS (surfaced, not swallowed)", async () => {
  // livesOn a different connected id than we pass -> both platform and the passed
  // connected context miss.
  const pi = { id: "pi_orphan" };
  const s = makeStripeDouble(pi, "connected", "acct_other");
  await assertRejects(
    () => retrieveBookingPaymentIntent(s, "pi_orphan", "acct_connected", ["latest_charge"]),
    Error,
    "resource_missing in both",
  );
  assertEquals(s.calls.length, 2); // platform then connected, both attempted
});

Deno.test("F-TAX-21: a non-missing error (auth/network) is re-thrown immediately, no connected fallback", async () => {
  const authErr = new Error("Invalid API Key") as Error & { code: string; statusCode: number };
  authErr.code = "authentication_error";
  authErr.statusCode = 401;
  const calls: Array<string> = [];
  const s = {
    paymentIntents: {
      // deno-lint-ignore no-explicit-any
      retrieve: (_id: string, _p?: any, opts?: { stripeAccount?: string }) => {
        calls.push(opts?.stripeAccount ? "connected" : "platform");
        return Promise.reject(authErr);
      },
    },
  };
  await assertRejects(
    () => retrieveBookingPaymentIntent(s, "pi_x", "acct_connected", ["latest_charge"]),
    Error,
    "Invalid API Key",
  );
  // Only the platform attempt happened; a non-missing error short-circuits (no
  // pointless connected retry that would also fail).
  assertEquals(calls.length, 1);
  assertEquals(calls[0], "platform");
});

// ---------------------------------------------------------------------------
// F-TAX-23: the WhatsApp / hosted-Checkout pay-and-book path must create a
// booking_payments row (the web path's only inserter is create-booking-payment),
// or the tax filing reports (which read FROM booking_payments) show EUR0 VAT on a
// real WhatsApp charge. buildWhatsappBookingPaymentRow builds that row, mirroring
// create-booking-payment's shape for every column the reports + retrieveBookingPaymentIntent
// rely on. The stripe_account_id MUST be the CONNECTED destination account (what the
// reports filter by), the status MUST be 'succeeded' (the report filter), and the
// amount/currency come straight from the charged PI.
// ---------------------------------------------------------------------------

Deno.test("F-TAX-23: row mirrors the web-path shape (connected acct, gross amount, succeeded)", () => {
  const row = buildWhatsappBookingPaymentRow({
    bookingId: "bk_1",
    paymentIntentId: "pi_wa_1",
    connectedAccountId: "acct_connected",
    amountCents: 12100, // 121.00 gross (100 + 21% VAT)
    currency: "EUR",
    applicationFeeCents: 255,
    customerEmail: "c@example.com",
    customerName: "Customer One",
    paymentMethodType: "ideal",
  });
  assertEquals(row, {
    booking_id: "bk_1",
    stripe_payment_intent_id: "pi_wa_1",
    // The reports filter booking_payments by stripe_account_id == the connected
    // destination account, NOT the platform account.
    stripe_account_id: "acct_connected",
    amount_cents: 12100,
    currency: "eur", // normalized lowercase to match the schema default + web path
    platform_fee_cents: 255,
    status: "succeeded", // report filter is status IN (succeeded, completed)
    customer_email: "c@example.com",
    customer_name: "Customer One",
    payment_method_type: "ideal",
    // X3b-1: cross-border columns default to the domestic/in_person shape when no
    // cross-border input is supplied (null/null/false), byte-identical to the web path.
    customer_country: null,
    tax_breakdown: null,
    reverse_charge: false,
  });
});

Deno.test("F-TAX-23: defaults are safe (missing fee/customer/method, currency fallback)", () => {
  const row = buildWhatsappBookingPaymentRow({
    bookingId: "bk_2",
    paymentIntentId: "pi_wa_2",
    connectedAccountId: "acct_x",
    amountCents: 5000,
    currency: "",
  });
  assertEquals(row.platform_fee_cents, 0);
  assertEquals(row.currency, "eur");
  assertEquals(row.customer_email, null);
  assertEquals(row.customer_name, null);
  assertEquals(row.payment_method_type, null);
  assertEquals(row.status, "succeeded");
});

Deno.test("F-TAX-23: amount/fee are rounded to integer cents (no fractional cents)", () => {
  const row = buildWhatsappBookingPaymentRow({
    bookingId: "bk_3",
    paymentIntentId: "pi_wa_3",
    connectedAccountId: "acct_y",
    amountCents: 12100.4,
    currency: "eur",
    applicationFeeCents: 254.6,
  });
  assertEquals(row.amount_cents, 12100);
  assertEquals(row.platform_fee_cents, 255);
});

Deno.test("F-TAX-23: idempotency key is the PI id, identical across retries (no double row)", () => {
  // Two builds for the SAME charge (a webhook retry / dual-event) produce the SAME
  // stripe_payment_intent_id, which is the UNIQUE upsert conflict target, so the
  // second is a no-op at the DB layer (ignoreDuplicates) instead of a second row.
  const a = buildWhatsappBookingPaymentRow({
    bookingId: "bk_4", paymentIntentId: "pi_wa_4", connectedAccountId: "acct_z",
    amountCents: 12100, currency: "eur",
  });
  const b = buildWhatsappBookingPaymentRow({
    bookingId: "bk_4", paymentIntentId: "pi_wa_4", connectedAccountId: "acct_z",
    amountCents: 12100, currency: "eur",
  });
  assertEquals(a.stripe_payment_intent_id, b.stripe_payment_intent_id);
  assertEquals(a, b);
});

// ---------------------------------------------------------------------------
// X3b-1: the WhatsApp charge path now mirrors create-booking-payment's three X1
// cross-border columns (customer_country, tax_breakdown, reverse_charge) so a remote
// WhatsApp charge is report-visible per-jurisdiction (X6), not just a blended figure.
// These are sourced from the PI metadata the handler stamps; the builder must persist
// them when supplied and default to the domestic shape (null/null/false) when not.
// ---------------------------------------------------------------------------

Deno.test("X3b-1: remote cross-border guard charge persists country + breakdown, reverse_charge false", () => {
  const breakdown = [
    { amountCents: 0, inclusive: false, taxabilityReason: "cross_border_rate_unavailable", country: "DE", percentageDecimal: null, taxType: null },
    { amountCents: 0, inclusive: false, taxabilityReason: "not_collecting", country: "DE", percentageDecimal: "0.0", taxType: "vat" },
  ];
  const row = buildWhatsappBookingPaymentRow({
    bookingId: "bk_de", paymentIntentId: "pi_wa_de", connectedAccountId: "acct_c",
    amountCents: 10000, currency: "eur", applicationFeeCents: 215,
    customerCountry: "DE", taxBreakdown: breakdown, reverseCharge: false,
  });
  assertEquals(row.customer_country, "DE");
  assertEquals(row.tax_breakdown, breakdown);
  assertEquals(row.reverse_charge, false);
  // amount stays the bare base (no fake tax) for the guard case.
  assertEquals(row.amount_cents, 10000);
});

Deno.test("X3b-1: remote DE-B2B reverse-charge persists reverse_charge=true + country", () => {
  const breakdown = [
    { amountCents: 0, inclusive: false, taxabilityReason: "reverse_charge", country: "DE", percentageDecimal: "0.0", taxType: "vat" },
  ];
  const row = buildWhatsappBookingPaymentRow({
    bookingId: "bk_b2b", paymentIntentId: "pi_wa_b2b", connectedAccountId: "acct_c",
    amountCents: 10000, currency: "eur",
    customerCountry: "DE", taxBreakdown: breakdown, reverseCharge: true,
  });
  assertEquals(row.customer_country, "DE");
  assertEquals(row.reverse_charge, true);
  assertEquals(row.tax_breakdown, breakdown);
});

Deno.test("X3b-1: domestic NL fallback persists country NL + breakdown, reverse_charge false", () => {
  const breakdown = [
    { amountCents: 0, inclusive: false, taxabilityReason: "not_collecting", country: "NL", percentageDecimal: "0.0", taxType: "vat" },
  ];
  const row = buildWhatsappBookingPaymentRow({
    bookingId: "bk_nl", paymentIntentId: "pi_wa_nl", connectedAccountId: "acct_c",
    amountCents: 12100, currency: "eur", // NL 21% via the manual fallback
    customerCountry: "NL", taxBreakdown: breakdown, reverseCharge: false,
  });
  assertEquals(row.customer_country, "NL");
  assertEquals(row.reverse_charge, false);
  assertEquals(row.amount_cents, 12100);
});

Deno.test("X3b-1: in_person / domestic (no cross-border input) stays null/null/false (no regression)", () => {
  const row = buildWhatsappBookingPaymentRow({
    bookingId: "bk_ip", paymentIntentId: "pi_wa_ip", connectedAccountId: "acct_c",
    amountCents: 12100, currency: "eur", applicationFeeCents: 255,
    customerEmail: "ip@example.com", customerName: "In Person",
    // no customerCountry / taxBreakdown / reverseCharge supplied
  });
  assertEquals(row.customer_country, null);
  assertEquals(row.tax_breakdown, null);
  assertEquals(row.reverse_charge, false);
});

Deno.test("X3b-1: reverse_charge coerces non-true to false (null/undefined -> false)", () => {
  const rowNull = buildWhatsappBookingPaymentRow({
    bookingId: "bk_x", paymentIntentId: "pi_wa_x", connectedAccountId: "acct_c",
    amountCents: 10000, currency: "eur", reverseCharge: null,
  });
  assertEquals(rowNull.reverse_charge, false);
});

// ---------------------------------------------------------------------------
// X6: per-jurisdiction VAT summary + reverse-charge markers + OSS-eligible bucket.
// computePerJurisdictionReport reduces the report's refund-adjusted per-row inputs +
// the authoritative persisted cross-border columns (customer_country / tax_breakdown /
// reverse_charge) into per-country lines, marks a B2B reverse-charge 0% DISTINCTLY from
// a not_collecting / guard 0%, and surfaces the cross-border B2C OSS bucket. It reads
// the authoritative fields ONLY, never the stale PI metadata.tax_rate (CB-F-04).
// ---------------------------------------------------------------------------

// breakdown shapes mirroring what taxCalc.ts normalizes + the charge fns persist.
const bdNotCollecting = (country: string) => [
  { amountCents: 0, inclusive: false, taxabilityReason: "not_collecting", country, percentageDecimal: "0.0", taxType: "vat" },
];
const bdCrossBorderGuard = (country: string) => [
  { amountCents: 0, inclusive: false, taxabilityReason: "cross_border_rate_unavailable", country, percentageDecimal: null, taxType: null },
  { amountCents: 0, inclusive: false, taxabilityReason: "not_collecting", country, percentageDecimal: "0.0", taxType: "vat" },
];
const bdReverseCharge = (country: string) => [
  { amountCents: 0, inclusive: false, taxabilityReason: "reverse_charge", country, percentageDecimal: "0.0", taxType: "vat" },
];
const bdCollected = (country: string, taxCents: number) => [
  { amountCents: taxCents, inclusive: true, taxabilityReason: "standard_rated", country, percentageDecimal: "0.21", taxType: "vat" },
];

Deno.test("X6 classify: reverse_charge flag OR marker -> reverse_charge (distinct from 0%)", () => {
  assertEquals(classifyJurisdictionLine(true, [], 0), "reverse_charge");
  assertEquals(classifyJurisdictionLine(false, bdReverseCharge("DE"), 0), "reverse_charge");
  // not_collecting 0% is NOT reverse_charge -> domestic/0% line, the auditable distinction.
  assertEquals(classifyJurisdictionLine(false, bdNotCollecting("DE"), 0), "domestic");
});

Deno.test("X6 classify: cross-border guard + domestic guard are their own line types", () => {
  assertEquals(classifyJurisdictionLine(false, bdCrossBorderGuard("DE"), 0), "cross_border_unavailable");
  assertEquals(
    classifyJurisdictionLine(false, [{ taxabilityReason: "domestic_rate_unavailable", country: "NL" }], 0),
    "domestic_unavailable",
  );
  // positive kept tax -> collected.
  assertEquals(classifyJurisdictionLine(false, bdCollected("NL", 2100), 2100), "collected");
});

Deno.test("X6: per-country VAT summary reconciles to the cent with the persisted rows", () => {
  // NL collected 21% (12100 gross / 2100 tax), DE-B2C guard 0% (10000/0),
  // DE-B2B reverse-charge 0% (10000/0), FR-B2C guard 0% (10000/0).
  const rows: JurisdictionRowInput[] = [
    { customerCountry: "NL", taxBreakdown: bdCollected("NL", 2100), reverseCharge: false, grossCents: 12100, taxCents: 2100, netCents: 10000 },
    { customerCountry: "DE", taxBreakdown: bdCrossBorderGuard("DE"), reverseCharge: false, grossCents: 10000, taxCents: 0, netCents: 10000 },
    { customerCountry: "DE", taxBreakdown: bdReverseCharge("DE"), reverseCharge: true, grossCents: 10000, taxCents: 0, netCents: 10000 },
    { customerCountry: "FR", taxBreakdown: bdCrossBorderGuard("FR"), reverseCharge: false, grossCents: 10000, taxCents: 0, netCents: 10000 },
  ];
  const rep = computePerJurisdictionReport(rows, "NL");

  // Per-country VAT: only NL collected VAT (2100); DE + FR guard/reverse contribute 0.
  assertEquals(rep.totalCollectedTaxCents, 2100);
  // 3 distinct destination countries seen (NL, DE, FR).
  assertEquals(rep.countryCount, 3);

  // NL line is collected at 21%.
  const nl = rep.lines.find((l) => l.country === "NL" && l.lineType === "collected");
  assertEquals(nl?.taxCents, 2100);
  assertEquals(nl?.netCents, 10000);
  assertEquals(nl?.effectiveRatePct, 21.0);
  assertEquals(nl?.reverseCharge, false);

  // The DE reverse-charge line and the DE guard line are DISTINCT buckets (same country).
  const deReverse = rep.lines.find((l) => l.country === "DE" && l.lineType === "reverse_charge");
  const deGuard = rep.lines.find((l) => l.country === "DE" && l.lineType === "cross_border_unavailable");
  assertEquals(deReverse?.reverseCharge, true);
  assertEquals(deReverse?.taxCents, 0);
  assertEquals(deGuard?.reverseCharge, false);
  assertEquals(deGuard?.taxCents, 0);
  // The two DE lines are NOT merged (auditability: reverse-charge vs not_collecting).
  assertEquals(rep.lines.filter((l) => l.country === "DE").length, 2);
});

Deno.test("X6: reverse-charge marker is distinct from a not_collecting 0% line", () => {
  // Two DE rows, both 0% to the buyer, but one is B2B reverse-charge and one is a plain
  // not_collecting guard. They MUST be separable in the output (different lineType +
  // reverseCharge flag), so a filing can audit B2B reverse-charge vs uncollected.
  const rows: JurisdictionRowInput[] = [
    { customerCountry: "DE", taxBreakdown: bdReverseCharge("DE"), reverseCharge: true, grossCents: 10000, taxCents: 0, netCents: 10000 },
    { customerCountry: "DE", taxBreakdown: bdCrossBorderGuard("DE"), reverseCharge: false, grossCents: 5000, taxCents: 0, netCents: 5000 },
  ];
  const rep = computePerJurisdictionReport(rows, "NL");
  assertEquals(rep.reverseChargeTransactionCount, 1);
  assertEquals(rep.crossBorderGuardTransactionCount, 1);
  const reverse = rep.lines.find((l) => l.lineType === "reverse_charge");
  const guard = rep.lines.find((l) => l.lineType === "cross_border_unavailable");
  assertEquals(reverse?.reverseCharge, true);
  assertEquals(guard?.reverseCharge, false);
  // They are genuinely two different lines.
  assertEquals(rep.lines.length, 2);
});

Deno.test("X6: OSS-eligible bucket aggregates cross-border B2C and ties to the X5 resolver", () => {
  // DE-B2C guard (10000), FR-B2C guard (10000) -> cross-border B2C, count toward OSS.
  // NL collected -> domestic, excluded. DE-B2B reverse-charge -> excluded (B2B 0%).
  const rows: JurisdictionRowInput[] = [
    { customerCountry: "NL", taxBreakdown: bdCollected("NL", 2100), reverseCharge: false, grossCents: 12100, taxCents: 2100, netCents: 10000 },
    { customerCountry: "DE", taxBreakdown: bdCrossBorderGuard("DE"), reverseCharge: false, grossCents: 10000, taxCents: 0, netCents: 10000 },
    { customerCountry: "DE", taxBreakdown: bdReverseCharge("DE"), reverseCharge: true, grossCents: 10000, taxCents: 0, netCents: 10000 },
    { customerCountry: "FR", taxBreakdown: bdCrossBorderGuard("FR"), reverseCharge: false, grossCents: 10000, taxCents: 0, netCents: 10000 },
  ];
  const rep = computePerJurisdictionReport(rows, "NL");
  // OSS = the two cross-border B2C guard rows (DE + FR). NL domestic + DE B2B excluded.
  assertEquals(rep.ossEligible.transactionCount, 2);
  assertEquals(rep.ossEligible.grossCents, 20000);
  assertEquals(rep.ossEligible.taxableCents, 20000); // net-of-VAT (0 tax here) + net-of-refund
  assertEquals(rep.ossEligible.countries, ["DE", "FR"]);

  // RECONCILIATION with the X5 OSS threshold resolver on the SAME data: build the
  // equivalent booking_payments rows and assert the X5 cumulative == the X6 taxable.
  const x5Rows: BookingPaymentRowLike[] = [
    { amount_cents: 12100, customer_country: "NL", reverse_charge: false, tax_breakdown: bdCollected("NL", 2100), status: "succeeded" },
    { amount_cents: 10000, customer_country: "DE", reverse_charge: false, tax_breakdown: bdCrossBorderGuard("DE"), status: "succeeded" },
    { amount_cents: 10000, customer_country: "DE", reverse_charge: true, tax_breakdown: bdReverseCharge("DE"), status: "succeeded" },
    { amount_cents: 10000, customer_country: "FR", reverse_charge: false, tax_breakdown: bdCrossBorderGuard("FR"), status: "succeeded" },
  ];
  const x5 = computeOssBucket(x5Rows, "NL");
  assertEquals(x5.cumulativeCents, rep.ossEligible.taxableCents); // 20000 == 20000
  assertEquals(x5.contributingPayments, rep.ossEligible.transactionCount); // 2 == 2
});

Deno.test("X6: OSS taxable nets refunds (a partial-refunded cross-border B2C counts less)", () => {
  // DE-B2C collected (hypothetically post-registration) 11900 gross / 1900 tax / 10000 net,
  // half refunded -> the report passes the refund-adjusted figures (5950/950/5000). The
  // OSS taxable for this row is the kept net (5000), not the original 10000.
  const rows: JurisdictionRowInput[] = [
    { customerCountry: "DE", taxBreakdown: bdCollected("DE", 1900), reverseCharge: false, grossCents: 5950, taxCents: 950, netCents: 5000 },
  ];
  const rep = computePerJurisdictionReport(rows, "NL");
  assertEquals(rep.ossEligible.transactionCount, 1);
  assertEquals(rep.ossEligible.taxableCents, 5000); // kept net, refund excluded
  // And the per-country collected VAT for DE is the kept (refund-adjusted) tax.
  const de = rep.lines.find((l) => l.country === "DE" && l.lineType === "collected");
  assertEquals(de?.taxCents, 950);
});

Deno.test("X6 CB-F-04: a stale metadata-style 21% rate cannot fabricate VAT on a 0% guard line", () => {
  // The persisted tax_breakdown says cross-border guard 0% and taxCents is 0 (the
  // authoritative refund-adjusted figure). Even though the CHARGE fn also stamped a
  // legacy metadata tax_rate=21 on the PI, the resolver reads ONLY taxCents + the
  // breakdown, so the line is 0% / guard, NOT a fabricated 21%.
  const rows: JurisdictionRowInput[] = [
    { customerCountry: "DE", taxBreakdown: bdCrossBorderGuard("DE"), reverseCharge: false, grossCents: 10000, taxCents: 0, netCents: 10000 },
  ];
  const rep = computePerJurisdictionReport(rows, "NL");
  const de = rep.lines.find((l) => l.country === "DE");
  assertEquals(de?.lineType, "cross_border_unavailable");
  assertEquals(de?.taxCents, 0);
  assertEquals(de?.effectiveRatePct, 0); // never 21 from stale metadata
  assertEquals(rep.totalCollectedTaxCents, 0);
});

Deno.test("X6: country falls back to the breakdown when customer_country is null (legacy row)", () => {
  // An older row that did not persist customer_country but whose breakdown carries DE.
  const rows: JurisdictionRowInput[] = [
    { customerCountry: null, taxBreakdown: bdCrossBorderGuard("DE"), reverseCharge: false, grossCents: 10000, taxCents: 0, netCents: 10000 },
  ];
  const rep = computePerJurisdictionReport(rows, "NL");
  assertEquals(rep.lines[0].country, "DE"); // recovered from the breakdown, not "UNKNOWN"
  assertEquals(rep.ossEligible.countries, ["DE"]); // and it still counts cross-border
});

Deno.test("X6: a row with no country anywhere is kept as UNKNOWN (never silently dropped)", () => {
  const rows: JurisdictionRowInput[] = [
    { customerCountry: null, taxBreakdown: null, reverseCharge: false, grossCents: 12100, taxCents: 2100, netCents: 10000 },
  ];
  const rep = computePerJurisdictionReport(rows, "NL");
  assertEquals(rep.lines[0].country, "UNKNOWN");
  assertEquals(rep.lines[0].taxCents, 2100); // its VAT is still summed
  assertEquals(rep.countryCount, 0); // UNKNOWN is not counted as a destination country
  // UNKNOWN is not merchant NL and not reverse-charge, but country==UNKNOWN is excluded
  // from OSS (we cannot attribute it to a destination -> not auto-counted cross-border).
  assertEquals(rep.ossEligible.transactionCount, 0);
});

Deno.test("X6: in_person / domestic NL only -> no cross-border, OSS bucket empty (no regression)", () => {
  const rows: JurisdictionRowInput[] = [
    { customerCountry: null, taxBreakdown: null, reverseCharge: false, grossCents: 12100, taxCents: 2100, netCents: 10000 },
    { customerCountry: "NL", taxBreakdown: bdNotCollecting("NL"), reverseCharge: false, grossCents: 12100, taxCents: 2100, netCents: 10000 },
  ];
  const rep = computePerJurisdictionReport(rows, "NL");
  assertEquals(rep.ossEligible.transactionCount, 0);
  assertEquals(rep.ossEligible.taxableCents, 0);
  assertEquals(rep.reverseChargeTransactionCount, 0);
  assertEquals(rep.crossBorderGuardTransactionCount, 0);
});

Deno.test("X6: empty batch -> zeroed report, no crash", () => {
  const rep = computePerJurisdictionReport([], "NL");
  assertEquals(rep.lines, []);
  assertEquals(rep.totalCollectedTaxCents, 0);
  assertEquals(rep.countryCount, 0);
  assertEquals(rep.ossEligible.transactionCount, 0);
  assertEquals(rep.ossEligible.countries, []);
});
