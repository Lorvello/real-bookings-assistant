import { z } from "https://esm.sh/zod@3.23.8";

export const whatsappPaymentRequestSchema = z.object({
  conversationId: z.string().uuid(),
  serviceTypeId: z.string().uuid(),
  bookingId: z.string().uuid(),
  paymentType: z.enum(["full", "installment"]).default("full"),
  paymentMethod: z.string().trim().min(1).max(40).optional(),
  paymentTiming: z.enum(["pay_now", "pay_on_site"]).default("pay_now"),
  // Accepted only for backwards-compatible parsing. Stripe mode and installment
  // amounts are always resolved from server configuration.
  testMode: z.boolean().optional(),
  test_mode: z.boolean().optional(),
  installmentPlan: z.unknown().optional(),
}).strict();

export type WhatsappPaymentRequest = z.infer<
  typeof whatsappPaymentRequestSchema
>;
