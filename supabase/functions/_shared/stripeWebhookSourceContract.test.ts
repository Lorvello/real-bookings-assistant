import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.19";

const source = await Deno.readTextFile(
  new URL("../stripe-webhook/index.ts", import.meta.url),
);

Deno.test("Stripe webhook rejects non-POST mutation requests", () => {
  assertStringIncludes(source, 'req.method !== "POST"');
  assertStringIncludes(source, "status: 405");
});

Deno.test("Checkout cannot confirm an unpaid booking and handles async outcomes", () => {
  const paymentGate = source.indexOf(
    "bookingCheckoutCanConfirm(session.payment_status)",
  );
  const confirmation = source.indexOf("await confirmBookingPaid(", paymentGate);
  assert(paymentGate >= 0 && confirmation > paymentGate);
  assertStringIncludes(
    source,
    'case "checkout.session.async_payment_succeeded"',
  );
  assertStringIncludes(source, 'case "checkout.session.async_payment_failed"');
  assertStringIncludes(source, 'case "checkout.session.expired"');
  assertStringIncludes(source, 'case "payment_intent.payment_failed"');
});

Deno.test("event claim and Connect sync failures remain retryable", () => {
  assertStringIncludes(source, "STRIPE_EVENT_CLAIM_FAILED");
  assertStringIncludes(source, '"claim_stripe_event"');
  assertStringIncludes(source, '"complete_stripe_event"');
  assertStringIncludes(source, '"fail_stripe_event"');
  assertStringIncludes(source, "status: 503");
  assertStringIncludes(source, '"Retry-After": "5"');
  assertEquals(
    source.includes('.from("processed_stripe_events").delete()'),
    false,
  );
  assertEquals(source.includes("claim error (continuing)"), false);
  assertStringIncludes(source, "CONNECT_ACCOUNT_SYNC_FAILED");
  assertStringIncludes(source, "assertStripeWebhookMode(");
  assertStringIncludes(source, "p_stripe_mode: stripeMode");
});

Deno.test("booking and money-ledger database failures cannot be acknowledged", () => {
  for (
    const marker of [
      "BOOKING_PAYMENT_READ_FAILED",
      "BOOKING_PAYMENT_LEDGER_READ_FAILED",
      "BOOKING_PAYMENT_LEDGER_PROVIDER_UNAVAILABLE",
      "BOOKING_PAYMENT_LEDGER_PROVIDER_READ_FAILED",
      "BOOKING_PAYMENT_LEDGER_DESTINATION_MISSING",
      "BOOKING_PAYMENT_LEDGER_WRITE_FAILED",
      "BOOKING_PAYMENT_SUCCESS_RECONCILIATION_FAILED",
    ]
  ) {
    assertStringIncludes(source, marker);
  }
});

Deno.test("booking payment success uses one atomic refund-aware state machine", () => {
  const ensureLedger = source.indexOf("await ensureBookingPaymentRow(");
  const reconciliation = source.indexOf(
    '"finalize_booking_payment_success_v2"',
    ensureLedger,
  );
  const confirmation = source.indexOf(
    "await deliverBookingConfirmation(supabase, bookingId)",
    reconciliation,
  );
  assert(ensureLedger >= 0 && reconciliation > ensureLedger);
  assert(confirmation > reconciliation);
  assertStringIncludes(source, "transition.shouldDeliverConfirmation !== true");
  assertEquals(source.includes("finalizeBookingPaymentLedger"), false);
  assertEquals(source.includes('update({ status: "succeeded" })'), false);
});

Deno.test("refund events use one atomic monotonic reconciliation RPC", () => {
  for (
    const marker of [
      '"reconcile_booking_refund_v2"',
      "p_booking_id: bookingId",
      "p_stripe_payment_intent_id: paymentIntentId",
      "p_refund_amount_cents: charge.amount_refunded",
      "REFUND_RECONCILIATION_FAILED",
    ]
  ) {
    assertStringIncludes(source, marker);
  }
});

Deno.test("failure and subscription events use monotonic transactional RPCs", () => {
  for (
    const marker of [
      '"record_booking_payment_failure"',
      '"record_booking_checkout_failure"',
      '"apply_stripe_subscription_event"',
      '"apply_stripe_subscription_invoice_event"',
      "normalizeStripeSubscriptionStatus(",
    ]
  ) {
    assertStringIncludes(source, marker);
  }
  assertEquals(
    source.includes('.update({ status: "failed" })'),
    false,
  );
  assertEquals(
    source.includes('.update({ payment_status: "failed" })'),
    false,
  );
});
