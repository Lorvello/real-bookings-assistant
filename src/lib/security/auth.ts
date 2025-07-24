// Enhanced Authentication Security
import { supabase } from '@/integrations/supabase/client';
import { SecurityLogger } from './logger';
import { RateLimiter } from './rate-limiter';
import { SessionManager } from './session-manager';

export interface AuthSecurityConfig {
  maxLoginAttempts: number;
  lockoutDurationMs: number;
  sessionTimeoutMs: number;
  requireEmailVerification: boolean;
  enableMFA: boolean;
}

export class AuthSecurity {
  private static config: AuthSecurityConfig = {
    maxLoginAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
    sessionTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
    requireEmailVerification: true,
    enableMFA: false
  };

  private static rateLimiter = new RateLimiter();
  private static sessionManager = new SessionManager();
  private static logger = new SecurityLogger();

  static async secureSignIn(email: string, password: string, clientInfo?: any) {
    const clientKey = `login_${email}_${this.getClientFingerprint(clientInfo)}`;
    
    // Check rate limiting
    if (!this.rateLimiter.isAllowed(clientKey, this.config.maxLoginAttempts, this.config.lockoutDurationMs)) {
      await this.logger.logSecurityEvent('auth_rate_limited', { email, clientInfo });
      throw new Error('Too many login attempts. Please try again later.');
    }

    try {
      // Validate input
      this.validateEmail(email);
      this.validatePassword(password);

      // Attempt authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        // Log failed attempt
        this.rateLimiter.recordAttempt(clientKey);
        await this.logger.logSecurityEvent('auth_failed', { 
          email, 
          error: error.message,
          clientInfo 
        });
        throw error;
      }

      // Successful login - reset rate limiter and setup session
      this.rateLimiter.reset(clientKey);
      await this.sessionManager.createSecureSession(data.session!);
      await this.logger.logSecurityEvent('auth_success', { 
        email, 
        userId: data.user?.id,
        clientInfo 
      });

      return data;
    } catch (error) {
      this.rateLimiter.recordAttempt(clientKey);
      throw error;
    }
  }

  static async secureSignUp(email: string, password: string, metadata?: any) {
    try {
      // Enhanced validation
      this.validateEmail(email);
      this.validatePasswordStrength(password);
      
      // Sanitize metadata
      const sanitizedMetadata = this.sanitizeMetadata(metadata);

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: sanitizedMetadata
        }
      });

      if (error) {
        await this.logger.logSecurityEvent('signup_failed', { 
          email, 
          error: error.message 
        });
        throw error;
      }

      await this.logger.logSecurityEvent('signup_success', { 
        email, 
        userId: data.user?.id 
      });

      return data;
    } catch (error) {
      throw error;
    }
  }

  static async secureSignOut(session: any) {
    try {
      await this.sessionManager.destroySession(session);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        await this.logger.logSecurityEvent('signout_failed', { error: error.message });
        throw error;
      }

      await this.logger.logSecurityEvent('signout_success', { 
        userId: session?.user?.id 
      });
    } catch (error) {
      throw error;
    }
  }

  private static validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    if (email.length > 254) {
      throw new Error('Email too long');
    }
  }

  private static validatePassword(password: string) {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  }

  private static validatePasswordStrength(password: string) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!(hasUpper && hasLower && hasNumber && hasSpecial)) {
      throw new Error('Password must contain uppercase, lowercase, number, and special character');
    }
  }

  private static sanitizeMetadata(metadata: any) {
    if (!metadata || typeof metadata !== 'object') return {};
    
    const sanitized: any = {};
    const allowedKeys = ['full_name', 'business_name', 'business_type'];
    
    for (const key of allowedKeys) {
      if (metadata[key] && typeof metadata[key] === 'string') {
        sanitized[key] = metadata[key].trim().slice(0, 255);
      }
    }
    
    return sanitized;
  }

  private static getClientFingerprint(clientInfo?: any): string {
    if (!clientInfo) return 'unknown';
    
    const components = [
      clientInfo.userAgent || 'unknown',
      clientInfo.language || 'unknown',
      clientInfo.timezone || 'unknown'
    ];
    
    return btoa(components.join('|')).slice(0, 16);
  }
}