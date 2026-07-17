import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

const authenticatedRoutes = [
  '/profile',
  '/dashboard',
  '/success',
  '/calendar',
  '/bookings',
  '/availability',
  '/conversations',
  '/whatsapp-booking-assistant',
  '/test-ai-agent',
  '/settings',
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('route authentication contract', () => {
  it.each(authenticatedRoutes)('guards %s before rendering its page', (path) => {
    const routeStart = new RegExp(
      `path=["']${escapeRegExp(path)}["']\\s+element=\\{\\s*<ProtectedRoute>`,
    );
    expect(source).toMatch(routeStart);
  });

  it('keeps the Stripe redirect route account-owner-only', () => {
    expect(source).toMatch(
      /path=["']\/stripe\/go["']\s+element=\{\s*<ProtectedRoute requireAccountOwner>/,
    );
  });

  it('keeps the security console developer-only', () => {
    expect(source).toMatch(
      /path=["']\/admin\/security["']\s+element=\{\s*<ProtectedRoute requireDeveloper>/,
    );
  });

  it.each(['/book/:slug', '/team-invite', '/payment-success', '/payment-cancelled'])(
    'keeps the intentional customer/public route %s registered',
    (path) => expect(source).toContain(path),
  );
});
