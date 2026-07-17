import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  PaymentPolicyReadError,
  resolveAuthoritativePaymentPolicy,
} from "./authoritativePaymentPolicy.ts";

const ok = <T>(data: T | null) => ({ data, error: null });

Deno.test("authoritative payment policy fails closed on every database read error", () => {
  const reads = [
    [
      { data: null, error: { message: "payment denied" } },
      ok({ installments_enabled: true }),
      ok({ enabled: true }),
      ok({ installments_enabled: true }),
    ],
    [
      ok({
        secure_payments_enabled: true,
        payment_required_for_booking: true,
      }),
      { data: null, error: { message: "owner timeout" } },
      ok({ enabled: true }),
      ok({ installments_enabled: true }),
    ],
    [
      ok({
        secure_payments_enabled: true,
        payment_required_for_booking: true,
      }),
      ok({ installments_enabled: true }),
      { data: null, error: { message: "config timeout" } },
      ok({ installments_enabled: true }),
    ],
    [
      ok({
        secure_payments_enabled: true,
        payment_required_for_booking: true,
      }),
      ok({ installments_enabled: true }),
      ok(null),
      { data: null, error: { message: "service unavailable" } },
    ],
  ] as const;

  for (const readSet of reads) {
    assertThrows(
      () =>
        resolveAuthoritativePaymentPolicy(
          readSet[0],
          readSet[1],
          readSet[2],
          readSet[3],
        ),
      PaymentPolicyReadError,
    );
  }
});

Deno.test("authoritative payment policy rejects missing required rows", () => {
  assertThrows(
    () =>
      resolveAuthoritativePaymentPolicy(
        ok(null),
        ok({ installments_enabled: true }),
        ok(null),
        ok({ installments_enabled: false }),
      ),
    PaymentPolicyReadError,
  );

  assertThrows(
    () =>
      resolveAuthoritativePaymentPolicy(
        ok({
          secure_payments_enabled: true,
          payment_required_for_booking: true,
        }),
        ok(null),
        ok(null),
        ok({ installments_enabled: false }),
      ),
    PaymentPolicyReadError,
  );

  assertThrows(
    () =>
      resolveAuthoritativePaymentPolicy(
        ok({
          secure_payments_enabled: true,
          payment_required_for_booking: true,
        }),
        ok({ installments_enabled: true }),
        ok(null),
        ok(null),
      ),
    PaymentPolicyReadError,
  );
});

Deno.test("authoritative payment policy preserves an optional service config fallback", () => {
  const policy = resolveAuthoritativePaymentPolicy(
    ok({
      secure_payments_enabled: true,
      payment_required_for_booking: true,
    }),
    ok({ installments_enabled: true }),
    ok(null),
    ok({ installments_enabled: true }),
  );

  assertEquals(policy.paymentRequired, true);
  assertEquals(policy.useInstallments, true);
});

Deno.test("authoritative owner master switch disables stale service installment state", () => {
  const policy = resolveAuthoritativePaymentPolicy(
    ok({
      secure_payments_enabled: true,
      payment_required_for_booking: false,
    }),
    ok({ installments_enabled: false }),
    ok({ enabled: true }),
    ok({ installments_enabled: true }),
  );

  assertEquals(policy.paymentRequired, false);
  assertEquals(policy.useInstallments, false);
});
