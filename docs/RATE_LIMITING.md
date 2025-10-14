# Rate Limiting Documentation

## Overview

BookingsAssistant implements comprehensive rate limiting across all public-facing endpoints to prevent abuse, protect system resources, and ensure fair usage.

## Public Endpoints

| Endpoint | Limit | Window | Block Duration | CAPTCHA Threshold |
|----------|-------|--------|----------------|-------------------|
| `/functions/v1/create-booking` | 5 req | 1 min | 5 min | After 3 violations |
| `/functions/v1/add-to-waitlist` | 3 req | 5 min | 15 min | After 2 violations |
| `/functions/v1/get-availability` | 20 req | 1 min | 3 min | After 5 violations |
| `/functions/v1/whatsapp-webhook` | 100 req | 1 min | 10 min | After 10 violations |
| `/functions/v1/submit-contact-form` | 2 req | 5 min | 30 min | After 1 violation |

## Rate Limiting Algorithm

We use a **sliding window** algorithm for accurate rate limiting:

1. **Request Tracking**: Each request is tracked per IP address (and optionally per identifier like calendar slug)
2. **Sliding Window**: The time window slides with each request, preventing burst attacks at window boundaries
3. **Exponential Backoff**: Block duration doubles with each violation (up to 5x maximum)
4. **CAPTCHA Integration**: After threshold violations, CAPTCHA verification is required

## Response Headers

All rate-limited responses include the following headers:

### Standard Headers (All Requests)

- **X-RateLimit-Limit**: Maximum requests allowed in window
- **X-RateLimit-Remaining**: Requests remaining in current window
- **X-RateLimit-Reset**: ISO timestamp when the limit resets

### Rate Limit Exceeded (429 Response)

- **Retry-After**: Seconds until the block is lifted
- **X-Requires-Captcha**: Set to "true" if CAPTCHA verification needed

## Example Response Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2025-01-15T10:05:00Z
```

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-01-15T10:10:00Z
Retry-After: 300
X-Requires-Captcha: true
```

## Database Tables

### `public_api_rate_limits`

Tracks API request counts per IP and endpoint.

**Columns:**
- `ip_address`: Client IP address (inet)
- `endpoint`: Endpoint identifier (text)
- `calendar_slug`: Optional calendar identifier (text)
- `request_count`: Number of requests in current window (integer)
- `window_start`: Window start timestamp
- `blocked_until`: Temporary block expiration timestamp
- `total_blocks`: Total number of violations (integer)

### `blocked_ips`

Manages permanent and temporary IP blocks.

**Columns:**
- `ip_address`: Blocked IP address (inet)
- `permanent_block`: Whether block is permanent (boolean)
- `blocked_until`: Temporary block expiration
- `block_reason`: Reason for blocking (text)

### `security_events_log`

Audit log of all rate limit violations and security events.

**Columns:**
- `event_type`: Event classification (e.g., 'rate_limit_exceeded')
- `ip_address`: Source IP address
- `event_data`: JSON details about the event
- `severity`: Event severity level (info, medium, high, critical)
- `blocked`: Whether the request was blocked

## Client-Side Rate Limiting

In addition to server-side limits, we implement optimistic client-side rate limiting:

- **localStorage Persistence**: Rate limit state persists across page reloads
- **User Feedback**: Shows remaining attempts and block duration
- **Automatic Cleanup**: Expired entries are automatically removed

## Security Features

1. **IP-Based Tracking**: Primary rate limit key is client IP address
2. **Sliding Window**: More accurate than fixed windows, prevents burst attacks
3. **Exponential Backoff**: Increasing block durations deter persistent attackers
4. **CAPTCHA Integration**: Human verification after repeated violations
5. **Security Logging**: All violations logged to `security_events_log`
6. **Permanent Blocks**: Support for permanently blocking malicious IPs

## Testing Rate Limits

### Manual Testing with cURL

```bash
# Test booking endpoint (5 requests/minute)
for i in {1..6}; do
  curl -X POST https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/create-booking \
    -H "Content-Type: application/json" \
    -d '{"calendarSlug":"test","serviceTypeId":"uuid-here","customerName":"Test","customerEmail":"test@test.com","startTime":"2025-01-20T10:00:00Z","endTime":"2025-01-20T11:00:00Z"}'
done
```

Expected result: 6th request returns 429 with appropriate headers.

### Automated Testing

Monitor `security_events_log` for rate limit violations:

```sql
SELECT * FROM security_events_log 
WHERE event_type = 'rate_limit_exceeded' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Configuration

Rate limit configuration is defined in `supabase/functions/_shared/rateLimit.ts`.

To adjust limits, modify the `RateLimitConfig` object when instantiating the `RateLimiter`:

```typescript
const rateLimiter = new RateLimiter(supabaseClient, {
  endpoint: 'booking_creation',
  maxRequests: 5,           // Requests per window
  windowSeconds: 60,        // Window size in seconds
  blockDurationSeconds: 300, // Initial block duration
  enableCaptchaThreshold: 3  // Violations before CAPTCHA
});
```

## Best Practices

1. **Monitor Logs**: Regularly check `security_events_log` for abuse patterns
2. **Adjust Limits**: Fine-tune limits based on legitimate usage patterns
3. **CAPTCHA Integration**: Implement full CAPTCHA verification (currently placeholder)
4. **IP Whitelist**: Consider whitelisting known good IPs (e.g., monitoring services)
5. **Alert on High Violations**: Set up alerts when total_blocks exceeds threshold

## Troubleshooting

### User Legitimately Blocked

If a legitimate user is blocked:

1. Check `public_api_rate_limits` for their IP:
   ```sql
   SELECT * FROM public_api_rate_limits WHERE ip_address = '<IP>';
   ```

2. Reset their rate limit:
   ```sql
   DELETE FROM public_api_rate_limits WHERE ip_address = '<IP>';
   ```

### Too Many False Positives

If legitimate traffic is being blocked:

1. Increase `maxRequests` for the affected endpoint
2. Increase `windowSeconds` to allow longer windows
3. Review `security_events_log` for patterns

### Performance Impact

Rate limiting is optimized for minimal overhead:

- Single database query per request
- Indexed lookups on `ip_address` and `endpoint`
- Automatic cleanup of expired records

## Future Enhancements

- [ ] Full reCAPTCHA/hCaptcha integration
- [ ] Distributed rate limiting for multi-region deployments
- [ ] Machine learning-based anomaly detection
- [ ] Automated IP reputation scoring
- [ ] Rate limit analytics dashboard
