/**
 * Stripe Configuration Utility
 * Handles test/live mode switching for Stripe integration
 */

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  isTestMode: boolean;
  mode: 'test' | 'live';
}

/**
 * Get current Stripe mode from environment
 */
export const getStripeMode = (): 'test' | 'live' => {
  // Default to test mode for safety
  return 'test';
};

/**
 * Check if we're in test mode
 */
export const isTestMode = (): boolean => {
  return getStripeMode() === 'test';
};

/**
 * Get appropriate Stripe keys based on current mode
 * Note: This is a client-side utility - actual keys are managed in edge functions
 */
export const getStripeConfig = (): Pick<StripeConfig, 'isTestMode' | 'mode'> => {
  const mode = getStripeMode();
  return {
    isTestMode: mode === 'test',
    mode
  };
};

/**
 * Get appropriate price ID based on mode and billing period
 */
export const getPriceId = (
  tier: {
    stripe_test_monthly_price_id?: string;
    stripe_test_yearly_price_id?: string;
    stripe_live_monthly_price_id?: string;
    stripe_live_yearly_price_id?: string;
  },
  isAnnual: boolean,
  testMode: boolean = isTestMode()
): string | null => {
  if (testMode) {
    return isAnnual ? tier.stripe_test_yearly_price_id || null : tier.stripe_test_monthly_price_id || null;
  } else {
    return isAnnual ? tier.stripe_live_yearly_price_id || null : tier.stripe_live_monthly_price_id || null;
  }
};