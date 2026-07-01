// FQ-A-PAY two-layer proof (Full Product QA loop). The payment-settings toggles
// (secure payments, payment required, pay-on-site/timing, payment optional, auto-cancel)
// paint OPTIMISTICALLY for instant UI feedback. Before the fix, a FAILED save left the
// money-relevant toggle visually stuck in the wrong ON/OFF state, disagreeing with the
// DB: the owner believed secure-payments / payment-required was on when the row said off.
//
// This test mounts the REAL usePaymentSettings hook and FORCES the save mutation to fail
// (the supabase upsert rejects, as it would on a network / RLS / permission failure). It
// asserts: (1) on failure the optimistic toggle REVERTS to the true server-confirmed value
// and a DESTRUCTIVE (announced) error toast fires; (2) on a successful save the new value
// is reflected and confirmed. The destructive toast is a role=status live region so the
// failure is announced to assistive tech, not silent.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Controllable supabase double. `upsertBehavior` is flipped per-test to simulate a
// successful save vs a backend failure. fetch (select.maybeSingle) seeds the initial
// server-confirmed row so the hook has a real "truth" to revert to.
const toastSpy = vi.fn();
let upsertShouldFail = false;
// FQ-A-PAY-N1: per-payload failure predicate, so a test can make ONE sibling save in a
// Promise.all fail while the others succeed. When set it overrides `upsertShouldFail`.
let upsertFailPredicate: ((payload: Record<string, unknown>) => boolean) | null = null;
let confirmedRow: Record<string, unknown>;

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'ps-1',
  calendar_id: 'cal-1',
  secure_payments_enabled: true,
  payment_required_for_booking: true,
  payment_optional: false,
  enabled_payment_methods: ['ideal'],
  allowed_payment_timing: ['pay_now'],
  payout_option: 'standard',
  auto_cancel_unpaid_bookings: false,
  refund_policy_text: '',
  payment_deadline_hours: 24,
  ...overrides,
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: confirmedRow, error: null }),
        }),
      }),
      upsert: (payload: Record<string, unknown>) => ({
        select: () => ({
          single: () => {
            const fails = upsertFailPredicate ? upsertFailPredicate(payload) : upsertShouldFail;
            return fails
              ? Promise.resolve({ data: null, error: { message: 'permission denied for table payment_settings' } })
              : Promise.resolve({ data: { ...confirmedRow, ...payload }, error: null });
          },
        }),
      }),
    }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));
vi.mock('@/utils/stripeConfig', () => ({ isTestMode: () => true }));
// Mimic i18next interpolation of {{var}} so the named-error-toast test (FQ-A-PAY-copy)
// exercises the real description string the owner sees, not a raw template.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, d: string, opts?: Record<string, unknown>) =>
      opts ? d.replace(/\{\{(\w+)\}\}/g, (_m, name) => String(opts[name] ?? `{{${name}}}`)) : d,
  }),
}));

import { usePaymentSettings } from '@/hooks/usePaymentSettings';

describe('FQ-A-PAY: optimistic payment toggles revert on a failed save', () => {
  beforeEach(() => {
    toastSpy.mockClear();
    upsertShouldFail = false;
    upsertFailPredicate = null;
    confirmedRow = makeRow(); // secure_payments_enabled = true is the DB truth
  });

  const mountReady = async () => {
    const view = renderHook(() => usePaymentSettings('cal-1'));
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    await waitFor(() => expect(view.result.current.settings?.secure_payments_enabled).toBe(true));
    return view;
  };

  it('reverts toggleSecurePayments to the true DB value when the save fails, and announces it', async () => {
    const { result } = await mountReady();
    upsertShouldFail = true;

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.toggleSecurePayments(false);
    });

    // The save reported failure to the caller.
    expect(returned).toBe(false);
    // CRITICAL: the toggle reverted to the true server value (still ON), not the wrong OFF.
    expect(result.current.settings?.secure_payments_enabled).toBe(true);
    // The failure was announced via a destructive toast (role=status live region).
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('reverts togglePaymentRequired on failure (money-relevant: required vs optional)', async () => {
    const { result } = await mountReady();
    expect(result.current.settings?.payment_required_for_booking).toBe(true);
    upsertShouldFail = true;

    await act(async () => {
      await result.current.togglePaymentRequired(false);
    });

    expect(result.current.settings?.payment_required_for_booking).toBe(true); // reverted
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('reverts updateAllowedPaymentTiming (pay-on-site) on failure', async () => {
    const { result } = await mountReady();
    expect(result.current.settings?.allowed_payment_timing).toEqual(['pay_now']);
    upsertShouldFail = true;

    await act(async () => {
      await result.current.updateAllowedPaymentTiming(['pay_now', 'pay_on_site']);
    });

    expect(result.current.settings?.allowed_payment_timing).toEqual(['pay_now']); // reverted
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('reverts togglePaymentOptional on failure', async () => {
    const { result } = await mountReady();
    expect(result.current.settings?.payment_optional).toBe(false);
    upsertShouldFail = true;

    await act(async () => {
      await result.current.togglePaymentOptional(true);
    });

    expect(result.current.settings?.payment_optional).toBe(false); // reverted
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('HAPPY PATH: a successful save persists the new value and confirms it', async () => {
    const { result } = await mountReady();
    upsertShouldFail = false;

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.toggleSecurePayments(false);
    });

    expect(returned).toBe(true);
    // The new value is reflected (cascade also resets required/optional coherently).
    expect(result.current.settings?.secure_payments_enabled).toBe(false);
    expect(result.current.settings?.payment_required_for_booking).toBe(true);
    expect(result.current.settings?.payment_optional).toBe(false);
    // Success toast (not destructive).
    expect(toastSpy).toHaveBeenCalledWith(expect.not.objectContaining({ variant: 'destructive' }));
  });

  it('a successful save then a failed save reverts to the SUCCESS value, not the original', async () => {
    const { result } = await mountReady();

    // First: flip required -> false successfully. New confirmed truth = false.
    upsertShouldFail = false;
    await act(async () => {
      await result.current.togglePaymentRequired(false);
    });
    expect(result.current.settings?.payment_required_for_booking).toBe(false);

    // Then: a failed flip back to true must revert to the last CONFIRMED value (false),
    // proving the revert tracks server truth across saves, not a one-shot initial snapshot.
    upsertShouldFail = true;
    await act(async () => {
      await result.current.togglePaymentRequired(true);
    });
    expect(result.current.settings?.payment_required_for_booking).toBe(false); // reverted to confirmed
  });

  // FQ-A-PAY-copy: the error toast must NAME the specific money setting that failed,
  // because the control reverts silently so the toast is the owner's only signal.
  it('names the failed setting in the error toast description', async () => {
    const { result } = await mountReady();
    upsertShouldFail = true;

    await act(async () => {
      await result.current.togglePaymentRequired(false);
    });

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        description: expect.stringContaining('Payment required to book'),
      }),
    );
  });

  // FQ-A-PAY-N1: two toggles fire together in one Promise.all (as the real
  // handleTogglePaymentOptional / handleTogglePayOnSite do). The SUCCEEDING sibling
  // commits and advances confirmedSettings.current; the FAILING sibling must revert to
  // that latest committed truth, NOT to a stale call-time snapshot, so it never rolls
  // the successful sibling back locally.
  it('a failing sibling in a Promise.all reverts to committed truth without clobbering the successful sibling', async () => {
    const { result } = await mountReady();
    // Start: required = true, optional = false.
    expect(result.current.settings?.payment_required_for_booking).toBe(true);
    expect(result.current.settings?.payment_optional).toBe(false);

    // payment_optional save SUCCEEDS; payment_required save FAILS, in the same tick.
    upsertFailPredicate = (payload) => 'payment_required_for_booking' in payload;

    await act(async () => {
      await Promise.all([
        result.current.togglePaymentOptional(true),   // succeeds -> optional becomes true (committed)
        result.current.togglePaymentRequired(false),  // fails -> must revert to committed truth
      ]);
    });

    // The successful sibling's committed value is preserved locally (not clobbered).
    expect(result.current.settings?.payment_optional).toBe(true);
    // The failed sibling reverted to the last CONFIRMED required value (still true).
    expect(result.current.settings?.payment_required_for_booking).toBe(true);
    // The failure was announced.
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
