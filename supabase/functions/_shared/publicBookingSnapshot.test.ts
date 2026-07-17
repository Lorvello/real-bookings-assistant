import { assertEquals } from "jsr:@std/assert@1";
import {
  parsePublicBookingCommitResult,
  parsePublicBookingPolicySnapshot,
  parsePublicBookingPriceSnapshot,
} from "./publicBookingSnapshot.ts";

const policy = {
  version: 1,
  captured_at: "2026-07-17T00:00:00Z",
  secure_payments_enabled: true,
  payment_required_for_booking: true,
  payment_optional: false,
  payment_required: true,
  enabled_payment_methods: ["ideal", "card"],
  allowed_payment_timing: ["pay_now"],
  payout_option: "standard",
  payment_deadline_hours: 24,
  auto_cancel_unpaid_bookings: true,
  tax: {
    tax_enabled: true,
    tax_code: "txcd_20030000",
    tax_behavior: "exclusive",
    applicable_tax_rate: 21,
    business_country: "NL",
    supply_type: "in_person",
    customer_country: "NL",
    customer_vat_id: null,
  },
};

Deno.test("booking-time policy parses without adding defaults", () => {
  const result = parsePublicBookingPolicySnapshot(policy, true);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.enabledPaymentMethods, ["ideal", "card"]);
    assertEquals(result.value.paymentRequired, true);
  }
});

Deno.test("booking-time policy requires and preserves every amount-determining tax field", () => {
  const missingTax = { ...policy } as Record<string, unknown>;
  delete missingTax.tax;
  assertEquals(
    parsePublicBookingPolicySnapshot(missingTax, true).ok,
    false,
  );

  const result = parsePublicBookingPolicySnapshot(policy, true);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(
      (result.value as unknown as Record<string, unknown>).tax,
      {
        taxEnabled: true,
        taxCode: "txcd_20030000",
        taxBehavior: "exclusive",
        applicableTaxRate: 21,
        businessCountry: "NL",
        supplyType: "in_person",
        customerCountry: "NL",
        customerVatId: null,
      },
    );
  }
});

Deno.test("missing or contradictory booking policy fails closed", () => {
  assertEquals(
    parsePublicBookingPolicySnapshot(null, false),
    {
      ok: false,
      code: "PUBLIC_BOOKING_POLICY_SNAPSHOT_MISSING",
      reason: "This booking has no supported booking-time payment policy.",
    },
  );
  assertEquals(
    parsePublicBookingPolicySnapshot(policy, false).ok,
    false,
  );
  assertEquals(
    parsePublicBookingPolicySnapshot(
      { ...policy, enabled_payment_methods: [] },
      true,
    ).ok,
    false,
  );
  assertEquals(
    parsePublicBookingPolicySnapshot(
      {
        ...policy,
        secure_payments_enabled: false,
        payment_required: false,
      },
      false,
    ).ok,
    true,
    "disabling Pay and Book keeps the UI's required-on-next-enable preference valid",
  );

  const optional = {
    ...policy,
    payment_required_for_booking: false,
    payment_optional: true,
    payment_required: false,
    allowed_payment_timing: ["pay_now", "pay_on_site"],
  };
  assertEquals(
    parsePublicBookingPolicySnapshot(optional, true).ok,
    true,
    "an optional booking may become payment_required after choosing pay now",
  );
});

Deno.test("price snapshot requires matching positive amount, cents, and currency", () => {
  assertEquals(
    parsePublicBookingPriceSnapshot({
      totalPrice: "89.95",
      totalAmountCents: 8995,
      paymentCurrency: "EUR",
    }),
    {
      ok: true,
      value: {
        baseAmount: 89.95,
        baseAmountCents: 8995,
        currency: "eur",
      },
    },
  );

  for (
    const input of [
      { totalPrice: null, totalAmountCents: 8995, paymentCurrency: "eur" },
      { totalPrice: 89.95, totalAmountCents: 8994, paymentCurrency: "eur" },
      { totalPrice: 0, totalAmountCents: 0, paymentCurrency: "eur" },
      { totalPrice: 89.95, totalAmountCents: 8995, paymentCurrency: null },
    ]
  ) {
    assertEquals(parsePublicBookingPriceSnapshot(input).ok, false);
  }
});

Deno.test("atomic booking commit results are parsed and classified fail closed", () => {
  assertEquals(
    parsePublicBookingCommitResult({
      success: true,
      payment_required: true,
      booking: { id: "booking-id", payment_required: true },
    }),
    {
      ok: true,
      booking: { id: "booking-id", payment_required: true },
      paymentRequired: true,
    },
  );

  assertEquals(
    parsePublicBookingCommitResult({
      success: false,
      code: "PAYMENT_POLICY_UNAVAILABLE",
      error: "Booking payment policy is unavailable.",
    }),
    {
      ok: false,
      code: "PAYMENT_POLICY_UNAVAILABLE",
      reason: "Booking payment policy is unavailable.",
      status: 503,
    },
  );

  assertEquals(
    parsePublicBookingCommitResult({
      success: false,
      code: "VALIDATION_FAILED",
      error: "Booking validation failed.",
      errors: [{ field: "availability" }],
    }),
    {
      ok: false,
      code: "VALIDATION_FAILED",
      reason: [{ field: "availability" }],
      status: 400,
    },
  );

  assertEquals(
    parsePublicBookingCommitResult({
      success: true,
      payment_required: false,
      booking: { id: "booking-id", payment_required: true },
    }),
    {
      ok: false,
      code: "PUBLIC_BOOKING_COMMIT_RESULT_INVALID",
      reason: "The booking could not be committed safely. Please try again.",
      status: 500,
    },
  );
});
