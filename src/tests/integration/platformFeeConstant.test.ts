import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Fee-constant parity guard (council closeout action 3 / drift-note V-C3-01).
 *
 * The platform fee (1.9%) is defined in TWO genuinely different runtimes that
 * cannot share an import:
 *   - BACKEND source of truth (Deno edge fn): supabase/functions/_shared/feeCalculator.ts
 *       `const DEFAULT_PLATFORM_FEE_PERCENT = 0.019;`  (fraction; drives the real
 *       Stripe application_fee_amount on every destination charge)
 *   - UI display constant (React/Vite):       src/components/settings/PaymentSettingsTab.tsx
 *       `const platformPercentage = 1.9;`             (percent; shown to merchants
 *       in the payout fee-breakdown example)
 *
 * If these drift apart, merchants are quoted a fee that is NOT what the backend
 * actually charges (a customer-facing fee lie). There is no shared module to
 * assert against, so this test reads both source files as text and asserts the
 * two constants are numerically equal (0.019 * 100 === 1.9). Either constant
 * changing without the other will fail this test.
 */

const BACKEND_FEE_FILE = resolve(
  __dirname,
  '../../../supabase/functions/_shared/feeCalculator.ts',
);
const UI_FEE_FILE = resolve(
  __dirname,
  '../../components/settings/PaymentSettingsTab.tsx',
);

function extractNumber(filePath: string, pattern: RegExp): number {
  const src = readFileSync(filePath, 'utf8');
  const match = src.match(pattern);
  if (!match) {
    throw new Error(
      `Fee constant not found in ${filePath} using ${pattern}. ` +
        `Did the constant get renamed? Update this guard.`,
    );
  }
  return Number(match[1]);
}

describe('platform fee constant parity (UI === backend)', () => {
  const backendFraction = extractNumber(
    BACKEND_FEE_FILE,
    /DEFAULT_PLATFORM_FEE_PERCENT\s*=\s*([0-9.]+)/,
  );
  const uiPercent = extractNumber(
    UI_FEE_FILE,
    /const\s+platformPercentage\s*=\s*([0-9.]+)/,
  );

  it('both constants are sane numbers', () => {
    expect(Number.isFinite(backendFraction)).toBe(true);
    expect(Number.isFinite(uiPercent)).toBe(true);
    expect(backendFraction).toBeGreaterThan(0);
    expect(uiPercent).toBeGreaterThan(0);
  });

  it('backend fraction * 100 equals the UI percent (no fee lie)', () => {
    // 0.019 (fraction) * 100 === 1.9 (percent). Use a small epsilon for float math.
    expect(backendFraction * 100).toBeCloseTo(uiPercent, 6);
  });

  it('the platform fee is the documented 1.9%', () => {
    // Locks the current agreed value so an accidental edit on EITHER side fails here.
    expect(backendFraction).toBeCloseTo(0.019, 6);
    expect(uiPercent).toBeCloseTo(1.9, 6);
  });
});
