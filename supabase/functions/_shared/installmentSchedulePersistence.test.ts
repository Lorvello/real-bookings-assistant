import { assertEquals } from "jsr:@std/assert@1";
import {
  installmentScheduleIdentityMatches,
  type PersistedInstallmentIdentity,
} from "./installmentSchedulePersistence.ts";

const expected: PersistedInstallmentIdentity[] = [
  {
    booking_id: "booking-1",
    whatsapp_session_id: "session-1",
    installment_number: 1,
    total_installments: 2,
    amount_cents: 5000,
    currency: "eur",
    due_date: "2026-07-17T10:00:00.000Z",
    payment_timing: "now",
    payment_method: "online",
  },
  {
    booking_id: "booking-1",
    whatsapp_session_id: "session-1",
    installment_number: 2,
    total_installments: 2,
    amount_cents: 5000,
    currency: "eur",
    due_date: "2026-07-20T10:00:00.000Z",
    payment_timing: "appointment",
    payment_method: "cash",
  },
];

Deno.test("exact installment replay preserves terminal lifecycle state", () => {
  const existing = expected.map((row, index) => ({
    ...row,
    status: index === 0 ? "paid" : "cancelled",
  }));
  assertEquals(installmentScheduleIdentityMatches(existing, expected), true);
});

Deno.test("partial or changed installment replay is rejected", () => {
  assertEquals(
    installmentScheduleIdentityMatches(expected.slice(0, 1), expected),
    false,
  );
  assertEquals(
    installmentScheduleIdentityMatches(
      expected.map((row, index) =>
        index === 1 ? { ...row, amount_cents: 4900 } : row
      ),
      expected,
    ),
    false,
  );
});
