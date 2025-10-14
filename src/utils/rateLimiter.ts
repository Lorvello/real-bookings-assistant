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
  private storageKey = 'bookingsassistant_rate_limits';
  private defaultConfig: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 60000, // 1 minute
    blockDurationMs: 300000 // 5 minutes
  };

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.storage = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load rate limits from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.storage);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save rate limits to storage:', error);
    }
  }

  check(key: string, config?: Partial<RateLimitConfig>): { allowed: boolean; blockedUntil?: Date; remaining?: number } {
    const finalConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    const record = this.storage.get(key);

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
      const newRecord = {
        attempts: 1,
        firstAttempt: now
      };
      this.storage.set(key, newRecord);
      this.saveToStorage();
      return { 
        allowed: true, 
        remaining: finalConfig.maxAttempts - 1 
      };
    }

    // Increment attempts
    record.attempts++;

    // Check if limit exceeded
    if (record.attempts > finalConfig.maxAttempts) {
      record.blockedUntil = now + finalConfig.blockDurationMs;
      this.storage.set(key, record);
      this.saveToStorage();
      
      return {
        allowed: false,
        blockedUntil: new Date(record.blockedUntil)
      };
    }

    this.storage.set(key, record);
    this.saveToStorage();
    return { 
      allowed: true, 
      remaining: finalConfig.maxAttempts - record.attempts 
    };
  }

  reset(key: string): void {
    this.storage.delete(key);
    this.saveToStorage();
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

export const checkWaitlistRateLimit = (ip: string) => {
  return rateLimiter.check(`waitlist:${ip}`, {
    maxAttempts: 3,
    windowMs: 300000, // 5 minutes
    blockDurationMs: 900000 // 15 minutes
  });
};

export const checkAvailabilityRateLimit = (ip: string, calendarSlug: string) => {
  return rateLimiter.check(`availability:${ip}:${calendarSlug}`, {
    maxAttempts: 20,
    windowMs: 60000, // 1 minute
    blockDurationMs: 180000 // 3 minutes
  });
};

export const checkContactFormRateLimit = (ip: string) => {
  return rateLimiter.check(`contact:${ip}`, {
    maxAttempts: 2,
    windowMs: 300000, // 5 minutes
    blockDurationMs: 1800000 // 30 minutes
  });
};