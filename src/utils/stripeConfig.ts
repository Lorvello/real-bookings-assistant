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
  
  if (mode === 'test') {
    return 'pk_test_51RqIgEPyiLcfGjGYOLNQiJdmchHRGvAA5gFET2PfbZYAY2jsqmGrdKH5RbOEH4NyRwoZVMLatkRl1k7bnmBTQUvE00LwV1G5xJ';
  } else {
    // TODO: Add your live publishable key here
    return 'pk_live_your_publishable_key_here';
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
  
  // This would need to be implemented based on your subscription tier structure
  // For now, return null as a placeholder
  return null;
};