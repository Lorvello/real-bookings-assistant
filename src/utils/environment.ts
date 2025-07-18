/**
 * Environment detection utility
 * Distinguishes between development and production environments
 */

export const isProductionEnvironment = () => {
  // Check if we're in production based on hostname
  const hostname = window.location.hostname;
  
  // Production indicators
  const productionHosts = [
    'brandevolves.lovable.app',
    'lovable.app',
    // Add your custom production domains here
  ];
  
  return productionHosts.some(host => hostname.includes(host));
};

export const isDevelopmentEnvironment = () => {
  return !isProductionEnvironment();
};

export const getEnvironmentType = () => {
  return isProductionEnvironment() ? 'production' : 'development';
};

// Environment-specific configuration
export const getEnvironmentConfig = () => {
  const env = getEnvironmentType();
  
  return {
    environment: env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    allowMockData: env === 'development',
    allowDeveloperTools: env === 'development',
    debugMode: env === 'development'
  };
};