/**
 * Shared Fee Calculator for Stripe Payment Processing
 * 
 * This utility calculates the application_fee_amount for destination charges
 * based on payment method, payout option, and platform fee configuration.
 */

export interface FeeCalculationParams {
  amountCents: number;
  paymentMethod: string;
  payoutOption: 'standard' | 'instant';
  platformFeePercentage?: number; // Default: 1.9%
}

export interface FeeCalculationResult {
  applicationFeeCents: number;
  platformFeeCents: number;
  paymentMethodFeeCents: number;
  payoutFeeCents: number;
  breakdown: {
    platformFeePercent: number;
    platformFeeFixed: number;
    paymentMethodFeePercent: number;
    paymentMethodFeeFixed: number;
  };
}

// Payment method fee structure (based on Stripe pricing for Netherlands/EU)
const PAYMENT_METHOD_FEES: Record<string, { percent: number; fixed: number }> = {
  'ideal': { percent: 0, fixed: 29 }, // €0.29 flat
  'bancontact': { percent: 0, fixed: 35 }, // €0.35 flat
  'eps': { percent: 0, fixed: 35 }, // €0.35 flat
  'giropay': { percent: 0, fixed: 35 }, // €0.35 flat
  'sofort': { percent: 0.014, fixed: 25 }, // 1.4% + €0.25
  'card': { percent: 0.015, fixed: 25 }, // 1.5% + €0.25 (EEA cards)
  'card_international': { percent: 0.029, fixed: 25 }, // 2.9% + €0.25 (non-EEA)
  'sepa_debit': { percent: 0.008, fixed: 35 }, // 0.8% + €0.35 (capped at €5)
  'klarna': { percent: 0.0399, fixed: 35 }, // 3.99% + €0.35
  'afterpay': { percent: 0.06, fixed: 30 }, // 6% + €0.30
  'default': { percent: 0.015, fixed: 25 }, // Fallback to card fees
};

// Payout option fees
const PAYOUT_FEES = {
  standard: 25, // €0.25 per payout
  instant: 35,  // €0.35 per payout (€0.10 extra for instant)
};

// Default platform fee percentage
const DEFAULT_PLATFORM_FEE_PERCENT = 0.019; // 1.9%

/**
 * Calculate the application fee for a Stripe destination charge
 */
export function calculateApplicationFee(params: FeeCalculationParams): FeeCalculationResult {
  const {
    amountCents,
    paymentMethod,
    payoutOption,
    platformFeePercentage = DEFAULT_PLATFORM_FEE_PERCENT,
  } = params;

  // Normalize payment method key
  const methodKey = normalizePaymentMethod(paymentMethod);
  const methodFees = PAYMENT_METHOD_FEES[methodKey] || PAYMENT_METHOD_FEES['default'];

  // Calculate platform fee
  const platformFeePercent = platformFeePercentage;
  const platformFeeCents = Math.round(amountCents * platformFeePercent);

  // Calculate payment method fee
  const paymentMethodFeeCents = Math.round(
    amountCents * methodFees.percent + methodFees.fixed
  );

  // Get payout fee
  const payoutFeeCents = PAYOUT_FEES[payoutOption];

  // Total application fee (platform fee + payout fee)
  // Note: Payment method fees are typically absorbed by Stripe, not passed to connected account
  const applicationFeeCents = platformFeeCents + payoutFeeCents;

  return {
    applicationFeeCents,
    platformFeeCents,
    paymentMethodFeeCents,
    payoutFeeCents,
    breakdown: {
      platformFeePercent: platformFeePercentage,
      platformFeeFixed: 0,
      paymentMethodFeePercent: methodFees.percent,
      paymentMethodFeeFixed: methodFees.fixed,
    },
  };
}

/**
 * Normalize payment method string to match our fee structure keys
 */
function normalizePaymentMethod(method: string): string {
  const normalized = method.toLowerCase().trim();
  
  // Map Stripe payment method types to our fee keys
  const mappings: Record<string, string> = {
    'ideal': 'ideal',
    'bancontact': 'bancontact',
    'eps': 'eps',
    'giropay': 'giropay',
    'sofort': 'sofort',
    'sepa_debit': 'sepa_debit',
    'card': 'card',
    'pm_card': 'card',
    'visa': 'card',
    'mastercard': 'card',
    'amex': 'card_international',
    'klarna': 'klarna',
    'afterpay_clearpay': 'afterpay',
    'afterpay': 'afterpay',
  };

  return mappings[normalized] || 'default';
}

/**
 * Get display-friendly fee information for a payment method
 */
export function getPaymentMethodFeeDisplay(paymentMethod: string): string {
  const methodKey = normalizePaymentMethod(paymentMethod);
  const fees = PAYMENT_METHOD_FEES[methodKey] || PAYMENT_METHOD_FEES['default'];

  if (fees.percent === 0) {
    return `€${(fees.fixed / 100).toFixed(2)}`;
  } else if (fees.fixed === 0) {
    return `${(fees.percent * 100).toFixed(1)}%`;
  } else {
    return `${(fees.percent * 100).toFixed(1)}% + €${(fees.fixed / 100).toFixed(2)}`;
  }
}

/**
 * Calculate the net amount the connected account will receive
 */
export function calculateNetAmount(
  amountCents: number,
  applicationFeeCents: number,
  paymentMethodFeeCents: number
): number {
  // Connected account receives: amount - application_fee - Stripe processing fee
  return amountCents - applicationFeeCents - paymentMethodFeeCents;
}
