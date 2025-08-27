// Production-safe logging utility
// Replaces console.log statements with conditional logging based on environment

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
  [key: string]: any; // Allow additional fields
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`🐛 [DEBUG] ${message}`, context || '');
    }
  }

  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, context || '');
    }
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    // Always log errors, even in production, but filter sensitive data
    const sanitizedError = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: this.isDevelopment ? error.stack : undefined
    } : error;
    
    console.error(`❌ [ERROR] ${message}`, sanitizedError, context || '');
  }

  success(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`✅ [SUCCESS] ${message}`, context || '');
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
}

export const logger = new Logger();