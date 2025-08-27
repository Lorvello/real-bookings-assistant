// Authentication security utilities
import { supabase } from '@/integrations/supabase/client';
import { secureLogger } from './secureLogger';

export class AuthSecurity {
  
  // Enhanced session validation
  static async validateSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        secureLogger.security('Session validation failed', { error: error.message });
        return { valid: false, error };
      }

      if (!session) {
        return { valid: false, error: null };
      }

      // Check token expiry with buffer
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const bufferTime = 300; // 5 minutes buffer

      if (now >= (expiresAt - bufferTime)) {
        secureLogger.security('Session near expiry, refreshing');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          secureLogger.security('Session refresh failed', { error: refreshError.message });
          return { valid: false, error: refreshError };
        }

        return { valid: true, session: refreshData.session };
      }

      return { valid: true, session };
    } catch (error) {
      secureLogger.error('Session validation error', error);
      return { valid: false, error };
    }
  }

  // Rate limiting for authentication attempts
  static checkAuthRateLimit(identifier: string): boolean {
    const key = `auth_attempts_${identifier}`;
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5;

    // Filter recent attempts
    const recentAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      secureLogger.security('Authentication rate limit exceeded', { identifier: identifier.substring(0, 3) + '***' });
      return false;
    }

    // Record this attempt
    recentAttempts.push(now);
    localStorage.setItem(key, JSON.stringify(recentAttempts));
    
    return true;
  }

  // Clear rate limit on successful auth
  static clearAuthRateLimit(identifier: string): void {
    const key = `auth_attempts_${identifier}`;
    localStorage.removeItem(key);
  }

  // Secure logout with cleanup
  static async secureLogout(): Promise<void> {
    try {
      // Clear any sensitive data from storage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('token') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        secureLogger.error('Logout error', error);
      } else {
        secureLogger.auth('User logged out');
      }

      // Clear any remaining session data
      sessionStorage.clear();
      
    } catch (error) {
      secureLogger.error('Secure logout failed', error);
    }
  }

  // Password strength validation
  static validatePasswordStrength(password: string): { valid: boolean; score: number; errors: string[] } {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    } else {
      score += 2;
    }

    // Complexity checks
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    // Check for common patterns
    const commonPatterns = [
      /password/i,
      /123456/,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /welcome/i,
      /12345678/
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common patterns that are not secure');
      score = Math.max(0, score - 2);
    }

    return {
      valid: errors.length === 0 && score >= 5,
      score: Math.min(6, score),
      errors
    };
  }

  // Detect suspicious login patterns
  static detectSuspiciousActivity(userAgent: string, ipHash?: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /automated/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      secureLogger.security('Suspicious user agent detected', { 
        userAgent: userAgent.substring(0, 50) + '...' 
      });
      return true;
    }

    return false;
  }
}

export default AuthSecurity;