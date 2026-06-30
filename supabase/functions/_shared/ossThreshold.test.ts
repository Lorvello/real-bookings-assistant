// Unit tests for the OSS pan-EU threshold helper (X5). Pure logic, no network.
// Run: deno test supabase/functions/_shared/ossThreshold.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  OSS_PAN_EU_THRESHOLD_CENTS,
  OSS_BUCKET_KEY,
  isCrossBorderB2C,
  taxableCents,
  taxCentsFromBreakdown,
  computeOssBucket,
  type BookingPaymentRowLike,
} from "./ossThreshold.ts";

const NL = "NL";

function row(p: Partial<BookingPaymentRowLike>): BookingPaymentRowLike {
  return {
    amount_cents: 0,
    customer_country: null,
    reverse_charge: false,
    refund_amount_cents: 0,
    tax_breakdown: null,
    status: "succeeded",
    ...p,
  };
}

// --- The constant is the single EUR10k pan-EU threshold, NOT the old per-country numbers.
Deno.test("X5: threshold is the single post-2021 EUR10,000 pan-EU value (1,000,000 cents)", () => {
  assertEquals(OSS_PAN_EU_THRESHOLD_CENTS, 1_000_000);
  // Guard against any accidental reintroduction of the stale per-country numbers.
  const staleNumbers = [2_200_000, 3_570_000, 6_500_000]; // old DE/FR/IT distance-selling
  const actual: number = OSS_PAN_EU_THRESHOLD_CENTS;
  assert(!staleNumbers.includes(actual), "must not be any old per-country distance-selling number");
  assertEquals(OSS_BUCKET_KEY, "EU_OSS");
});

// --- Bucket membership predicate.
Deno.test("X5: cross-border B2C (DE customer, no reverse-charge) is in the bucket", () => {
  assert(isCrossBorderB2C(row({ customer_country: "DE", reverse_charge: false }), NL));
});

Deno.test("X5: domestic NL is EXCLUDED (customer_country == merchant)", () => {
  assertEquals(isCrossBorderB2C(row({ customer_country: "NL" }), NL), false);
});

Deno.test("X5: in_person/domestic with NULL customer_country is EXCLUDED", () => {
  assertEquals(isCrossBorderB2C(row({ customer_country: null }), NL), false);
});

Deno.test("X5: B2B reverse-charge cross-border is EXCLUDED from the bucket", () => {
  assertEquals(
    isCrossBorderB2C(row({ customer_country: "DE", reverse_charge: true }), NL),
    false,
  );
});

Deno.test("X5: merchant-country comparison is case-insensitive", () => {
  assertEquals(isCrossBorderB2C(row({ customer_country: "nl" }), "NL"), false);
  assert(isCrossBorderB2C(row({ customer_country: "de" }), "NL"));
});

// --- Taxable amount derivation (net of VAT + refunds).
Deno.test("X5: taxableCents = gross when no tax and no refund", () => {
  assertEquals(taxableCents(row({ amount_cents: 50000 })), 50000);
});

Deno.test("X5: taxableCents subtracts persisted tax_breakdown tax", () => {
  const r = row({
    amount_cents: 12100,
    tax_breakdown: [{ amountCents: 2100, country: "DE" }],
  });
  assertEquals(taxableCents(r), 10000);
});

Deno.test("X5: taxableCents subtracts refunds and floors at 0", () => {
  assertEquals(taxableCents(row({ amount_cents: 10000, refund_amount_cents: 4000 })), 6000);
  assertEquals(taxableCents(row({ amount_cents: 10000, refund_amount_cents: 99999 })), 0);
});

Deno.test("X5: taxCentsFromBreakdown handles raw Stripe shape (amount) and ignores junk", () => {
  assertEquals(taxCentsFromBreakdown([{ amount: 500 }, { amount: 300 }]), 800);
  assertEquals(taxCentsFromBreakdown(null), 0);
  assertEquals(taxCentsFromBreakdown([{ status: "cross_border_rate_unavailable" }]), 0);
});

// --- Aggregate bucket: the flag flips EXACTLY at >= EUR10,000.
Deno.test("X5: BELOW threshold -> registrationRequired=false, status under/near, remaining correct", () => {
  const rows = [
    row({ customer_country: "DE", amount_cents: 400000 }), // 4,000.00
    row({ customer_country: "FR", amount_cents: 350000 }), // 3,500.00
  ];
  const b = computeOssBucket(rows, NL);
  assertEquals(b.cumulativeCents, 750000);
  assertEquals(b.registrationRequired, false);
  assertEquals(b.remainingCents, 250000);
  assertEquals(b.status, "under"); // 75% of EUR10k -> still under the 80% 'near' band
});

Deno.test("X5: 'near' band kicks in at >= 80% but below 100%", () => {
  const rows = [row({ customer_country: "DE", amount_cents: 850000 })]; // 8,500 = 85%
  const b = computeOssBucket(rows, NL);
  assertEquals(b.status, "near");
  assertEquals(b.registrationRequired, false);
});

Deno.test("X5: at EXACTLY EUR10,000 -> registrationRequired=true, exceeded, remaining 0", () => {
  const rows = [
    row({ customer_country: "DE", amount_cents: 600000 }),
    row({ customer_country: "FR", amount_cents: 400000 }),
  ];
  const b = computeOssBucket(rows, NL);
  assertEquals(b.cumulativeCents, 1_000_000);
  assertEquals(b.registrationRequired, true);
  assertEquals(b.status, "exceeded");
  assertEquals(b.remainingCents, 0);
  assertEquals(b.percentage, 100);
});

Deno.test("X5: just BELOW the line (999,999) does NOT flip", () => {
  const b = computeOssBucket([row({ customer_country: "DE", amount_cents: 999_999 })], NL);
  assertEquals(b.registrationRequired, false);
});

Deno.test("X5: B2B reverse-charge + domestic NL rows do NOT push the bucket over", () => {
  const rows = [
    row({ customer_country: "DE", amount_cents: 500000 }), // counts: 5,000
    row({ customer_country: "DE", amount_cents: 900000, reverse_charge: true }), // B2B excluded
    row({ customer_country: "NL", amount_cents: 900000 }), // domestic excluded
    row({ customer_country: null, amount_cents: 900000 }), // in_person excluded
  ];
  const b = computeOssBucket(rows, NL);
  assertEquals(b.cumulativeCents, 500000);
  assertEquals(b.contributingPayments, 1);
  assertEquals(b.registrationRequired, false);
});

Deno.test("X5: multiple non-NL EU countries aggregate into ONE combined bucket", () => {
  const rows = [
    row({ customer_country: "DE", amount_cents: 400000 }),
    row({ customer_country: "FR", amount_cents: 400000 }),
    row({ customer_country: "BE", amount_cents: 300000 }),
  ];
  const b = computeOssBucket(rows, NL);
  assertEquals(b.cumulativeCents, 1_100_000);
  assertEquals(b.registrationRequired, true); // 11,000 > 10,000 combined, not per-country
  assertEquals(b.contributingPayments, 3);
});

Deno.test("X5: non-succeeded statuses are ignored", () => {
  const rows = [
    row({ customer_country: "DE", amount_cents: 2_000_000, status: "pending" }),
    row({ customer_country: "DE", amount_cents: 2_000_000, status: "failed" }),
    row({ customer_country: "DE", amount_cents: 500000, status: "succeeded" }),
  ];
  const b = computeOssBucket(rows, NL);
  assertEquals(b.cumulativeCents, 500000);
  assertEquals(b.registrationRequired, false);
});
