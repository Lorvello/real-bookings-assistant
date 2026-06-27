-- Fix the public_api_rate_limits UNIQUE index so the IP rate-limiter actually works.
--
-- BUG (found in the Launch-Ready Simulation, TRACK 0 A2, finding F-004): the shared
-- RateLimiter (supabase/functions/_shared/rateLimit.ts) upserts with
--   onConflict: 'ip_address,endpoint,calendar_slug'
-- but the only matching unique index was idx_rate_limits_ip_endpoint_unique on
-- (ip_address, endpoint) -- two columns, not three. Postgres therefore rejected every
-- upsert with `42P10: there is no unique or exclusion constraint matching the ON CONFLICT
-- specification`. That error is not surfaced by checkLimit(), so it was swallowed: the
-- table stayed permanently empty, request_count never accumulated, and the 5-requests-per-
-- minute limiter on create-booking (and the CAPTCHA escalation) NEVER tripped. Empirically
-- proven: 6 rapid create-booking calls from one IP all passed the limiter (no 429), and
-- `select count(*) from public_api_rate_limits` was 0.
--
-- The old two-column unique index was also actively wrong: it would reject a second
-- calendar_slug row for the same (ip_address, endpoint), which is not the intended
-- per-IP-per-endpoint-per-identifier bucketing the code reads/writes (both checkLimit's
-- read .eq filters and the upsert key on all three columns).
--
-- FIX: replace it with a three-column unique index matching the code's onConflict target.
-- After this, the upsert increments correctly and the limiter returns 429 + "Too many
-- requests" on the 6th request, with a post-window request accepted again.

DROP INDEX IF EXISTS public.idx_rate_limits_ip_endpoint_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint_slug_unique
  ON public.public_api_rate_limits (ip_address, endpoint, calendar_slug);
