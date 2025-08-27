// Security headers utility for production hardening
// Implements Content Security Policy and other security headers

export const SecurityHeaders = {
  // Content Security Policy - prevents XSS attacks
  CSP: {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co https://cdn.voiceflow.com",
    'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'img-src': "'self' data: https: blob:",
    'font-src': "'self' https://fonts.gstatic.com",
    'connect-src': "'self' https://*.supabase.co wss://*.supabase.co",
    'frame-src': "'none'",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'"
  },

  // Additional security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }
};

// Format CSP for meta tag
export const formatCSPForMeta = (): string => {
  return Object.entries(SecurityHeaders.CSP)
    .map(([directive, value]) => `${directive} ${value}`)
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