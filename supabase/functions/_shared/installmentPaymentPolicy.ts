export interface InstallmentPaymentPolicyInput {
  securePaymentsEnabled: boolean;
  globallyRequired: boolean;
  ownerInstallmentsEnabled: boolean;
  serviceConfigExists: boolean;
  serviceConfigEnabled: boolean;
  serviceFallbackEnabled: boolean;
}

/**
 * Resolve the WhatsApp pay-and-book policy from authoritative server state.
 *
 * A per-service override has precedence over the all-services fallback. An enabled
 * installment plan always requires its first online deposit before the booking can
 * confirm, even when the general calendar setting allows pay-on-site. Without this
 * rule the settings UI enabled installments while the WhatsApp booking path skipped
 * payment entirely because payment_required_for_booking was false.
 */
export function resolveInstallmentPaymentPolicy(
  input: InstallmentPaymentPolicyInput,
): { paymentRequired: boolean; useInstallments: boolean } {
  const installmentConfigured = input.ownerInstallmentsEnabled &&
    (input.serviceConfigExists
      ? input.serviceConfigEnabled
      : input.serviceFallbackEnabled);
  const useInstallments = input.securePaymentsEnabled && installmentConfigured;

  return {
    useInstallments,
    paymentRequired: input.securePaymentsEnabled &&
      (input.globallyRequired || installmentConfigured),
  };
}
