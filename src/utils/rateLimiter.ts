// Client-side rate limiting utility
// Provides basic protection against rapid form submissions

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

class ClientRateLimiter {
  private storage = new Map<string, RateLimitRecord>();
  private defaultConfig: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 60000, // 1 minute
    blockDurationMs: 300000 // 5 minutes
  };

  check(key: string, config?: Partial<RateLimitConfig>): { allowed: boolean; blockedUntil?: Date } {
    const finalConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    const record = this.storage.get(key);

    // Clean expired entries
    this.cleanup();

    // Check if currently blocked
    if (record?.blockedUntil && record.blockedUntil > now) {
      return {
        allowed: false,
        blockedUntil: new Date(record.blockedUntil)
      };
    }

    // Initialize or reset if window expired
    if (!record || (now - record.firstAttempt) > finalConfig.windowMs) {
      this.storage.set(key, {
        attempts: 1,
        firstAttempt: now
      });
      return { allowed: true };
    }

    // Increment attempts
    record.attempts++;

    // Check if limit exceeded
    if (record.attempts > finalConfig.maxAttempts) {
      record.blockedUntil = now + finalConfig.blockDurationMs;
      this.storage.set(key, record);
      
      return {
        allowed: false,
        blockedUntil: new Date(record.blockedUntil)
      };
    }

    this.storage.set(key, record);
    return { allowed: true };
  }

  reset(key: string): void {
    this.storage.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, record] of this.storage.entries()) {
      // Remove expired blocks and old records
      if (
        (record.blockedUntil && record.blockedUntil < now) ||
        (now - record.firstAttempt) > this.defaultConfig.windowMs * 2
      ) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.storage.delete(key));
  }
}

export const rateLimiter = new ClientRateLimiter();

// Utility functions for common use cases
export const checkAuthRateLimit = (email: string) => {
  return rateLimiter.check(`auth:${email}`, {
    maxAttempts: 3,
    windowMs: 300000, // 5 minutes
    blockDurationMs: 900000 // 15 minutes
  });
};

export const checkBookingRateLimit = (ip: string, calendarId: string) => {
  return rateLimiter.check(`booking:${ip}:${calendarId}`, {
    maxAttempts: 5,
    windowMs: 60000, // 1 minute
    blockDurationMs: 300000 // 5 minutes
  });
};

export const checkFormRateLimit = (formId: string, userIdentifier: string) => {
  return rateLimiter.check(`form:${formId}:${userIdentifier}`, {
    maxAttempts: 10,
    windowMs: 60000, // 1 minute
    blockDurationMs: 60000 // 1 minute
  });
};