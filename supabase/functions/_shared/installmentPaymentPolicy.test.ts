import { assertEquals } from "jsr:@std/assert@1.0.19";
import { resolveInstallmentPaymentPolicy } from "./installmentPaymentPolicy.ts";

Deno.test("service installment deposit is required when general pay-on-site is optional", () => {
  assertEquals(
    resolveInstallmentPaymentPolicy({
      securePaymentsEnabled: true,
      globallyRequired: false,
      ownerInstallmentsEnabled: true,
      serviceConfigExists: true,
      serviceConfigEnabled: true,
      serviceFallbackEnabled: false,
    }),
    {
      paymentRequired: true,
      useInstallments: true,
    },
  );
});

Deno.test("an explicit disabled override wins over an all-service fallback", () => {
  assertEquals(
    resolveInstallmentPaymentPolicy({
      securePaymentsEnabled: true,
      globallyRequired: false,
      ownerInstallmentsEnabled: true,
      serviceConfigExists: true,
      serviceConfigEnabled: false,
      serviceFallbackEnabled: true,
    }),
    {
      paymentRequired: false,
      useInstallments: false,
    },
  );
});

Deno.test("secure payments off prevents both full and installment pay-and-book", () => {
  assertEquals(
    resolveInstallmentPaymentPolicy({
      securePaymentsEnabled: false,
      globallyRequired: true,
      ownerInstallmentsEnabled: true,
      serviceConfigExists: false,
      serviceConfigEnabled: false,
      serviceFallbackEnabled: true,
    }),
    {
      paymentRequired: false,
      useInstallments: false,
    },
  );
});

Deno.test("the owner master switch disables stale per-service installment rows", () => {
  assertEquals(
    resolveInstallmentPaymentPolicy({
      securePaymentsEnabled: true,
      globallyRequired: false,
      ownerInstallmentsEnabled: false,
      serviceConfigExists: true,
      serviceConfigEnabled: true,
      serviceFallbackEnabled: true,
    }),
    {
      paymentRequired: false,
      useInstallments: false,
    },
  );
});
