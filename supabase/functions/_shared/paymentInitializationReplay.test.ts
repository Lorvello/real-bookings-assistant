import { assertEquals } from "jsr:@std/assert@1";
import { isReusablePendingPaymentInitialization } from "./paymentInitializationReplay.ts";

const expectedLedger = {
  booking_id: "booking-a",
  stripe_payment_intent_id: "pi_shared",
  stripe_account_id: "acct_owner",
  amount_cents: 10000,
  platform_fee_cents: 190,
  currency: "eur",
  status: "pending",
  stripe_mode: "test" as const,
};

const desiredBooking = {
  status: "pending",
  payment_status: "pending",
  payment_required: true,
  payment_timing: "pay_now",
};

Deno.test("a concurrent request may reuse the same still-pending initialization", () => {
  assertEquals(
    isReusablePendingPaymentInitialization(
      desiredBooking,
      "pending",
      "pay_now",
      expectedLedger,
      expectedLedger,
    ),
    true,
  );
});

Deno.test("a canceled, refunded or mismatched initialization is never replayable", () => {
  for (
    const ledgerStatus of [
      "canceled",
      "succeeded",
      "partially_refunded",
      "refunded",
    ]
  ) {
    assertEquals(
      isReusablePendingPaymentInitialization(
        desiredBooking,
        "pending",
        "pay_now",
        { ...expectedLedger, status: ledgerStatus },
        expectedLedger,
      ),
      false,
    );
  }

  assertEquals(
    isReusablePendingPaymentInitialization(
      { ...desiredBooking, status: "cancelled" },
      "pending",
      "pay_now",
      expectedLedger,
      expectedLedger,
    ),
    false,
  );
});
