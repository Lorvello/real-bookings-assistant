import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  bookingCheckoutCanConfirm,
  bookingCheckoutIsTerminalFailure,
} from "./bookingCheckoutStatus.ts";

Deno.test("Checkout confirms a booking only after Stripe reports paid", () => {
  assertEquals(bookingCheckoutCanConfirm("paid"), true);
  for (const status of ["unpaid", "no_payment_required", null, undefined]) {
    assertEquals(bookingCheckoutCanConfirm(status), false);
  }
});

Deno.test("async failure and expiry are terminal booking Checkout failures", () => {
  assertEquals(
    bookingCheckoutIsTerminalFailure("checkout.session.async_payment_failed"),
    true,
  );
  assertEquals(
    bookingCheckoutIsTerminalFailure("checkout.session.expired"),
    true,
  );
  assertEquals(
    bookingCheckoutIsTerminalFailure("checkout.session.completed"),
    false,
  );
});
