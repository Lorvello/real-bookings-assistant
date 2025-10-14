// Production-ready CORS and Security Headers Utility
// Implements environment-aware CORS and comprehensive security headers

/**
 * Get allowed origins based on environment
 * Supports ALLOWED_ORIGINS env variable for custom domains
 */
export function getAllowedOrigins(): string[] {
  const appEnv = Deno.env.get('APP_ENV') || 'development';
  const customOrigins = Deno.env.get('ALLOWED_ORIGINS');
  
  // Parse custom origins from environment variable
  if (customOrigins) {
    return customOrigins.split(',').map(o => o.trim());
  }
  
  // Default origins by environment
  if (appEnv === 'production') {
    return [
      'https://bookingsassistant.lovable.app',
      'https://grdgjhkygzciwwrxgvgy.supabase.co'
    ];
  }
  
  // Development mode - allow localhost
  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://bookingsassistant.lovable.app',
    'https://grdgjhkygzciwwrxgvgy.supabase.co'
  ];
}

/**
 * Validate request origin against allowed origins
 * Returns the origin if valid, null otherwise
 */
export function validateOrigin(request: Request): string | null {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  if (!origin) {
    // Allow requests without origin (e.g., same-origin, Postman, curl)
    return null;
  }
  
  if (allowedOrigins.includes(origin)) {
    return origin;
  }
  
  console.warn(`Rejected request from unauthorized origin: ${origin}`);
  return null;
}

/**
 * Get CORS headers for response
 * Uses validated origin or falls back to first allowed origin
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const validatedOrigin = validateOrigin(request);
  const allowedOrigins = getAllowedOrigins();
  
  return {
    'Access-Control-Allow-Origin': validatedOrigin || allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Comprehensive security headers for all responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS protection (legacy but still useful)
    'X-XSS-Protection': '1; mode=block',
    
    // HTTPS enforcement
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.voiceflow.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  };
}

/**
 * Combine CORS and security headers
 */
export function getAllHeaders(request: Request): Record<string, string> {
  return {
    ...getCorsHeaders(request),
    ...getSecurityHeaders(),
  };
}

/**
 * Create standardized preflight response
 */
export function createPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getAllHeaders(request),
  });
}

/**
 * Create standardized error response with security headers
 */
export function createErrorResponse(
  request: Request,
  message: string,
  status: number = 500,
  additionalData?: Record<string, any>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      ...additionalData,
    }),
    {
      status,
      headers: {
        ...getAllHeaders(request),
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create standardized success response with security headers
 */
export function createSuccessResponse(
  request: Request,
  data: any,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      ...data,
    }),
    {
      status,
      headers: {
        ...getAllHeaders(request),
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Validate origin and block unauthorized requests
 * Returns error response if origin is invalid
 */
export function validateOriginOrFail(request: Request): Response | null {
  const origin = request.headers.get('origin');
  
  // Skip validation for requests without origin header
  if (!origin) {
    return null;
  }
  
  const validatedOrigin = validateOrigin(request);
  
  if (validatedOrigin === null && origin) {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return createErrorResponse(
      request,
      'Unauthorized origin',
      403,
      { code: 'CORS_ERROR' }
    );
  }
  
  return null;
}
