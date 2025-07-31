
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

// Environment-specific configuration with user context
export const getEnvironmentConfig = (userEmail?: string) => {
  const env = getEnvironmentType();
  const isDeveloperEmail = userEmail && (
    userEmail.endsWith('@brandevolves.com') || 
    userEmail.endsWith('@dev.local') ||
    userEmail === 'developer@example.com' ||
    userEmail === 'admin@example.com' ||
    userEmail === 'businessof00@gmail.com'
  );
  
  return {
    environment: env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    allowMockData: env === 'development' && isDeveloperEmail,
    allowDeveloperTools: env === 'development' && isDeveloperEmail,
    debugMode: env === 'development' && isDeveloperEmail
  };
};
