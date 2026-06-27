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

    // F-005: the bucket key MUST be identical on read and write. Postgres treats
    // NULLs as distinct in a UNIQUE index, so a NULL calendar_slug would split
    // buckets and defeat the onConflict upsert. We canonicalize to '' (empty
    // string) everywhere; the schema also defaults calendar_slug to '' NOT NULL.
    const slugKey = identifier ?? '';

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

    // 2. Get or create rate limit record (read path uses the SAME slugKey as the write)
    const { data: rateLimitRecord } = await this.supabase
      .from('public_api_rate_limits')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('endpoint', this.config.endpoint)
      .eq('calendar_slug', slugKey)
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

      const { error: blockWriteError } = await this.supabase
        .from('public_api_rate_limits')
        .upsert({
          ip_address: ipAddress,
          endpoint: this.config.endpoint,
          calendar_slug: slugKey,
          request_count: requestCount,
          window_start: windowStart,
          blocked_until: finalBlockUntil,
          total_blocks: totalBlocks,
          last_violation_reason: 'rate_limit_exceeded'
        }, {
          onConflict: 'ip_address,endpoint,calendar_slug'
        });

      // F-005 part (a): a write failure on the EXCEEDED path is fail-closed.
      // The request already breached the limit; if we cannot persist the block we
      // still DENY (never let an abuser through on a swallowed write error) and we
      // surface the failure loudly so it can never degrade the limiter silently.
      if (blockWriteError) {
        await this.logWriteFailure(ipAddress, 'block_write_failed', blockWriteError, {
          endpoint: this.config.endpoint,
          posture: 'fail_closed',
          request_count: requestCount
        });
      }

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
    const { error: countWriteError } = await this.supabase
      .from('public_api_rate_limits')
      .upsert({
        ip_address: ipAddress,
        endpoint: this.config.endpoint,
        calendar_slug: slugKey,
        request_count: requestCount,
        window_start: rateLimitRecord?.window_start || now,
        blocked_until: null
      }, {
        onConflict: 'ip_address,endpoint,calendar_slug'
      });

    // F-005 part (a): a write failure on the ALLOWED path is alert-and-allow.
    // This is a public booking endpoint: a transient counter-write blip must NOT
    // block a legitimate booking (availability over a single dropped count). But
    // the failure is surfaced LOUDLY (never silently swallowed) so a sustained
    // write outage that degrades the limiter is visible and alertable, not silent.
    if (countWriteError) {
      await this.logWriteFailure(ipAddress, 'count_write_failed', countWriteError, {
        endpoint: this.config.endpoint,
        posture: 'alert_and_allow',
        request_count: requestCount
      });
    }

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - requestCount,
      resetAt
    };
  }

  private async logViolation(ipAddress: string, eventType: string, details: any) {
    const { error } = await this.supabase
      .from('security_events_log')
      .insert({
        event_type: eventType,
        ip_address: ipAddress,
        event_data: details,
        severity: 'high',
        blocked: true
      });
    // F-005: never silently swallow the audit-write itself. If even the security
    // log insert fails we still cannot stay silent: emit to the function logs so
    // the violation is recoverable from observability even if the table write dropped.
    if (error) {
      console.error('[rateLimit] security_events_log insert failed', {
        eventType,
        ipAddress,
        error: error.message
      });
    }
  }

  // F-005 part (a): a dedicated surfacer for limiter WRITE failures. Records to
  // security_events_log (so a write-outage is queryable/alertable) and always
  // mirrors to console.error so the signal survives even if THIS insert also fails.
  private async logWriteFailure(
    ipAddress: string,
    eventType: 'block_write_failed' | 'count_write_failed',
    writeError: { message?: string; code?: string } | null,
    details: Record<string, unknown>
  ) {
    const payload = {
      ...details,
      db_error_message: writeError?.message ?? null,
      db_error_code: writeError?.code ?? null
    };
    console.error(`[rateLimit] ${eventType}`, { ipAddress, ...payload });
    const { error } = await this.supabase
      .from('security_events_log')
      .insert({
        event_type: eventType,
        ip_address: ipAddress,
        event_data: payload,
        severity: 'critical',
        blocked: eventType === 'block_write_failed'
      });
    if (error) {
      console.error('[rateLimit] failed to log write-failure to security_events_log', {
        eventType,
        ipAddress,
        error: error.message
      });
    }
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
