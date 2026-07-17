import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { whatsappPaymentRequestSchema } from "./request.ts";

const valid = {
  conversationId: "00000000-0000-4000-8000-000000000001",
  serviceTypeId: "00000000-0000-4000-8000-000000000002",
  bookingId: "00000000-0000-4000-8000-000000000003",
};

Deno.test("WhatsApp payment request requires a booking link", () => {
  assertThrows(() =>
    whatsappPaymentRequestSchema.parse({
      conversationId: valid.conversationId,
      serviceTypeId: valid.serviceTypeId,
    })
  );
});

Deno.test("legacy mode and installment fields cannot control server truth", () => {
  const parsed = whatsappPaymentRequestSchema.parse({
    ...valid,
    paymentType: "installment",
    testMode: false,
    installmentPlan: {
      deposits: [{ amount: -10, timing: "now" }],
    },
  });
  assertEquals(parsed.testMode, false);
  assertEquals(parsed.paymentType, "installment");
});

Deno.test("unknown payment types and extra fields fail closed", () => {
  assertThrows(() =>
    whatsappPaymentRequestSchema.parse({
      ...valid,
      paymentType: "deposit",
    })
  );
  assertThrows(() =>
    whatsappPaymentRequestSchema.parse({
      ...valid,
      price: 0.01,
    })
  );
});
