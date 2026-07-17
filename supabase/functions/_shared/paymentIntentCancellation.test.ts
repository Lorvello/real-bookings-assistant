import { assertEquals } from "jsr:@std/assert@1";
import { canCancelUnconfirmedPaymentIntent } from "./paymentIntentCancellation.ts";

Deno.test("only unconfirmed or uncaptured PaymentIntents are race-cancelled", () => {
  for (
    const status of [
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "requires_capture",
    ] as const
  ) {
    assertEquals(canCancelUnconfirmedPaymentIntent(status), true);
  }
  for (const status of ["processing", "succeeded", "canceled"] as const) {
    assertEquals(canCancelUnconfirmedPaymentIntent(status), false);
  }
});
