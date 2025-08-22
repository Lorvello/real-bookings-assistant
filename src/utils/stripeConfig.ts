// Stripe configuration and helper functions

export const getStripeMode = (): 'test' | 'live' => {
  // For development, always use test mode
  if (import.meta.env.DEV) {
    return 'test';
  }
  
  // In production, you can add logic to determine test vs live mode
  // For now, default to test mode for safety
  return 'test';
};

export const getStripePublishableKey = (): string => {
  const mode = getStripeMode();
  
  if (mode === 'test') {
    return 'pk_test_51QCw3HLcBboIITXgmtorLbhQYKnYWGhGW6L4HyIWmjhfGcnhFQCxN5qKBJBgM7pMBbvE4cZqkh4O3jE49Cn6zPKN00ULNlAojE';
  } else {
    // Add your live publishable key here
    return 'pk_live_your_publishable_key';
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