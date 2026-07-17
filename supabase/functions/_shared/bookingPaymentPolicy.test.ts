import { assertEquals } from "jsr:@std/assert@1";
import {
  evaluateBookingPaymentPolicy,
  resolveStripePaymentMethods,
  toStripePaymentMethod,
} from "./bookingPaymentPolicy.ts";

const base = {
  securePaymentsEnabled: true,
  paymentOptional: false,
  allowedPaymentTiming: ["pay_now"],
  enabledPaymentMethods: ["ideal", "cards"],
  requestedTiming: "pay_now",
  currency: "eur",
};

Deno.test("payment methods map explicit UI ids without silent card fallback", () => {
  assertEquals(
    resolveStripePaymentMethods(
      ["ideal", "cards", "apple-pay", "przelewy24", "not-real"],
      "eur",
    ),
    ["ideal", "card", "p24"],
  );
  assertEquals(toStripePaymentMethod("not-real", "eur"), null);
});

Deno.test("currency-incompatible methods are rejected before Stripe", () => {
  assertEquals(toStripePaymentMethod("blik", "eur"), null);
  assertEquals(toStripePaymentMethod("blik", "pln"), "blik");
  assertEquals(toStripePaymentMethod("twint", "eur"), null);
  assertEquals(toStripePaymentMethod("pay-by-bank", "gbp"), "pay_by_bank");
});

Deno.test("online payment fails closed when Pay and Book is disabled", () => {
  const decision = evaluateBookingPaymentPolicy({
    ...base,
    securePaymentsEnabled: false,
  });
  assertEquals(decision.allowed, false);
  assertEquals(decision.code, "SECURE_PAYMENTS_DISABLED");
});

Deno.test("pay on site requires both an allowed timing and optional payment", () => {
  const notOptional = evaluateBookingPaymentPolicy({
    ...base,
    requestedTiming: "pay_on_site",
    allowedPaymentTiming: ["pay_now", "pay_on_site"],
  });
  const notEnabled = evaluateBookingPaymentPolicy({
    ...base,
    paymentOptional: true,
    requestedTiming: "pay_on_site",
  });
  const allowed = evaluateBookingPaymentPolicy({
    ...base,
    paymentOptional: true,
    requestedTiming: "pay_on_site",
    allowedPaymentTiming: ["pay_now", "pay_on_site"],
  });

  assertEquals(notOptional.code, "PAY_ON_SITE_NOT_AVAILABLE");
  assertEquals(notEnabled.code, "PAYMENT_TIMING_NOT_ALLOWED");
  assertEquals(allowed.allowed, true);
  assertEquals(allowed.action, "DEFER_PAYMENT");
});

Deno.test("an explicit requested method must be enabled", () => {
  const blocked = evaluateBookingPaymentPolicy({
    ...base,
    requestedMethod: "bancontact",
  });
  const allowed = evaluateBookingPaymentPolicy({
    ...base,
    requestedMethod: "cards",
  });

  assertEquals(blocked.code, "PAYMENT_METHOD_NOT_ALLOWED");
  assertEquals(allowed.stripePaymentMethods, ["card"]);
  assertEquals(allowed.feePaymentMethod, "card");
});

Deno.test("no compatible enabled method fails before provider access", () => {
  const decision = evaluateBookingPaymentPolicy({
    ...base,
    enabledPaymentMethods: ["blik", "twint", "unknown"],
  });
  assertEquals(decision.allowed, false);
  assertEquals(decision.code, "NO_COMPATIBLE_PAYMENT_METHOD");
});
