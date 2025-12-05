// Production-grade error handling system
import { supabase } from '@/integrations/supabase/client';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  calendarId?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ErrorCode {
  code: string;
  category: 'auth' | 'api' | 'validation' | 'network' | 'permission' | 'unknown';
  severity: ErrorSeverity;
  userMessage: string;
  technicalMessage: string;
  retryable: boolean;
  supportAction?: string;
}

export class ProductionErrorHandler {
  private static errorCodeMap: Record<string, ErrorCode> = {
    // Auth errors
    'AUTH_001': {
      code: 'AUTH_001',
      category: 'auth',
      severity: 'medium',
      userMessage: 'Your session has expired. Please sign in again.',
      technicalMessage: 'JWT token expired or invalid',
      retryable: false,
      supportAction: 'Check user auth state'
    },
    'AUTH_002': {
      code: 'AUTH_002',
      category: 'auth',
      severity: 'low',
      userMessage: 'Invalid credentials. Please check your email and password.',
      technicalMessage: 'Invalid credentials provided',
      retryable: false,
      supportAction: 'User may have forgotten password'
    },
    'AUTH_003': {
      code: 'AUTH_003',
      category: 'auth',
      severity: 'low',
      userMessage: 'Please confirm your email before signing in.',
      technicalMessage: 'Email not confirmed',
      retryable: false,
      supportAction: 'Resend verification email'
    },
    // API errors
    'API_001': {
      code: 'API_001',
      category: 'api',
      severity: 'high',
      userMessage: 'Server error. Please try again later.',
      technicalMessage: 'Internal server error',
      retryable: true,
      supportAction: 'Check server logs'
    },
    // Validation errors
    'VAL_001': {
      code: 'VAL_001',
      category: 'validation',
      severity: 'low',
      userMessage: 'This data already exists.',
      technicalMessage: 'Unique constraint violation',
      retryable: false,
      supportAction: 'User needs to use different data'
    },
    // Network errors
    'NET_001': {
      code: 'NET_001',
      category: 'network',
      severity: 'medium',
      userMessage: 'Network error. Please check your connection.',
      technicalMessage: 'Network request failed',
      retryable: true,
      supportAction: 'Check user connection'
    }
  };

  /**
   * Main error logging method with severity classification
   */
  static async logError(
    error: any,
    context: ErrorContext,
    severity: ErrorSeverity = 'medium'
  ): Promise<void> {
    const sanitizedError = this.sanitizeError(error);
    const errorCode = this.classifyError(error);
    
    // Log to console (dev only)
    if (import.meta.env.DEV) {
      console.error(`[${severity.toUpperCase()}] ${errorCode?.code || 'UNKNOWN'}`, {
        error: sanitizedError,
        context
      });
    }

    // Log to Supabase based on severity
    if (severity === 'high' || severity === 'critical') {
      await this.logToDatabase(sanitizedError, context, severity, errorCode);
    }

    // Log to security audit if auth/permission error
    if (errorCode?.category === 'auth' || errorCode?.category === 'permission') {
      await this.logToSecurityAudit(sanitizedError, context);
    }
  }

  /**
   * Handle API errors with automatic classification
   */
  static handleAPIError(error: any, fallbackMessage?: string): {
    userMessage: string;
    errorCode?: ErrorCode;
    shouldRetry: boolean;
  } {
    const errorCode = this.classifyError(error);
    
    return {
      userMessage: errorCode?.userMessage || fallbackMessage || 'An error occurred while processing your request.',
      errorCode,
      shouldRetry: errorCode?.retryable ?? true
    };
  }

  /**
   * Handle validation errors from Zod or form validation
   */
  static handleValidationError(errors: any): {
    fieldErrors: Record<string, string>;
    globalError?: string;
  } {
    // Handle Zod errors
    if (errors?.issues) {
      const fieldErrors: Record<string, string> = {};
      errors.issues.forEach((issue: any) => {
        const field = issue.path.join('.');
        fieldErrors[field] = issue.message;
      });
      return { fieldErrors };
    }

    // Handle custom validation errors
    if (typeof errors === 'object') {
      return { fieldErrors: errors };
    }

    return { fieldErrors: {}, globalError: 'Validation error' };
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: any): {
    shouldRedirect: boolean;
    redirectUrl?: string;
    userMessage: string;
  } {
    const errorCode = this.classifyError(error);
    
    if (error?.message?.includes('JWT') || error?.status === 401) {
      return {
        shouldRedirect: true,
        redirectUrl: '/login',
        userMessage: 'Your session has expired. Please sign in again.'
      };
    }

    return {
      shouldRedirect: false,
      userMessage: errorCode?.userMessage || 'Authentication error occurred.'
    };
  }

  /**
   * Handle network errors with retry suggestions
   */
  static handleNetworkError(error: any): {
    isOffline: boolean;
    shouldRetry: boolean;
    retryAfter?: number;
    userMessage: string;
  } {
    const isOffline = !navigator.onLine;
    
    return {
      isOffline,
      shouldRetry: true,
      retryAfter: isOffline ? 30 : 5,
      userMessage: isOffline 
        ? 'You are offline. Please check your internet connection.'
        : 'Network error. Please try again.'
    };
  }

  /**
   * Automatic retry with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      onRetry?: (attempt: number) => void;
    } = {}
  ): Promise<T> {
    const { maxAttempts = 3, baseDelay = 1000, onRetry } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const errorCode = this.classifyError(error);
        
        if (!errorCode?.retryable || attempt === maxAttempts) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        onRetry?.(attempt);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Classify error and return error code
   */
  private static classifyError(error: any): ErrorCode | null {
    // JWT/Auth errors
    if (error?.message?.includes('JWT') || error?.status === 401) {
      return this.errorCodeMap['AUTH_001'];
    }

    // Invalid credentials
    if (error?.message?.includes('invalid_credentials')) {
      return this.errorCodeMap['AUTH_002'];
    }

    // Email not confirmed
    if (error?.message?.includes('email_not_confirmed')) {
      return this.errorCodeMap['AUTH_003'];
    }

    // Network errors
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return this.errorCodeMap['NET_001'];
    }

    // PostgreSQL errors
    if (error?.code === '23505') {
      return this.errorCodeMap['VAL_001'];
    }

    // Server errors
    if (error?.status >= 500) {
      return this.errorCodeMap['API_001'];
    }

    return null;
  }

  /**
   * Sanitize error by removing sensitive data
   */
  private static sanitizeError(error: any): any {
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'api_key', 'access_token'];
    
    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    return {
      message: error?.message || 'Unknown error',
      name: error?.name,
      stack: import.meta.env.DEV ? error?.stack : undefined,
      code: error?.code,
      status: error?.status,
      details: sanitize(error?.details || {})
    };
  }

  /**
   * Log to Supabase error_logs table
   */
  private static async logToDatabase(
    error: any,
    context: ErrorContext,
    severity: ErrorSeverity,
    errorCode?: ErrorCode | null
  ): Promise<void> {
    try {
      const { error: insertError } = await supabase.from('error_logs').insert([{
        error_type: errorCode?.category || 'unknown',
        error_message: error.message,
        error_context: {
          ...context,
          errorCode: errorCode?.code,
          severity,
          sanitizedError: error
        },
        user_id: context.userId || null,
        calendar_id: context.calendarId || null
      }]);
      
      if (insertError) {
        console.error('Error log insert failed:', insertError);
      }
    } catch (loggingError) {
      console.error('Failed to log error to database:', loggingError);
    }
  }

  /**
   * Log to security audit for sensitive errors
   */
  private static async logToSecurityAudit(error: any, context: ErrorContext): Promise<void> {
    try {
      // Use correct table structure for security_events_log - event_data must be JSON-compatible
      const { error: insertError } = await supabase.from('security_events_log').insert([{
        event_type: 'error_occurred',
        ip_address: null,
        event_data: {
          error: error.message,
          userId: context.userId,
          component: context.component,
          action: context.action,
          url: context.url
        } as any,
        severity: 'medium'
      }]);
      
      if (insertError) {
        console.error('Security audit log error:', insertError);
      }
    } catch (loggingError) {
      console.error('Failed to log to security audit:', loggingError);
    }
  }

  /**
   * Generate standard rate limit headers for HTTP responses
   */
  static getRateLimitHeaders(result: any): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit?.toString() || '0',
      'X-RateLimit-Remaining': result.remaining?.toString() || '0',
      'X-RateLimit-Reset': result.resetAt?.toISOString() || new Date().toISOString()
    };

    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    if (result.requiresCaptcha) {
      headers['X-Requires-Captcha'] = 'true';
    }

    return headers;
  }

  /**
   * Create 429 Too Many Requests response
   */
  static createRateLimitResponse(result: any, corsHeaders: Record<string, string>): Response {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: result.requiresCaptcha 
          ? 'Rate limit exceeded. Please complete CAPTCHA to continue.'
          : 'You have exceeded the rate limit. Please try again later.',
        retryAfter: result.retryAfter,
        resetAt: result.resetAt
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...ProductionErrorHandler.getRateLimitHeaders(result),
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Simplified error handler for quick use
export const handleError = (error: any, message?: string, component?: string) => {
  const context: ErrorContext = {
    component,
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
  
  ProductionErrorHandler.logError(error, context, 'medium');
  
  return {
    type: 'error' as const,
    message: ProductionErrorHandler.handleAPIError(error, message).userMessage,
    originalError: error,
    context
  };
};
