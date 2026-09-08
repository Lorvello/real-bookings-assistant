import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  getSession: vi.fn(),
  invalidateCache: vi.fn(),
  refetchProfile: vi.fn(),
  toast: vi.fn(),
  unstableCallbacks: false,
  userId: 'owner-a' as string | null,
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.userId ? { id: mocks.userId } : null, loading: false }) }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

vi.mock('@/contexts/UserStatusContext', () => ({
  useUserStatus: () => ({ invalidateCache: mocks.unstableCallbacks ? (...args: unknown[]) => mocks.invalidateCache(...args) : mocks.invalidateCache }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ refetch: mocks.unstableCallbacks ? () => mocks.refetchProfile() : mocks.refetchProfile }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, defaultValue?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
      const fallback = typeof defaultValue === 'string' ? defaultValue : _key;
      const values = options ?? (typeof defaultValue === 'object' ? defaultValue : {});
      return fallback.replace(/\{\{(\w+)\}\}/g, (_match, name) => String(values[name] ?? `{{${name}}}`));
    },
  }),
}));

import Success from '@/pages/Success';

const renderSuccess = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Success />
    </MemoryRouter>,
  );

describe('subscription checkout verification state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unstableCallbacks = false; mocks.userId = 'owner-a';
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token', user: { id: 'owner-a' } } },
      error: null,
    });
    mocks.refetchProfile.mockResolvedValue(undefined);
    mocks.invalidateCache.mockResolvedValue(undefined);
  });

  it('requires session_id, invokes nothing, and renders an explicit error instead of success', async () => {
    renderSuccess('/success');

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify/i);
    expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('keeps a visible verifying state while the checkout-session verification is pending', () => {
    mocks.invoke.mockReturnValue(new Promise(() => undefined));
    renderSuccess('/success?session_id=cs_test_pending');

    expect(screen.getByRole('status')).toHaveTextContent(/verifying subscription/i);
    expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
  });

  it('ties verification to the exact session_id and shows success only after a paid subscription result', async () => {
    mocks.refetchProfile.mockReturnValue(new Promise(() => undefined));
    mocks.invoke.mockResolvedValue({
      data: {
        success: true,
        subscribed: true,
        subscription_tier: 'professional',
        payment_status: 'paid',
      },
      error: null,
    });

    renderSuccess('/success?session_id=cs_test_verified');

    expect(await screen.findByText('Payment Successful!')).toBeInTheDocument();
    expect(screen.getByText(/Professional subscription has been successfully activated/i)).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith('check-subscription-by-session', {
      body: { session_id: 'cs_test_verified' },
      headers: { Authorization: 'Bearer test-access-token' },
    });
  });

  it('does not show success for an unconfirmed payment result without an invoke error', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        success: true,
        subscribed: true,
        subscription_tier: 'professional',
        payment_status: 'unpaid',
      },
      error: null,
    });

    renderSuccess('/success?session_id=cs_test_unpaid');

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify/i);
    expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
  });

  it('renders an error and never success when session verification fails', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: false, error: 'Payment not completed' },
      error: new Error('Payment not completed'),
    });

    renderSuccess('/success?session_id=cs_test_failed');

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not verify/i));
    expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
  });
});

const paid = { data: { success: true, subscribed: true, subscription_tier: 'professional', payment_status: 'paid' }, error: null };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function ProfileEventPage() {
  const [, setVersion] = useState(0);
  useEffect(() => { const onUpdate = () => setVersion(v => v + 1); window.addEventListener('ba:profile-updated', onUpdate); return () => window.removeEventListener('ba:profile-updated', onUpdate); }, []);
  const navigate = useNavigate();
  const location = useLocation();
  return <><output data-testid="current-path">{location.pathname}</output><button onClick={() => navigate('/success?session_id=cs_new')}>Change session</button><Success /></>;
}
describe('checkout verification lifetime', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.unstableCallbacks = false; mocks.userId = 'owner-a';
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'test-access-token', user: { id: 'owner-a' } } }, error: null });
    mocks.invalidateCache.mockResolvedValue(undefined); mocks.refetchProfile.mockResolvedValue(undefined);
  });
  it('profile event with fresh callback identities does not reverify or reset countdown', async () => {
    vi.useFakeTimers();
    try {
      mocks.unstableCallbacks = true;
      // A second invocation stays pending so a broken implementation is bounded.
      mocks.invoke.mockImplementationOnce(async () => paid).mockImplementation(() => new Promise(() => undefined));
      mocks.refetchProfile.mockImplementation(async () => { window.dispatchEvent(new Event('ba:profile-updated')); });
      render(<MemoryRouter initialEntries={['/success?session_id=cs_original']}><ProfileEventPage /></MemoryRouter>);
      await act(async () => { await Promise.resolve(); });
      expect(mocks.invoke).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(screen.getByText('Automatic redirect in 4 seconds...')).toBeInTheDocument();
      act(() => window.dispatchEvent(new Event('ba:profile-updated')));
      expect(mocks.invoke).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Automatic redirect in 4 seconds...')).toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });
  it('a new session verifies once and ignores the previous pending response and refreshes', async () => {
    const old = deferred<typeof paid>(); mocks.invoke.mockReturnValueOnce(old.promise).mockResolvedValueOnce(paid);
    render(<MemoryRouter initialEntries={['/success?session_id=cs_old']}><ProfileEventPage /></MemoryRouter>);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Change session'));
    expect(await screen.findByText('Payment Successful!')).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenLastCalledWith('check-subscription-by-session', { body: { session_id: 'cs_new' }, headers: { Authorization: 'Bearer test-access-token' } });
    await act(async () => { old.resolve(paid); });
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.refetchProfile).toHaveBeenCalledTimes(1);
    expect(mocks.invalidateCache).toHaveBeenCalledTimes(1);
  });
  it('unmount before verification finishes suppresses cache refresh', async () => {
    const pending = deferred<typeof paid>(); mocks.invoke.mockReturnValue(pending.promise);
    const view = renderSuccess('/success?session_id=cs_unmount');
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1)); view.unmount();
    await act(async () => { pending.resolve(paid); });
    expect(mocks.refetchProfile).not.toHaveBeenCalled(); expect(mocks.invalidateCache).not.toHaveBeenCalled();
  });
  it('explicit retry starts a new verification after failure', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('temporary') }).mockResolvedValueOnce(paid);
    renderSuccess('/success?session_id=cs_retry');
    fireEvent.click(await screen.findByText('Try again'));
    expect(await screen.findByText('Payment Successful!')).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });
  it('refuses an auth session whose user differs from the active account', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'wrong-account-token', user: { id: 'owner-b' } } }, error: null });
    renderSuccess('/success?session_id=cs_mismatch');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled(); expect(mocks.invalidateCache).not.toHaveBeenCalled();
  });
  it('account switch hides prior success and cancels its redirect timer', async () => {
    vi.useFakeTimers();
    try {
      mocks.invoke.mockResolvedValueOnce(paid).mockReturnValue(new Promise(() => undefined));
      const page = () => <MemoryRouter initialEntries={['/success?session_id=cs_owner_a']}><ProfileEventPage /></MemoryRouter>;
      const view = render(page()); await act(async () => { await Promise.resolve(); });
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
      mocks.userId = 'owner-b'; mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'token-b', user: { id: 'owner-b' } } }, error: null });
      view.rerender(page()); expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
      await act(async () => { vi.advanceTimersByTime(6000); });
      expect(screen.getByTestId('current-path')).toHaveTextContent('/success');
      expect(mocks.invalidateCache).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });
  it('logout with a pending response never publishes success or refreshes', async () => {
    const pending = deferred<typeof paid>(); mocks.invoke.mockReturnValue(pending.promise);
    const page = () => <MemoryRouter initialEntries={['/success?session_id=cs_logout']}><Success /></MemoryRouter>;
    const view = render(page()); await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    mocks.userId = null; view.rerender(page()); await act(async () => pending.resolve(paid));
    expect(screen.queryByText('Payment Successful!')).not.toBeInTheDocument();
    expect(mocks.invalidateCache).not.toHaveBeenCalled(); expect(mocks.refetchProfile).not.toHaveBeenCalled();
  });

});
