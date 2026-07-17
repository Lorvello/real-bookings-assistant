import { resolveInstallmentPaymentPolicy } from "./installmentPaymentPolicy.ts";

type ReadError = { message?: string } | null;

export type AuthoritativeRead<T> = {
  data: T | null;
  error: ReadError;
};

export class PaymentPolicyReadError extends Error {
  readonly code = "PAYMENT_POLICY_UNAVAILABLE";

  constructor(message: string) {
    super(message);
    this.name = "PaymentPolicyReadError";
  }
}

export function resolveAuthoritativePaymentPolicy(
  paymentSettingsRead: AuthoritativeRead<{
    secure_payments_enabled?: boolean;
    payment_required_for_booking?: boolean;
  }>,
  ownerInstallmentRead: AuthoritativeRead<{
    installments_enabled?: boolean;
  }>,
  serviceConfigRead: AuthoritativeRead<{
    enabled?: boolean;
  }>,
  serviceFallbackRead: AuthoritativeRead<{
    installments_enabled?: boolean;
  }>,
) {
  for (
    const [label, read] of [
      ["payment_settings", paymentSettingsRead],
      ["users", ownerInstallmentRead],
      ["service_installment_configs", serviceConfigRead],
      ["service_types", serviceFallbackRead],
    ] as const
  ) {
    if (read.error) {
      throw new PaymentPolicyReadError(
        `${label} read failed: ${
          read.error.message ?? "unknown database error"
        }`,
      );
    }
  }

  if (!paymentSettingsRead.data) {
    throw new PaymentPolicyReadError("payment_settings row is missing");
  }
  if (!serviceFallbackRead.data) {
    throw new PaymentPolicyReadError("service_types row is missing");
  }
  if (!ownerInstallmentRead.data) {
    throw new PaymentPolicyReadError("users row is missing");
  }

  return resolveInstallmentPaymentPolicy({
    securePaymentsEnabled:
      paymentSettingsRead.data.secure_payments_enabled === true,
    globallyRequired:
      paymentSettingsRead.data.payment_required_for_booking === true,
    ownerInstallmentsEnabled:
      ownerInstallmentRead.data.installments_enabled === true,
    serviceConfigExists: serviceConfigRead.data !== null,
    serviceConfigEnabled: serviceConfigRead.data?.enabled === true,
    serviceFallbackEnabled:
      serviceFallbackRead.data.installments_enabled === true,
  });
}
