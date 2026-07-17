import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  getSession: vi.fn(),
  invalidateCache: vi.fn(),
  refetchProfile: vi.fn(),
  toast: vi.fn(),
}));

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
  useUserStatus: () => ({ invalidateCache: mocks.invalidateCache }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ refetch: mocks.refetchProfile }),
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
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
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
