import {
  type BookingPaymentLedgerIdentity,
  bookingPaymentLedgerMatches,
} from "./bookingPaymentLedger.ts";

export interface CurrentPaymentInitializationState {
  status: string | null;
  payment_status: string | null;
  payment_required: boolean | null;
  payment_timing: string | null;
}

/**
 * A zero-row booking CAS is a safe concurrent replay only when another request
 * committed exactly the state this request was about to commit and the matching
 * durable ledger is still pending. Terminal or refunded ledgers are never reusable.
 */
export function isReusablePendingPaymentInitialization(
  booking: CurrentPaymentInitializationState | null | undefined,
  authorizedBookingStatus: string | null,
  requestedPaymentTiming: string,
  existingLedger: Partial<BookingPaymentLedgerIdentity> | null | undefined,
  expectedLedger: BookingPaymentLedgerIdentity,
): boolean {
  return !!booking &&
    booking.status === authorizedBookingStatus &&
    booking.payment_status === "pending" &&
    booking.payment_required === true &&
    booking.payment_timing === requestedPaymentTiming &&
    bookingPaymentLedgerMatches(existingLedger, expectedLedger);
}
