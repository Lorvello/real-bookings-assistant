export function bookingCheckoutCanConfirm(
  paymentStatus: string | null | undefined,
): boolean {
  return paymentStatus === "paid";
}

export function bookingCheckoutIsTerminalFailure(eventType: string): boolean {
  return eventType === "checkout.session.async_payment_failed" ||
    eventType === "checkout.session.expired";
}
