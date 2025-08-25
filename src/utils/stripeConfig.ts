// Stripe configuration and helper functions
// SECURITY: Always enforce test mode for payment security

export const getStripeMode = (): 'test' => {
  // SECURITY: Force test mode only - live mode disabled for security
  return 'test';
};

export const getStripePublishableKey = (): string => {
  // SECURITY: Only return test mode publishable key
  return 'pk_test_51RqIgEPyiLcfGjGYOLNQiJdmchHRGvAA5gFET2PfbZYAY2jsqmGrdKH5RbOEH4NyRwoZVMLatkRl1k7bnmBTQUvE00LwV1G5xJ';
};

export const isTestMode = (): boolean => {
  // SECURITY: Always true since we only allow test mode
  return true;
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