// Production-safe logging utility
// Replaces console.log statements with conditional logging based on environment

interface LogContext {
  component?: string;
  action?: string;
  data?: any;
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
    // Always log errors, even in production
    console.error(`❌ [ERROR] ${message}`, error, context || '');
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