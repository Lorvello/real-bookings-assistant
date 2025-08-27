// Production-safe logging utility that sanitizes sensitive data
// Replaces all console.log/error statements with secure logging

interface LogContext {
  component?: string;
  action?: string;
  data?: any;
  userId?: string;
  email?: string;
  timestamp?: string;
  calendarSlug?: string;
  slug?: string;
  calendarId?: string;
  bookingId?: string;
  [key: string]: any;
}

interface SanitizedError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

class SecureLogger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  // Sensitive data patterns to sanitize
  private sensitivePatterns = [
    /token/i,
    /password/i,
    /secret/i,
    /key/i,
    /auth/i,
    /session/i,
    /credential/i,
    /jwt/i,
    /email/i,
    /phone/i,
    /address/i
  ];

  private sanitizeData(data: any): any {
    if (!data) return data;

    if (typeof data === 'string') {
      // Mask sensitive string data
      if (this.sensitivePatterns.some(pattern => pattern.test(data))) {
        return data.length > 4 ? `${data.substring(0, 2)}***${data.substring(data.length - 2)}` : '***';
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        // Skip sensitive keys entirely in production
        if (this.isProduction && this.sensitivePatterns.some(pattern => pattern.test(key))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeData(value);
        } else if (typeof value === 'string' && value.length > 50) {
          // Truncate long strings
          sanitized[key] = `${value.substring(0, 47)}...`;
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return data;
  }

  private sanitizeError(error: Error | any): SanitizedError {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: this.isProduction ? 'An error occurred' : error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        code: (error as any).code
      };
    }
    
    return {
      name: 'Unknown Error',
      message: this.isProduction ? 'An error occurred' : String(error),
      stack: undefined
    };
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const sanitizedContext = this.sanitizeData(context);
      console.log(`🐛 [DEBUG] ${message}`, sanitizedContext || '');
    }
  }

  info(message: string, context?: LogContext) {
    const sanitizedContext = this.sanitizeData(context);
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, sanitizedContext || '');
    }
    // In production, only log to structured logging service (not implemented here)
  }

  warn(message: string, context?: LogContext) {
    const sanitizedContext = this.sanitizeData(context);
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, sanitizedContext || '');
    }
    // In production, send to monitoring service
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    const sanitizedError = error ? this.sanitizeError(error) : undefined;
    const sanitizedContext = this.sanitizeData(context);
    
    // Always log errors but sanitize sensitive data
    if (this.isDevelopment) {
      console.error(`❌ [ERROR] ${message}`, sanitizedError, sanitizedContext || '');
    } else {
      // In production, log minimal error info
      console.error(`❌ [ERROR] ${message}`, {
        name: sanitizedError?.name,
        message: 'An error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  success(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const sanitizedContext = this.sanitizeData(context);
      console.log(`✅ [SUCCESS] ${message}`, sanitizedContext || '');
    }
  }

  // Navigation logging
  navigation(action: string, target: string) {
    if (this.isDevelopment) {
      console.log(`🧭 [NAV] ${action}:`, target);
    }
  }

  // Performance logging
  performance(action: string, duration?: number) {
    if (this.isDevelopment) {
      const message = duration ? `${action} (${duration}ms)` : action;
      console.log(`⚡ [PERF] ${message}`);
    }
  }

  // Security event logging
  security(event: string, context?: LogContext) {
    const sanitizedContext = this.sanitizeData(context);
    
    // Always log security events but sanitize data
    if (this.isDevelopment) {
      console.warn(`🔒 [SECURITY] ${event}`, sanitizedContext || '');
    } else {
      console.warn(`🔒 [SECURITY] ${event}`, {
        timestamp: new Date().toISOString(),
        event
      });
    }
  }

  // Authentication logging (extra secure)
  auth(event: string, userId?: string) {
    if (this.isDevelopment) {
      console.log(`🔐 [AUTH] ${event}`, userId ? { userId: `user_${userId.substring(0, 8)}...` } : '');
    } else {
      console.log(`🔐 [AUTH] ${event}`, { timestamp: new Date().toISOString() });
    }
  }
}

export const secureLogger = new SecureLogger();

// Legacy compatibility - gradually replace console.* calls with these
export const logger = secureLogger;