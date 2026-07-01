// QA FIX 2 two-layer proof (Full Product QA loop, adversarial round 1).
// Each block mounts the REAL hook/component and FORCES the relevant fetch to fail, then
// asserts the code now surfaces an ERROR state instead of a silent-wrong value:
//   - FQ-STATE-LIVEOPS: a failed whatsapp_conversations fetch must throw (query -> isError),
//     NOT return a confident "0 active conversations". (Real useOptimizedLiveOperations hook.)
//   - FQ-STATE-WAUNIFIED: a failed contact-overview fetch must render the error card,
//     NOT an empty contact list. (Real WhatsAppUnifiedView.)
//   - FQ-STATE-SECAUDIT: a failed security-events fetch must render the error card + no
//     longer discard the error. (Real SecurityAuditDashboard.)
// (FQ-STATE-BILLING is proven by the ba-preview 8095 harness rendering the real error branch;
//  its guard `billingError && !billingLoading` is a pure consumer of the hook's already-exposed
//  error, verified live.)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---- controllable supabase double -------------------------------------------------------
// Per-table behavior: `failTables` marks which tables reject. Chainable builder mirrors the
// subset of the PostgREST builder the code under test uses (select/in/eq/gte/order/limit).
let failTables: Set<string>;

function makeBuilder(table: string) {
  const shouldFail = failTables.has(table);
  const result = shouldFail
    ? { data: null, error: { message: `forced ${table} failure`, code: 'PGRST500' } }
    : { data: [], error: null };
  // A thenable that also proxies the chainable builder methods. Each method returns the same
  // thenable so any call order resolves to `result` when awaited. Backed by a real Promise so
  // await semantics (microtask, catch) behave exactly like the supabase client.
  const p = Promise.resolve(result);
  const builder: any = new Proxy(p, {
    get(target, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        return (target as any)[prop].bind(target);
      }
      // select/in/eq/gte/order/limit -> return the same builder for further chaining
      return () => builder;
    },
  });
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}));

// LiveOps hook needs the mock-data control to be OFF so it hits the real fetch path.
vi.mock('@/hooks/useMockDataControl', () => ({
  useMockDataControl: () => ({ useMockData: false, isDeveloper: false, userStatus: 'active' }),
}));

// i18n: return the English default (2nd arg) so assertions read real copy.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }),
}));

import { useOptimizedLiveOperations } from '@/hooks/dashboard/useOptimizedLiveOperations';
import { WhatsAppUnifiedView } from '@/components/whatsapp/WhatsAppUnifiedView';
import { SecurityAuditDashboard } from '@/components/admin/SecurityAuditDashboard';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  failTables = new Set();
  vi.clearAllMocks();
});

describe('FQ-STATE-LIVEOPS: failed conversations fetch surfaces error, not a false 0', () => {
  it('goes to isError (throws) when whatsapp_conversations fetch fails', async () => {
    failTables = new Set(['whatsapp_conversations']); // bookings ok, conversations fail
    const { result } = renderHook(() => useOptimizedLiveOperations(['cal-1']), { wrapper: wrapper() });
    // The hook sets its own retry: 2 (overrides the client default), with retryDelay up to 10s.
    // Allow enough time for the retries to exhaust and the error to settle.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 25000 });
    // The confident-wrong path would have returned data with active_conversations_today: 0.
    expect(result.current.data).toBeUndefined();
  }, 30000);

  it('resolves normally (no error) when both fetches succeed', async () => {
    failTables = new Set();
    const { result } = renderHook(() => useOptimizedLiveOperations(['cal-1']), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });
    expect(result.current.isError).toBe(false);
    expect(result.current.data?.active_conversations_today).toBe(0); // legitimately 0 (empty), not a swallowed error
  });
});

describe('FQ-STATE-WAUNIFIED: failed contact overview renders error card, not empty list', () => {
  it('shows the error alert + Retry when the overview fetch fails', async () => {
    failTables = new Set(['whatsapp_contact_overview']);
    render(<WhatsAppUnifiedView calendarId="cal-1" />, { wrapper: wrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText("Couldn't load your conversations")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('FQ-STATE-SECAUDIT: failed security-events fetch renders error card + loading exists', () => {
  it('shows the error alert + Retry when the events fetch fails', async () => {
    failTables = new Set(['security_events_log']);
    render(<SecurityAuditDashboard />, { wrapper: wrapper() });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText("Couldn't load the security audit")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
