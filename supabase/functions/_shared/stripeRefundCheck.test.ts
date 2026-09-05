import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import {
  fetchStripeRefundState,
  MAX_PAYMENTS_PER_BOOKING_CHECKED,
  selectPaymentIntentsForRefundCheck,
} from "./stripeRefundCheck.ts";

Deno.test("refund backstop includes a sixth older payment intent", () => {
  const payments = Array.from({ length: 6 }, (_value, index) => ({
    stripe_payment_intent_id: `pi_${index + 1}`,
  }));

  assertEquals(selectPaymentIntentsForRefundCheck(payments), {
    paymentIntentIds: ["pi_1", "pi_2", "pi_3", "pi_4", "pi_5", "pi_6"],
    overflow: false,
  });
});

Deno.test("refund backstop fails closed instead of ignoring an over-cap payment", () => {
  const payments = Array.from(
    { length: MAX_PAYMENTS_PER_BOOKING_CHECKED + 1 },
    (_value, index) => ({ stripe_payment_intent_id: `pi_${index + 1}` }),
  );
  const selection = selectPaymentIntentsForRefundCheck(payments);

  assertEquals(selection.overflow, true);
  assertEquals(
    selection.paymentIntentIds.length,
    MAX_PAYMENTS_PER_BOOKING_CHECKED,
  );
});

Deno.test("Stripe refund transport is cancelled by the caller deadline", async () => {
  const parent = new AbortController();
  let transportAborted = false;
  let transportSettled = false;
  const request = fetchStripeRefundState("sk_test_contract", "pi_contract", {
    signal: parent.signal,
    timeoutMs: 10_000,
    fetchImpl: (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          transportAborted = true;
          transportSettled = true;
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      }),
  });
  parent.abort();
  await assertRejects(() => request, DOMException, "Aborted");
  assertEquals(transportAborted, true);
  assertEquals(transportSettled, true);
});

Deno.test("Stripe refund transport reads the expanded latest charge", async () => {
  assertEquals(
    await fetchStripeRefundState("sk_test_contract", "pi_contract", {
      fetchImpl: () =>
        Promise.resolve(Response.json({
          latest_charge: { refunded: false, amount_refunded: 250 },
        })),
    }),
    true,
  );
});
