import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'owner-1' } as { id: string } | null,
  single: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: mocks.single }),
      }),
    }),
  },
}));

import { useAccountRole } from '@/hooks/useAccountRole';

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('useAccountRole query failures', () => {
  beforeEach(() => {
    mocks.user = { id: 'owner-1' };
    mocks.single.mockReset();
  });

  it('stops loading on query error and retries to a resolved owner state', async () => {
    mocks.single
      .mockResolvedValueOnce({ data: null, error: { message: 'role lookup failed' } })
      .mockResolvedValueOnce({ data: { account_owner_id: null }, error: null });

    const { result } = renderHook(() => useAccountRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toEqual(expect.objectContaining({ message: 'role lookup failed' }));
    expect(result.current.isAccountOwner).toBe(false);

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.isAccountOwner).toBe(true));
    expect(result.current.accountOwnerId).toBe('owner-1');
    expect(result.current.error).toBeNull();
  });

  it('does not load or error when there is no authenticated user', () => {
    mocks.user = null;
    const { result } = renderHook(() => useAccountRole(), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mocks.single).not.toHaveBeenCalled();
  });
});
