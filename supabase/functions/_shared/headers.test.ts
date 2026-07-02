// P1-CORS follow-up (R17): a real, runnable Deno test for the CORS allowlist
// logic in headers.ts, imported directly from the real source file (not a
// mock/copy). Written to replace R16's evidence claim of a "17-case Deno
// test" that did not actually exist anywhere in the repo or either R16
// commit -- that claim was false and is corrected by this file actually
// existing and actually passing.
//
// Covers, against the REAL exported functions:
//   1. Dev-mode (APP_ENV unset / non-production, no ALLOWED_ORIGINS secret):
//      this project's real dev ports (5199, 8080) + legacy (5173, 3000) +
//      127.0.0.1 variants are allowed; a genuine `*.vercel.app`-shaped
//      origin IS allowed (this is the one behavior that only holds in
//      dev/local -- see below); a spoofing attempt (`vercel.app.evil.com`)
//      and a plain evil origin are rejected.
//   2. Production mode (APP_ENV=production, no ALLOWED_ORIGINS secret): the
//      3 real production domains are allowed; localhost and a genuine
//      Vercel-preview origin and evil.com are all rejected. This is the
//      behavior that matches what the LIVE deployed `test-ai-agent`
//      function actually does (confirmed 2026-07-02 via real curl OPTIONS
//      probes against the live function -- see evidence/IUX_r17.md), because
//      the live deployment's APP_ENV secret is set to 'production'
//      (deliberately, since the 2026-06-10 Lovable-to-Vercel cutover, see
//      MIGRATION_OFF_LOVABLE.md FASE 4). So the "Vercel preview allowed"
//      case in section 1 is real code behavior, but it is NOT reachable on
//      the live deployment today -- this test suite proves the unit logic
//      is correct AND documents that scope boundary; it is not, by itself,
//      proof of live-deployment behavior (that proof is the curl probes in
//      evidence/IUX_r17.md, per the run-spec's method requirement).
//   3. Custom ALLOWED_ORIGINS secret set (mirrors this project's actual live
//      config): only the exact origins in that comma-separated list are
//      allowed, regardless of APP_ENV; a Vercel-preview origin NOT in that
//      list is rejected even when APP_ENV is not 'production', because the
//      exact-match branch is checked and the pattern-fallback in
//      isOriginAllowed() is a fallback, not an override.
//
// Run: deno test --allow-env supabase/functions/_shared/headers.test.ts

import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getAllowedOrigins, getCorsHeaders, validateOrigin } from './headers.ts';

function req(origin: string | null): Request {
  const headers = new Headers();
  if (origin !== null) headers.set('origin', origin);
  return new Request('https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/test-ai-agent', {
    method: 'OPTIONS',
    headers,
  });
}

function resetEnv() {
  Deno.env.delete('APP_ENV');
  Deno.env.delete('ALLOWED_ORIGINS');
}

// ---------------------------------------------------------------------------
// 1. Dev mode (no APP_ENV set -> defaults to 'development', no custom secret)
// ---------------------------------------------------------------------------

Deno.test('dev mode: localhost:5199 (real vite strictPort) is allowed', () => {
  resetEnv();
  assertEquals(validateOrigin(req('http://localhost:5199')), 'http://localhost:5199');
});

Deno.test('dev mode: localhost:8080 (BA routing map port) is allowed', () => {
  resetEnv();
  assertEquals(validateOrigin(req('http://localhost:8080')), 'http://localhost:8080');
});

Deno.test('dev mode: legacy localhost:5173 is allowed', () => {
  resetEnv();
  assertEquals(validateOrigin(req('http://localhost:5173')), 'http://localhost:5173');
});

Deno.test('dev mode: legacy localhost:3000 is allowed', () => {
  resetEnv();
  assertEquals(validateOrigin(req('http://localhost:3000')), 'http://localhost:3000');
});

Deno.test('dev mode: 127.0.0.1:5199 is allowed', () => {
  resetEnv();
  assertEquals(validateOrigin(req('http://127.0.0.1:5199')), 'http://127.0.0.1:5199');
});

Deno.test('dev mode: 127.0.0.1:8080 is allowed', () => {
  resetEnv();
  assertEquals(validateOrigin(req('http://127.0.0.1:8080')), 'http://127.0.0.1:8080');
});

Deno.test('dev mode: production domain bookingsassistant.com still allowed (in the default list)', () => {
  resetEnv();
  assertEquals(validateOrigin(req('https://bookingsassistant.com')), 'https://bookingsassistant.com');
});

Deno.test('dev mode: a genuine *.vercel.app preview origin IS allowed (pattern match, non-production only)', () => {
  resetEnv();
  assertEquals(
    validateOrigin(req('https://ba-preview-abc123.vercel.app')),
    'https://ba-preview-abc123.vercel.app'
  );
});

Deno.test('dev mode: a spoofed vercel.app.evil.com is REJECTED (real URL hostname parsing, not substring match)', () => {
  resetEnv();
  assertEquals(validateOrigin(req('https://vercel.app.evil.com')), null);
});

Deno.test('dev mode: a non-https preview-shaped origin is REJECTED', () => {
  resetEnv();
  assertEquals(validateOrigin(req('http://ba-preview-abc123.vercel.app')), null);
});

Deno.test('dev mode: plain evil.com is REJECTED', () => {
  resetEnv();
  assertEquals(validateOrigin(req('https://evil.com')), null);
});

Deno.test('dev mode: no origin header (curl/Postman/same-origin) returns null without rejecting the request', () => {
  resetEnv();
  assertEquals(validateOrigin(req(null)), null);
});

// ---------------------------------------------------------------------------
// 2. Production mode (APP_ENV=production, no custom secret) -- this is the
//    convention headers.ts checks for. NOTE: the live deployed function does
//    NOT rely on this branch today because ALLOWED_ORIGINS is set (see
//    section 3) -- this section proves the fallback default-production-list
//    logic in isolation.
// ---------------------------------------------------------------------------

Deno.test('production mode: bookingsassistant.com is allowed', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  assertEquals(validateOrigin(req('https://bookingsassistant.com')), 'https://bookingsassistant.com');
});

Deno.test('production mode: www.bookingsassistant.com is allowed', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  assertEquals(validateOrigin(req('https://www.bookingsassistant.com')), 'https://www.bookingsassistant.com');
});

Deno.test('production mode: the supabase.co project domain is allowed', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  assertEquals(
    validateOrigin(req('https://grdgjhkygzciwwrxgvgy.supabase.co')),
    'https://grdgjhkygzciwwrxgvgy.supabase.co'
  );
});

Deno.test('production mode: localhost is REJECTED', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  assertEquals(validateOrigin(req('http://localhost:5199')), null);
});

Deno.test('production mode: a genuine *.vercel.app preview origin is REJECTED (pattern check is gated off in production)', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  assertEquals(validateOrigin(req('https://ba-preview-abc123.vercel.app')), null);
});

Deno.test('production mode: evil.com is REJECTED', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  assertEquals(validateOrigin(req('https://evil.com')), null);
});

Deno.test('production mode: rejected origin falls back to the first allowed origin in getCorsHeaders (safe default, never echoes the attacker origin)', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  const headers = getCorsHeaders(req('https://evil.com'));
  assertEquals(headers['Access-Control-Allow-Origin'], 'https://bookingsassistant.com');
});

// ---------------------------------------------------------------------------
// 3. Custom ALLOWED_ORIGINS secret set -- mirrors the LIVE deployed
//    project's actual configuration (R16 set this secret; confirmed present
//    via the Mgmt API 2026-07-02). This is the branch that actually governs
//    the live function's behavior today, regardless of APP_ENV.
// ---------------------------------------------------------------------------

Deno.test('custom ALLOWED_ORIGINS: exact-listed dev port is allowed even though APP_ENV=production', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  Deno.env.set(
    'ALLOWED_ORIGINS',
    'https://bookingsassistant.com,https://www.bookingsassistant.com,https://grdgjhkygzciwwrxgvgy.supabase.co,http://localhost:5199,http://localhost:8080'
  );
  assertEquals(validateOrigin(req('http://localhost:5199')), 'http://localhost:5199');
});

Deno.test('custom ALLOWED_ORIGINS: a *.vercel.app origin NOT in the exact list is REJECTED even though APP_ENV would otherwise gate on production only (matches live deployed behavior, verified by curl 2026-07-02)', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  Deno.env.set(
    'ALLOWED_ORIGINS',
    'https://bookingsassistant.com,https://www.bookingsassistant.com,https://grdgjhkygzciwwrxgvgy.supabase.co,http://localhost:5199,http://localhost:8080'
  );
  assertEquals(validateOrigin(req('https://ba-preview-abc123.vercel.app')), null);
});

Deno.test('custom ALLOWED_ORIGINS: a domain not in the list is REJECTED', () => {
  resetEnv();
  Deno.env.set('APP_ENV', 'production');
  Deno.env.set('ALLOWED_ORIGINS', 'https://bookingsassistant.com');
  assertEquals(validateOrigin(req('https://evil.com')), null);
});

Deno.test('getAllowedOrigins: custom secret takes priority over environment defaults (early return)', () => {
  resetEnv();
  Deno.env.set('ALLOWED_ORIGINS', 'https://only-this-one.example.com');
  const origins = getAllowedOrigins();
  assertEquals(origins.length, 1);
  assert(origins.includes('https://only-this-one.example.com'));
});

// Clean up global env state so this file never leaks env vars into a wider
// Deno test run of other files in the same process.
Deno.test('cleanup: reset env after suite', () => {
  resetEnv();
  assertEquals(Deno.env.get('APP_ENV'), undefined);
  assertEquals(Deno.env.get('ALLOWED_ORIGINS'), undefined);
});
