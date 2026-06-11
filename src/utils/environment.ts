
/**
 * Environment detection utility
 * Distinguishes between development and production environments
 */

export const isProductionEnvironment = () => {
  // Check if we're in production based on hostname
  const hostname = window.location.hostname;
  
  // Production indicators
  const productionHosts = [
    'bookingsassistant.com',
    'vercel.app', // Vercel preview/production deploys
  ];
  
  return productionHosts.some(host => hostname.includes(host));
};

export const isDevelopmentEnvironment = () => {
  return !isProductionEnvironment();
};

export const getEnvironmentType = () => {
  return isProductionEnvironment() ? 'production' : 'development';
};

// Single source of truth for the developer account.
// This is the ONLY account that gets developer/testing powers — in EVERY
// environment, including production (bookingsassistant.com). Every other email
// is treated as a normal user. Matched case-insensitively (and trimmed) so the
// exact casing of the email — e.g. coming back from Google sign-in — never
// matters. Powerful operations are additionally guarded server-side by the
// `is_admin()` RLS check, so this client-side flag only governs UI visibility.
export const DEVELOPER_EMAIL = 'business01003@gmail.com';

export const isDeveloperEmail = (userEmail?: string | null): boolean =>
  !!userEmail && userEmail.trim().toLowerCase() === DEVELOPER_EMAIL;

// Environment-specific configuration with user context
export const getEnvironmentConfig = (userEmail?: string) => {
  const env = getEnvironmentType();
  const isDev = isDeveloperEmail(userEmail);

  return {
    environment: env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    // Mock/demo data stays development-only — never inject fake data into the
    // developer's real production testing.
    allowMockData: env === 'development' && isDev,
    // Developer tools (status manager, Stripe-mode indicator) are available to
    // the developer account in ALL environments so it can be tested live.
    allowDeveloperTools: isDev,
    debugMode: isDev,
  };
};
