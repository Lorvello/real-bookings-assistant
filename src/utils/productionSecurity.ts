// Production security utilities and hardening
import { secureLogger } from './secureLogger';

export class ProductionSecurity {
  
  // Initialize security headers and policies
  static initializeSecurityHeaders(): void {
    if (typeof document === 'undefined') return;

    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co https://cdn.voiceflow.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    // Add CSP meta tag if not exists
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const cspMeta = document.createElement('meta');
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      cspMeta.setAttribute('content', csp);
      document.head.appendChild(cspMeta);
    }

    // Referrer Policy
    if (!document.querySelector('meta[name="referrer"]')) {
      const referrerMeta = document.createElement('meta');
      referrerMeta.setAttribute('name', 'referrer');
      referrerMeta.setAttribute('content', 'strict-origin-when-cross-origin');
      document.head.appendChild(referrerMeta);
    }

    secureLogger.info('Security headers initialized');
  }

  // Sanitize URLs to prevent open redirects
  static sanitizeRedirectUrl(url: string, allowedDomains: string[] = []): string {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      
      // Only allow same origin or explicitly allowed domains
      const isAllowed = parsedUrl.origin === window.location.origin ||
                       allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain));

      if (!isAllowed) {
        secureLogger.security('Blocked suspicious redirect attempt', { 
          attemptedUrl: url.substring(0, 100) 
        });
        return '/';
      }

      return url;
    } catch {
      secureLogger.security('Invalid redirect URL blocked', { 
        attemptedUrl: url.substring(0, 100) 
      });
      return '/';
    }
  }

  // Input validation and XSS prevention
  static sanitizeHtmlInput(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  // Validate email format securely
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const isValid = emailRegex.test(email) && email.length <= 254;
    
    if (!isValid) {
      secureLogger.security('Invalid email format detected');
    }
    
    return isValid;
  }

  // Environment-based feature flags
  static isFeatureEnabled(feature: string): boolean {
    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;

    const devOnlyFeatures = ['testing', 'debug-tools', 'mock-data'];
    const prodOnlyFeatures = ['analytics', 'monitoring'];

    if (devOnlyFeatures.includes(feature)) {
      return isDev;
    }

    if (prodOnlyFeatures.includes(feature)) {
      return isProd;
    }

    // Default features available in both environments
    return true;
  }

  // Error boundary for production
  static handleGlobalError(error: Error, errorInfo?: any): void {
    secureLogger.error('Global error caught', error, {
      component: 'ErrorBoundary',
      errorInfo: errorInfo ? JSON.stringify(errorInfo).substring(0, 500) : undefined
    });

    // In production, you might want to send to error monitoring service
    if (import.meta.env.PROD) {
      // Send to monitoring service (Sentry, etc.)
      // This would be implemented based on your monitoring solution
    }
  }

  // Session timeout management
  static initializeSessionTimeout(timeoutMinutes: number = 30): void {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        secureLogger.security('Session timeout triggered');
        // Trigger logout
        window.dispatchEvent(new CustomEvent('session-timeout'));
      }, timeoutMinutes * 60 * 1000);
    };

    // Reset timeout on user activity
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activities.forEach(activity => {
      document.addEventListener(activity, resetTimeout, { passive: true });
    });

    // Initial timeout
    resetTimeout();
  }

  // Secure random token generation
  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Check if running in secure context
  static validateSecureContext(): boolean {
    const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
    
    if (!isSecure) {
      secureLogger.security('Application not running in secure context');
    }
    
    return isSecure;
  }
}

// Initialize security on import
if (typeof window !== 'undefined') {
  ProductionSecurity.initializeSecurityHeaders();
  ProductionSecurity.validateSecureContext();
  
  // Initialize session timeout only in production
  if (import.meta.env.PROD) {
    ProductionSecurity.initializeSessionTimeout(30);
  }
}

export default ProductionSecurity;