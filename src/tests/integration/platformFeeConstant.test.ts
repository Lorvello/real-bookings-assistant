import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Fee-constant parity guard (council closeout action 3 / drift-note V-C3-01).
 *
 * The platform fee (1.9%) is defined in TWO genuinely different runtimes that
 * cannot share an import:
 *   - BACKEND source of truth (Deno edge fn): supabase/functions/_shared/feeCalculator.ts
 *       `const PLATFORM_FEE_PERCENTAGE = 1.9;`  (percent; its derived rate drives the
 *       Stripe application_fee_amount on every destination charge)
 *   - UI display constant (React/Vite):       src/config/paymentFees.ts
 *       `BOOKING_APPLICATION_FEE_PERCENTAGE = 1.9;`
 *
 * If these drift apart, merchants are quoted a fee that is NOT what the backend
 * actually charges (a customer-facing fee lie). There is no shared module to
 * assert against, so this test reads both source files as text and asserts the
 * two percentage constants are numerically equal. Either constant
 * changing without the other will fail this test.
 */

const BACKEND_FEE_FILE = resolve(
  __dirname,
  "../../../supabase/functions/_shared/feeCalculator.ts",
);
const UI_FEE_FILE = resolve(__dirname, "../../config/paymentFees.ts");

function extractNumber(filePath: string, pattern: RegExp): number {
  const src = readFileSync(filePath, "utf8");
  const match = src.match(pattern);
  if (!match) {
    throw new Error(
      `Fee constant not found in ${filePath} using ${pattern}. ` +
        `Did the constant get renamed? Update this guard.`,
    );
  }
  return Number(match[1]);
}

describe("platform fee constant parity (UI === backend)", () => {
  const backendPercent = extractNumber(
    BACKEND_FEE_FILE,
    /PLATFORM_FEE_PERCENTAGE\s*=\s*([0-9.]+)/,
  );
  const uiPercent = extractNumber(
    UI_FEE_FILE,
    /BOOKING_APPLICATION_FEE_PERCENTAGE\s*=\s*([0-9.]+)/,
  );

  it("both constants are sane numbers", () => {
    expect(Number.isFinite(backendPercent)).toBe(true);
    expect(Number.isFinite(uiPercent)).toBe(true);
    expect(backendPercent).toBeGreaterThan(0);
    expect(uiPercent).toBeGreaterThan(0);
  });

  it("backend percent equals the UI percent (no fee lie)", () => {
    expect(backendPercent).toBeCloseTo(uiPercent, 6);
  });

  it("the platform fee is the documented 1.9%", () => {
    // Locks the current agreed value so an accidental edit on EITHER side fails here.
    expect(backendPercent).toBeCloseTo(1.9, 6);
    expect(uiPercent).toBeCloseTo(1.9, 6);
  });
});
