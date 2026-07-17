import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatCSPForMeta, SecurityHeaders } from './securityHeaders';

const requiredStripeDirectives: Record<string, string[]> = {
  'script-src': [
    'https://checkout.stripe.com',
    'https://connect-js.stripe.com',
    'https://js.stripe.com',
    'https://*.js.stripe.com',
  ],
  'connect-src': [
    'https://checkout.stripe.com',
    'https://api.stripe.com',
  ],
  'frame-src': [
    'https://checkout.stripe.com',
    'https://connect-js.stripe.com',
    'https://js.stripe.com',
    'https://*.js.stripe.com',
    'https://hooks.stripe.com',
  ],
};

describe('production security headers', () => {
  it('permits the exact launch-visible Stripe and Voiceflow transports', () => {
    for (const [directive, origins] of Object.entries(requiredStripeDirectives)) {
      const value = SecurityHeaders.CSP[directive as keyof typeof SecurityHeaders.CSP];
      for (const origin of origins) expect(value).toContain(origin);
    }

    expect(SecurityHeaders.CSP['script-src']).toContain('https://cdn.voiceflow.com');
    expect(SecurityHeaders.CSP['connect-src']).toContain('https://general-runtime.voiceflow.com');
    expect(SecurityHeaders.CSP['connect-src']).toContain('https://runtime-api.voiceflow.com');
    expect(SecurityHeaders.CSP['frame-ancestors']).toBe("'none'");
  });

  it('keeps the Vercel CSP identical to the runtime meta policy', () => {
    const vercel = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as {
      headers: Array<{ headers: Array<{ key: string; value: string }> }>;
    };
    const headers = new Map(vercel.headers[0].headers.map(({ key, value }) => [key, value]));

    expect(headers.get('Content-Security-Policy')).toBe(formatCSPForMeta());
    for (const [key, value] of Object.entries(SecurityHeaders.SECURITY_HEADERS)) {
      expect(headers.get(key)).toBe(value);
    }
  });
});
