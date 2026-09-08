// Security headers utility for production hardening
// Implements Content Security Policy and other security headers

export const SecurityHeaders = {
  // Content Security Policy - prevents XSS attacks
  CSP: {
    'default-src': "'self'",
    // The allowlist mirrors the launch-visible integrations. Stripe's required
    // origins come from its published CSP contract for Checkout, Stripe.js and
    // Connect embedded components. Voiceflow is limited to its widget CDN and
    // the two configured runtime endpoints used by useVoiceflowChatbot.
    'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.voiceflow.com https://checkout.stripe.com https://connect-js.stripe.com https://js.stripe.com https://*.js.stripe.com https://maps.googleapis.com",
    'style-src': "'self' 'unsafe-inline'",
    'img-src': "'self' data: https: blob:",
    'font-src': "'self' data:",
    'connect-src': "'self' https://*.supabase.co wss://*.supabase.co https://general-runtime.voiceflow.com https://runtime-api.voiceflow.com https://checkout.stripe.com https://api.stripe.com https://maps.googleapis.com",
    'frame-src': "https://checkout.stripe.com https://connect-js.stripe.com https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self' https://checkout.stripe.com",
    'frame-ancestors': "'none'",
    'worker-src': "'self' blob:",
    'manifest-src': "'self'",
    'upgrade-insecure-requests': '',
  },

  // Additional security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }
};

// Format CSP for meta tag
export const formatCSPForMeta = (): string => {
  return Object.entries(SecurityHeaders.CSP)
    .map(([directive, value]) => value ? `${directive} ${value}` : directive)
    .join('; ');
};

// Apply security headers to response (for edge functions)
export const applySecurityHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
  return {
    ...headers,
    ...SecurityHeaders.SECURITY_HEADERS,
    'Content-Security-Policy': formatCSPForMeta()
  };
};
