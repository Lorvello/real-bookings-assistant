import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowSeconds: number;
  blockDurationSeconds: number;
  enableCaptchaThreshold?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
  requiresCaptcha?: boolean;
}

export class RateLimiter {
  constructor(
    private supabase: SupabaseClient,
    private config: RateLimitConfig
  ) {}

  async checkLimit(ipAddress: string, identifier?: string): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.windowSeconds * 1000);

    // 1. Check if IP is permanently blocked
    const { data: blockedIp } = await this.supabase
      .from('blocked_ips')
      .select('blocked_until, permanent_block, block_reason')
      .eq('ip_address', ipAddress)
      .single();

    if (blockedIp && (blockedIp.permanent_block || new Date(blockedIp.blocked_until) > now)) {
      await this.logViolation(ipAddress, 'ip_blocked', { reason: blockedIp.block_reason });
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetAt: blockedIp.permanent_block ? new Date('2099-12-31') : new Date(blockedIp.blocked_until),
        retryAfter: blockedIp.permanent_block ? -1 : Math.ceil((new Date(blockedIp.blocked_until).getTime() - now.getTime()) / 1000)
      };
    }

    // 2. Get or create rate limit record
    const { data: rateLimitRecord } = await this.supabase
      .from('public_api_rate_limits')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('endpoint', this.config.endpoint)
      .eq('calendar_slug', identifier || '')
      .single();

    // 3. Check if currently blocked (temporary)
    if (rateLimitRecord?.blocked_until && new Date(rateLimitRecord.blocked_until) > now) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetAt: new Date(rateLimitRecord.blocked_until),
        retryAfter: Math.ceil((new Date(rateLimitRecord.blocked_until).getTime() - now.getTime()) / 1000)
      };
    }

    // 4. Count requests in current sliding window
    let requestCount = 0;
    let resetAt = now;

    if (rateLimitRecord && new Date(rateLimitRecord.window_start) > windowStart) {
      requestCount = rateLimitRecord.request_count;
      resetAt = new Date(new Date(rateLimitRecord.window_start).getTime() + this.config.windowSeconds * 1000);
    }

    // 5. Increment request count
    requestCount++;

    // 6. Check if limit exceeded
    if (requestCount > this.config.maxRequests) {
      const totalBlocks = (rateLimitRecord?.total_blocks || 0) + 1;
      const exponentialBlockDuration = this.config.blockDurationSeconds * Math.pow(2, Math.min(totalBlocks - 1, 5));
      const finalBlockUntil = new Date(now.getTime() + exponentialBlockDuration * 1000);

      await this.supabase
        .from('public_api_rate_limits')
        .upsert({
          ip_address: ipAddress,
          endpoint: this.config.endpoint,
          calendar_slug: identifier || null,
          request_count: requestCount,
          window_start: windowStart,
          blocked_until: finalBlockUntil,
          total_blocks: totalBlocks,
          last_violation_reason: 'rate_limit_exceeded'
        }, {
          onConflict: 'ip_address,endpoint,calendar_slug'
        });

      const requiresCaptcha = this.config.enableCaptchaThreshold 
        ? totalBlocks >= this.config.enableCaptchaThreshold 
        : false;

      await this.logViolation(ipAddress, 'rate_limit_exceeded', {
        endpoint: this.config.endpoint,
        request_count: requestCount,
        limit: this.config.maxRequests,
        total_blocks: totalBlocks,
        requires_captcha: requiresCaptcha
      });

      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetAt: finalBlockUntil,
        retryAfter: Math.ceil(exponentialBlockDuration),
        requiresCaptcha
      };
    }

    // 7. Update request count (allowed request)
    await this.supabase
      .from('public_api_rate_limits')
      .upsert({
        ip_address: ipAddress,
        endpoint: this.config.endpoint,
        calendar_slug: identifier || null,
        request_count: requestCount,
        window_start: rateLimitRecord?.window_start || now,
        blocked_until: null
      }, {
        onConflict: 'ip_address,endpoint,calendar_slug'
      });

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - requestCount,
      resetAt
    };
  }

  private async logViolation(ipAddress: string, eventType: string, details: any) {
    await this.supabase
      .from('security_events_log')
      .insert({
        event_type: eventType,
        ip_address: ipAddress,
        event_data: details,
        severity: 'high',
        blocked: true
      });
  }

  static getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString()
    };

    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    if (result.requiresCaptcha) {
      headers['X-Requires-Captcha'] = 'true';
    }

    return headers;
  }

  static createRateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
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
          ...RateLimiter.getRateLimitHeaders(result),
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
}
