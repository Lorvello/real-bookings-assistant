// Security Module Exports
export { AuthSecurity } from './auth';
export { RateLimiter, IPRateLimiter } from './rate-limiter';
export { SessionManager } from './session-manager';
export { SecurityLogger } from './logger';
export { CSRFProtection } from './csrf';
export { threatDetector, ThreatDetector } from './threat-detection';
export { SecurityHeaders } from './headers';

export type {
  AuthSecurityConfig,
  RateLimitConfig,
  SessionSecurityConfig,
  SecurityEvent,
  ThreatDetection,
  ThreatRule,
  ThreatContext,
  ThreatResult,
  SecurityHeadersConfig,
  CSRFConfig
} from './auth';

// Initialize security features
export const initializeSecurity = () => {
  console.log('🔒 Initializing security features...');
  
  // Initialize CSRF protection (auto-initializes)
  // Initialize security headers (auto-initializes)
  
  console.log('✅ Security features initialized');
};

// Security utilities
export const SecurityUtils = {
  // Generate secure random string
  generateSecureToken: (length: number = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  // Hash data using SubtleCrypto
  hashData: async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Constant-time string comparison
  secureCompare: (a: string, b: string): boolean => {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  },

  // Generate cryptographically secure UUID
  generateUUID: (): string => {
    return crypto.randomUUID();
  },

  // Validate email format
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  // Check password strength
  checkPasswordStrength: (password: string): {
    score: number;
    feedback: string[];
  } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;
    else feedback.push('Consider using 12+ characters for better security');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    return { score, feedback };
  }
};