// Rate Limiting Implementation
export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  keyGenerator?: (identifier: string) => string;
}

export class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number; lastAttempt: number }> = new Map();
  private cleanupInterval: number;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = window.setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      return true;
    }

    // Check if window has expired
    if (now - record.firstAttempt > windowMs) {
      this.attempts.delete(key);
      return true;
    }

    return record.count < maxAttempts;
  }

  recordAttempt(key: string): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      record.count++;
      record.lastAttempt = now;
    }
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  getRemainingAttempts(key: string, maxAttempts: number): number {
    const record = this.attempts.get(key);
    if (!record) return maxAttempts;
    return Math.max(0, maxAttempts - record.count);
  }

  getResetTime(key: string, windowMs: number): number | null {
    const record = this.attempts.get(key);
    if (!record) return null;
    return record.firstAttempt + windowMs;
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, record] of this.attempts.entries()) {
      if (now - record.lastAttempt > maxAge) {
        this.attempts.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.attempts.clear();
  }
}

// IP-based rate limiter for API calls
export class IPRateLimiter {
  private static instance: IPRateLimiter;
  private limiter: RateLimiter;

  private constructor() {
    this.limiter = new RateLimiter();
  }

  static getInstance(): IPRateLimiter {
    if (!IPRateLimiter.instance) {
      IPRateLimiter.instance = new IPRateLimiter();
    }
    return IPRateLimiter.instance;
  }

  checkLimit(identifier: string, config: RateLimitConfig): boolean {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    return this.limiter.isAllowed(key, config.maxAttempts, config.windowMs);
  }

  recordAttempt(identifier: string, config: RateLimitConfig): void {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    this.limiter.recordAttempt(key);
  }

  reset(identifier: string, config: RateLimitConfig): void {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    this.limiter.reset(key);
  }
}