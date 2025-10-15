// Stripe configuration and helper functions

/**
 * SECURITY: Get Stripe mode from environment variable ONLY
 * Users cannot manipulate this through browser dev tools
 * Server-side validation in edge functions provides additional security layer
 */
export const getStripeMode = (): 'test' | 'live' => {
  const envMode = import.meta.env.VITE_STRIPE_MODE as 'test' | 'live' | undefined;
  
  // In Vite development mode, ALWAYS use test (safety first)
  if (import.meta.env.DEV) {
    console.log('[STRIPE] Development environment detected - forcing TEST mode');
    return 'test';
  }
  
  // Production MUST have explicit configuration
  if (!envMode || (envMode !== 'test' && envMode !== 'live')) {
    console.error('[STRIPE] CRITICAL: VITE_STRIPE_MODE not properly configured in production');
    throw new Error(
      'VITE_STRIPE_MODE environment variable must be set to either "test" or "live" in production. ' +
      'This prevents accidental live charges in development and ensures explicit production configuration.'
    );
  }
  
  if (envMode === 'live') {
    console.warn('[STRIPE] ⚠️  LIVE MODE ACTIVE - Real payments will be processed');
  } else {
    console.log('[STRIPE] TEST MODE ACTIVE - Using Stripe test environment');
  }
  
  return envMode;
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
  const mode = getStripeMode();
  
  return {
    mode,
    publishableKey: getStripePublishableKey(),
    testMode: mode === 'test',
    isTestMode: mode === 'test' // Legacy alias for compatibility
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
