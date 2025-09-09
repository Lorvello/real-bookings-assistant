// Stripe configuration and helper functions

export const getStripeMode = (): 'test' | 'live' => {
  // Check for manual override in localStorage (from StripeModeSwitcher)
  const override = localStorage.getItem('stripe_mode_override') as 'test' | 'live' | null;
  if (override) {
    return override;
  }
  
  // For development, always use test mode
  if (import.meta.env.DEV) {
    return 'test';
  }
  
  // In production, default to test mode for safety until manually switched
  return 'test';
};

export const getStripePublishableKey = (): string => {
  const mode = getStripeMode();
  
  // These are safe to hardcode as they are publishable keys (not secret)
  if (mode === 'test') {
    return 'pk_test_51RqIgEPyiLcfGjGYOLNQiJdmchHRGvAA5gFET2PfbZYAY2jsqmGrdKH5RbOEH4NyRwoZVMLatkRl1k7bnmBTQUvE00LwV1G5xJ';
  } else {
    return 'pk_live_51RqIg2LcBboIITXgpublishable_key_KxOsGUjcBE78LbXnRvC8Qcb6OQJhM4fJF8KY7TiZTvnhY8Xf7QJdEzjCy7q00c8';
  }
};

export const isTestMode = (): boolean => {
  return getStripeMode() === 'test';
};

export const getStripeConfig = () => {
  return {
    mode: getStripeMode(),
    publishableKey: getStripePublishableKey(),
    testMode: isTestMode(),
    isTestMode: isTestMode() // Legacy alias for compatibility
  };
};

export const getPriceId = (tierData: any, isAnnual: boolean, testMode: boolean) => {
  if (!tierData) return null;
  
  // Return the correct Stripe Price ID based on mode, billing frequency, and tier
  if (testMode) {
    // Test mode price IDs
    if (isAnnual) {
      return tierData.stripe_test_yearly_price_id;
    } else {
      return tierData.stripe_test_monthly_price_id;
    }
  } else {
    // Live mode price IDs
    if (isAnnual) {
      return tierData.stripe_live_yearly_price_id;
    } else {
      return tierData.stripe_live_monthly_price_id;
    }
  }
};