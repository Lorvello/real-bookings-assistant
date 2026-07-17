import { assertEquals } from "jsr:@std/assert@1";
import {
  bookingPaymentAlreadyApplied,
  bookingPaymentKind,
  targetBookingPaymentStatus,
} from "./bookingPaymentTransition.ts";

Deno.test("unknown payment metadata defaults to the legacy full-payment path", () => {
  assertEquals(bookingPaymentKind(undefined), "full");
  assertEquals(bookingPaymentKind("deposit"), "full");
  assertEquals(targetBookingPaymentStatus("full"), "paid");
});

Deno.test("installment metadata produces a partial booking transition", () => {
  const kind = bookingPaymentKind("installment");
  assertEquals(kind, "installment");
  assertEquals(targetBookingPaymentStatus(kind, true), "partial");
  assertEquals(bookingPaymentAlreadyApplied("partial", kind, true), true);
  assertEquals(bookingPaymentAlreadyApplied("paid", kind, true), false);
});

Deno.test("a one-part 100 percent installment is fully paid after its only charge", () => {
  const kind = bookingPaymentKind("installment");
  assertEquals(targetBookingPaymentStatus(kind, false), "paid");
  assertEquals(bookingPaymentAlreadyApplied("paid", kind, false), true);
  assertEquals(bookingPaymentAlreadyApplied("partial", kind, false), false);
});
