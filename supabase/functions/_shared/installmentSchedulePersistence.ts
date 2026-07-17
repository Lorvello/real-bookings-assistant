export interface PersistedInstallmentIdentity {
  booking_id: string;
  whatsapp_session_id: string;
  installment_number: number;
  total_installments: number;
  amount_cents: number;
  currency: string;
  due_date: string | null;
  payment_timing: string;
  payment_method: string;
}

const sameNullableInstant = (left: string | null, right: string | null) => {
  if (left === null || right === null) return left === right;
  return new Date(left).getTime() === new Date(right).getTime();
};

/**
 * A replay may reuse an already persisted schedule, but it may never overwrite
 * lifecycle state such as paid, refunded, or cancelled. This compares only the
 * immutable identity/amount fields and deliberately ignores status and timestamps.
 */
export function installmentScheduleIdentityMatches(
  existing: PersistedInstallmentIdentity[],
  expected: PersistedInstallmentIdentity[],
): boolean {
  if (existing.length !== expected.length) return false;

  const byNumber = new Map(
    existing.map((row) => [Number(row.installment_number), row]),
  );

  return expected.every((wanted) => {
    const actual = byNumber.get(Number(wanted.installment_number));
    return !!actual &&
      actual.booking_id === wanted.booking_id &&
      actual.whatsapp_session_id === wanted.whatsapp_session_id &&
      Number(actual.total_installments) === Number(wanted.total_installments) &&
      Number(actual.amount_cents) === Number(wanted.amount_cents) &&
      actual.currency === wanted.currency &&
      sameNullableInstant(actual.due_date, wanted.due_date) &&
      actual.payment_timing === wanted.payment_timing &&
      actual.payment_method === wanted.payment_method;
  });
}
