// BUG-A (AS-1): Stripe Connect connection must persist across re-login and must
// NEVER render as "not connected" purely because the frontend Stripe mode differs
// from the stored row's `environment`.
//
// Two-layer context (see evidence/AS_AS-1.md):
//  - Layer 2 (DB, Mgmt-API): owner c5f6d8f5... has ONE persisted row,
//    environment='test', onboarding_completed=true, charges/payouts enabled.
//  - Layer 1 (this test): proves the selection + state-derivation that turns that
//    row into the rendered Stripe-account state, across a mode mismatch and a
//    simulated re-login, plus the genuine no-row empty state.
import { describe, it, expect } from 'vitest';
import {
  selectStripeAccountForMode,
  deriveStripeAccountState,
  type BusinessStripeAccount,
} from '@/types/payments';

// The persisted live-DB row (environment='test', fully onboarded) for the owner.
const TEST_ROW: BusinessStripeAccount = {
  id: 'bsa_test',
  calendar_id: 'cal_1',
  stripe_account_id: 'acct_1TlEhEQ8Q2EuDm71',
  account_status: 'active',
  onboarding_completed: true,
  charges_enabled: true,
  payouts_enabled: true,
  currency: 'eur',
  environment: 'test',
  created_at: '2026-06-22T20:43:59.158259+00:00',
  updated_at: '2026-06-22T20:43:59.158259+00:00',
};

// The OLD (buggy) read: filter rows by `.eq('environment', currentMode)` first.
function oldEnvFilteredRead(
  rows: BusinessStripeAccount[],
  currentMode: 'test' | 'live',
): BusinessStripeAccount | null {
  const scoped = rows.filter((r) => r.environment === currentMode);
  return (
    scoped.find((r) => r.onboarding_completed) ?? scoped[0] ?? null
  );
}

// State derivation is now the SHARED pure fn from src/types/payments.ts (imported
// above as deriveStripeAccountState), the same fn PaymentSettingsTab renders from,
// so this test and the component can no longer drift (FQ-2-obs). Local alias kept so
// the existing assertions read unchanged.
const deriveAccountState = deriveStripeAccountState;

describe('BUG-A: Stripe Connect persistence across re-login + mode mismatch', () => {
  it('REPRODUCES the bug: old env-filtered read hides a persisted test row when mode=live', () => {
    // The exact production scenario when VITE_STRIPE_MODE=live in Vercel.
    const found = oldEnvFilteredRead([TEST_ROW], 'live');
    expect(found).toBeNull(); // -> UI would render "not connected"
    expect(deriveAccountState(found, 'live')).toBe('none'); // the durable break
  });

  it('FIX: persisted row is surfaced (not null) under a mode mismatch (mode=live, row=test)', () => {
    const found = selectStripeAccountForMode([TEST_ROW], 'live');
    expect(found).not.toBeNull();
    expect(found?.stripe_account_id).toBe('acct_1TlEhEQ8Q2EuDm71');
    // And it renders as a precise per-environment state, NOT "not connected".
    expect(deriveAccountState(found, 'live')).toBe('other-environment');
  });

  it('happy path: matching mode (mode=test, row=test) renders complete', () => {
    const found = selectStripeAccountForMode([TEST_ROW], 'test');
    expect(found?.stripe_account_id).toBe('acct_1TlEhEQ8Q2EuDm71');
    expect(deriveAccountState(found, 'test')).toBe('complete');
  });

  it('re-login persistence: re-running selection returns the SAME connected row (no reconnect)', () => {
    // Simulate a fresh login -> re-fetch -> re-select. The DB row is unchanged.
    const firstLogin = selectStripeAccountForMode([TEST_ROW], 'test');
    const afterReLogin = selectStripeAccountForMode([{ ...TEST_ROW }], 'test');
    expect(afterReLogin?.stripe_account_id).toBe(firstLogin?.stripe_account_id);
    expect(deriveAccountState(afterReLogin, 'test')).toBe('complete');
    // And even if the env flips between logins, the connection still surfaces.
    expect(deriveAccountState(selectStripeAccountForMode([TEST_ROW], 'live'), 'live')).toBe(
      'other-environment',
    );
  });

  it('genuine empty state: an owner with NO Connect row still shows none', () => {
    expect(selectStripeAccountForMode([], 'test')).toBeNull();
    expect(deriveAccountState(null, 'test')).toBe('none');
  });

  it('prefers the current-mode completed row when BOTH a test and a live row exist', () => {
    const liveRow: BusinessStripeAccount = {
      ...TEST_ROW,
      id: 'bsa_live',
      stripe_account_id: 'acct_LIVE',
      environment: 'live',
      created_at: '2026-06-25T10:00:00+00:00',
    };
    // rows passed created_at DESC (newest first), as the query orders them.
    const rows = [liveRow, TEST_ROW];
    expect(selectStripeAccountForMode(rows, 'test')?.stripe_account_id).toBe(
      'acct_1TlEhEQ8Q2EuDm71',
    );
    expect(selectStripeAccountForMode(rows, 'live')?.stripe_account_id).toBe('acct_LIVE');
  });
});
