/**
 * Application-fee calculator for booking destination charges.
 *
 * Stripe debits payment-processing fees from the platform for this charge model.
 * Those provider costs are therefore deliberately not added to the connected
 * account's application fee here. The only booking deduction is the locked 1.9%.
 */

export interface FeeCalculationParams {
  amountCents: number;
  platformFeePercentage?: number;
}

export interface FeeCalculationResult {
  applicationFeeCents: number;
  platformFeeCents: number;
  connectedAccountNetCents: number;
  breakdown: {
    platformFeePercent: number;
    platformFeeFixed: 0;
    chargeModel: "destination";
    stripeFeePayer: "platform";
  };
}

// Source of truth for the product's booking application fee.
export const PLATFORM_FEE_PERCENTAGE = 1.9;
export const PLATFORM_FEE_RATE = PLATFORM_FEE_PERCENTAGE / 100;

/** Calculate the exact connected-account deduction for one booking payment. */
export function calculateApplicationFee(
  params: FeeCalculationParams,
): FeeCalculationResult {
  const {
    amountCents,
    platformFeePercentage = PLATFORM_FEE_RATE,
  } = params;

  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new TypeError("amountCents must be a positive safe integer");
  }
  if (
    !Number.isFinite(platformFeePercentage) ||
    platformFeePercentage < 0 ||
    platformFeePercentage > 1
  ) {
    throw new TypeError("platformFeePercentage must be a rate between 0 and 1");
  }

  const platformFeeCents = Math.min(
    amountCents,
    Math.round(amountCents * platformFeePercentage),
  );

  return {
    applicationFeeCents: platformFeeCents,
    platformFeeCents,
    connectedAccountNetCents: amountCents - platformFeeCents,
    breakdown: {
      platformFeePercent: platformFeePercentage,
      platformFeeFixed: 0,
      chargeModel: "destination",
      stripeFeePayer: "platform",
    },
  };
}

/**
 * Net amount transferred to the connected account by the destination charge.
 * Stripe processing fees are debited separately from the platform balance.
 */
export function calculateNetAmount(
  amountCents: number,
  applicationFeeCents: number,
): number {
  if (
    !Number.isSafeInteger(amountCents) ||
    !Number.isSafeInteger(applicationFeeCents) ||
    amountCents < 0 ||
    applicationFeeCents < 0 ||
    applicationFeeCents > amountCents
  ) {
    throw new TypeError("fee must be a valid cent amount within the charge");
  }
  return amountCents - applicationFeeCents;
}
