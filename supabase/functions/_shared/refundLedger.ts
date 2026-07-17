export interface RefundLedgerState {
  refundAmountCents: number;
  status: "partially_refunded" | "refunded";
  fullyRefunded: boolean;
}

export function deriveRefundLedgerState(
  chargeAmountCents: number,
  refundedAmountCents: number,
): RefundLedgerState {
  if (
    !Number.isInteger(chargeAmountCents) || chargeAmountCents <= 0 ||
    !Number.isInteger(refundedAmountCents) || refundedAmountCents <= 0 ||
    refundedAmountCents > chargeAmountCents
  ) {
    throw new Error("REFUND_AMOUNT_INVALID");
  }
  const fullyRefunded = refundedAmountCents === chargeAmountCents;
  return {
    refundAmountCents: refundedAmountCents,
    status: fullyRefunded ? "refunded" : "partially_refunded",
    fullyRefunded,
  };
}
