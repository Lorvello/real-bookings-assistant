import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { deriveRefundLedgerState } from "./refundLedger.ts";

Deno.test("partial refunds preserve their exact amount and state", () => {
  assertEquals(deriveRefundLedgerState(10000, 2500), {
    refundAmountCents: 2500,
    status: "partially_refunded",
    fullyRefunded: false,
  });
});

Deno.test("full refunds reconcile to refunded", () => {
  assertEquals(deriveRefundLedgerState(10000, 10000), {
    refundAmountCents: 10000,
    status: "refunded",
    fullyRefunded: true,
  });
});

Deno.test("impossible refund amounts fail closed", () => {
  assertThrows(
    () => deriveRefundLedgerState(10000, 0),
    Error,
    "REFUND_AMOUNT_INVALID",
  );
  assertThrows(
    () => deriveRefundLedgerState(10000, 10001),
    Error,
    "REFUND_AMOUNT_INVALID",
  );
});
