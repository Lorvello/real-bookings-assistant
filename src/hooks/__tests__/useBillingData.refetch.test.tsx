import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), getSession: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner-test' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke }, auth: { getSession: mocks.getSession } },
}));

import { useBillingData } from '@/hooks/useBillingData';

describe('useBillingData refetch state', () => {
  it('exposes an in-flight refresh even while the previous response stays cached', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'fake-token' } } });
    mocks.invoke.mockResolvedValueOnce({ data: { subscribed: false, billing_history: [] }, error: null });
    let release!: (value: { data: { subscribed: boolean; billing_history: never[] }; error: null }) => void;
    mocks.invoke.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useBillingData(), { wrapper });

    await waitFor(() => expect(result.current.billingData?.subscribed).toBe(false));
    act(() => { void result.current.refetch(); });
    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.billingData?.subscribed).toBe(false);
    await act(async () => { release({ data: { subscribed: true, billing_history: [] }, error: null }); });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.billingData?.subscribed).toBe(true);
  });
});
