export type BookingPaymentKind = "full" | "installment";

export function bookingPaymentKind(
  paymentType: string | null | undefined,
): BookingPaymentKind {
  return paymentType === "installment" ? "installment" : "full";
}

export function targetBookingPaymentStatus(
  kind: BookingPaymentKind,
  hasOutstandingInstallments = kind === "installment",
): "paid" | "partial" {
  return kind === "installment" && hasOutstandingInstallments
    ? "partial"
    : "paid";
}

export function bookingPaymentAlreadyApplied(
  currentStatus: string | null | undefined,
  kind: BookingPaymentKind,
  hasOutstandingInstallments = kind === "installment",
): boolean {
  return currentStatus === targetBookingPaymentStatus(
    kind,
    hasOutstandingInstallments,
  );
}
