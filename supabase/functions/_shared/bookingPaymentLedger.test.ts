import { assertEquals } from "jsr:@std/assert@1.0.19";
import { bookingPaymentLedgerMatches } from "./bookingPaymentLedger.ts";

const expected = {
  booking_id: "booking-a",
  stripe_payment_intent_id: "pi_same",
  stripe_account_id: "acct_destination",
  amount_cents: 10000,
  platform_fee_cents: 225,
  currency: "eur",
  status: "pending",
  stripe_mode: "test" as const,
};

Deno.test("an exact Stripe/local replay reuses the durable payment row", () => {
  assertEquals(bookingPaymentLedgerMatches({ ...expected }, expected), true);
});

Deno.test("a conflicting booking, destination or amount never reuses a payment row", () => {
  for (
    const mismatch of [
      { booking_id: "booking-b" },
      { stripe_account_id: "acct_other" },
      { amount_cents: 9999 },
      { platform_fee_cents: 224 },
      { currency: "usd" },
      { status: "canceled" },
      { status: "partially_refunded" },
      { stripe_mode: "live" as const },
    ]
  ) {
    assertEquals(
      bookingPaymentLedgerMatches({ ...expected, ...mismatch }, expected),
      false,
    );
  }
});
