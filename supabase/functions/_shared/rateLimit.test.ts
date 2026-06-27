// F-005 part (a): prove a WRITE FAILURE in the rate limiter is no longer silently
// swallowed. A forced upsert error must (1) be surfaced to security_events_log,
// and (2) change posture deliberately: fail-CLOSED on the exceeded path (still
// denied), alert-and-ALLOW on the normal counter path (booking availability).
//
// Run: deno test supabase/functions/_shared/rateLimit.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { RateLimiter } from './rateLimit.ts';

type Captured = { table: string; op: string; payload: unknown };

// A minimal mock Supabase client. `failUpsert` makes every .upsert() return an
// error (simulating an RLS denial / column drift / transient write outage). The
// security_events_log insert is captured so we can assert the failure was logged.
function makeMock(opts: { failUpsert: boolean; existing?: Record<string, unknown> | null }) {
  const captured: Captured[] = [];
  const securityLog: unknown[] = [];

  function from(table: string) {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = chain;
    builder.eq = chain;
    builder.single = () => {
      if (table === 'blocked_ips') return Promise.resolve({ data: null, error: null });
      if (table === 'public_api_rate_limits') return Promise.resolve({ data: opts.existing ?? null, error: null });
      return Promise.resolve({ data: null, error: null });
    };
    builder.upsert = (payload: unknown) => {
      captured.push({ table, op: 'upsert', payload });
      return Promise.resolve(
        opts.failUpsert
          ? { data: null, error: { message: 'simulated write failure', code: '42P10' } }
          : { data: payload, error: null }
      );
    };
    builder.insert = (payload: unknown) => {
      if (table === 'security_events_log') securityLog.push(payload);
      return Promise.resolve({ data: payload, error: null });
    };
    return builder;
  }

  return { client: { from } as unknown, captured, securityLog };
}

const cfg = {
  endpoint: 'booking_creation',
  maxRequests: 5,
  windowSeconds: 60,
  blockDurationSeconds: 300,
  enableCaptchaThreshold: 3,
};

Deno.test('F-005 (a): exceeded-path write failure is fail-CLOSED + surfaced', async () => {
  // existing row already at the limit so the next request EXCEEDS and tries to write a block.
  const existing = {
    request_count: 5,
    window_start: new Date().toISOString(),
    total_blocks: 0,
    blocked_until: null,
  };
  const mock = makeMock({ failUpsert: true, existing });
  // deno-lint-ignore no-explicit-any
  const limiter = new RateLimiter(mock.client as any, cfg);
  const res = await limiter.checkLimit('1.2.3.4', 'http://x/create-booking');

  // posture: STILL denied even though the block-write failed (no abuser slips through)
  assertEquals(res.allowed, false, 'exceeded path must stay DENIED on write failure (fail-closed)');
  // surfaced: a block_write_failed event was logged to security_events_log
  const logged = mock.securityLog.filter((e) => (e as { event_type: string }).event_type === 'block_write_failed');
  assertEquals(logged.length, 1, 'write failure must be logged to security_events_log');
  assertEquals((logged[0] as { severity: string }).severity, 'critical');
});

Deno.test('F-005 (a): normal-path write failure is alert-and-ALLOW + surfaced', async () => {
  // no existing row -> first request, well under the limit, writes the counter.
  const mock = makeMock({ failUpsert: true, existing: null });
  // deno-lint-ignore no-explicit-any
  const limiter = new RateLimiter(mock.client as any, cfg);
  const res = await limiter.checkLimit('5.6.7.8', 'http://x/create-booking');

  // posture: ALLOWED (a transient counter-write blip must not block a legit booking)
  assertEquals(res.allowed, true, 'normal path must stay ALLOWED on write failure (availability)');
  // surfaced: a count_write_failed event was logged (never silently swallowed)
  const logged = mock.securityLog.filter((e) => (e as { event_type: string }).event_type === 'count_write_failed');
  assertEquals(logged.length, 1, 'counter write failure must be logged to security_events_log');
  assertEquals((logged[0] as { severity: string }).severity, 'critical');
});

Deno.test('F-005 (b): read and write use the SAME slug key (empty string, never null)', async () => {
  const mock = makeMock({ failUpsert: false, existing: null });
  // deno-lint-ignore no-explicit-any
  const limiter = new RateLimiter(mock.client as any, cfg);
  // call with NO identifier -> historically read used '' but write used null (mismatch)
  await limiter.checkLimit('9.9.9.9', undefined);
  const upsert = mock.captured.find((c) => c.op === 'upsert');
  const slug = (upsert?.payload as { calendar_slug: unknown }).calendar_slug;
  assertEquals(slug, '', 'write must persist the empty-string key, never null, matching the read');
});

Deno.test('F-005: happy path with a working write still ALLOWS and writes once', async () => {
  const mock = makeMock({ failUpsert: false, existing: null });
  // deno-lint-ignore no-explicit-any
  const limiter = new RateLimiter(mock.client as any, cfg);
  const res = await limiter.checkLimit('10.0.0.1', 'http://x/create-booking');
  assertEquals(res.allowed, true);
  assertEquals(mock.captured.filter((c) => c.op === 'upsert').length, 1, 'exactly one counter write');
  assertEquals(mock.securityLog.length, 0, 'no failure events on the clean happy path');
});
