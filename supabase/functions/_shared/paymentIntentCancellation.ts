export type PaymentIntentLifecycleStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "requires_capture"
  | "processing"
  | "succeeded"
  | "canceled";

export function canCancelUnconfirmedPaymentIntent(
  status: PaymentIntentLifecycleStatus,
): boolean {
  return [
    "requires_payment_method",
    "requires_confirmation",
    "requires_action",
    "requires_capture",
  ].includes(status);
}
