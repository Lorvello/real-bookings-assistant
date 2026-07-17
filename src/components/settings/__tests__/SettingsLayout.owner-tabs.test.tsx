import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  role: {
    isAccountOwner: false,
    accountOwnerId: 'owner-1',
    loading: false,
    error: null as Error | null,
    retry: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => mocks.role }));
vi.mock('@/contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSettingsContext: () => ({
    profileData: { id: 'profile-1' },
    loadError: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/contexts/UserStatusContext', () => ({
  useUserStatus: () => ({ userStatus: { isSetupIncomplete: false } }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/settings/ProfileTab', () => ({ ProfileTab: () => <div>users content</div> }));
vi.mock('@/components/settings/AIKnowledgeTab', () => ({ AIKnowledgeTab: () => <div>knowledge content</div> }));
vi.mock('@/components/settings/CalendarTab', () => ({ CalendarTab: () => <div>operations content</div> }));
vi.mock('@/components/settings/ServicesTab', () => ({ ServicesTab: () => <div>services content</div> }));
vi.mock('@/components/settings/PaymentSettingsTab', () => ({
  PaymentSettingsTab: () => {
    if (mocks.role.error) {
      return (
        <div role="alert">
          We could not verify account ownership.
          <button type="button" onClick={mocks.role.retry}>Try again</button>
        </div>
      );
    }
    mocks.invoke('payment-settings-mounted');
    return <div>payments content</div>;
  },
}));
vi.mock('@/components/settings/BillingTab', () => ({
  BillingTab: () => {
    mocks.invoke('billing-mounted');
    return <div>billing content</div>;
  },
}));

import { SettingsTabs } from '@/components/settings/SettingsLayout';

describe('owner-only settings tabs', () => {
  beforeEach(() => {
    mocks.invoke.mockClear();
    mocks.role = {
      isAccountOwner: false,
      accountOwnerId: 'owner-1',
      loading: false,
      error: null,
      retry: vi.fn(),
    };
  });

  it.each([
    ['editor', 'payments'],
    ['editor', 'billing'],
    ['viewer', 'payments'],
    ['viewer', 'billing'],
  ])('hides owner tabs and mounts no owner content for %s requesting %s', async (_role, tab) => {
    render(
      <MemoryRouter initialEntries={[`/settings?tab=${tab}`]}>
        <SettingsTabs />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.queryByRole('tab', { name: /pay & book|billing/i })).not.toBeInTheDocument());
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('keeps a requested payment role error recoverable without mounting owner content', async () => {
    const retry = vi.fn();
    mocks.role = {
      ...mocks.role,
      error: new Error('role lookup failed'),
      retry,
    };

    render(
      <MemoryRouter initialEntries={['/settings?tab=payments']}>
        <SettingsTabs />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not verify account ownership/i);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('shows and mounts a requested owner tab after ownership is confirmed', async () => {
    mocks.role = {
      ...mocks.role,
      isAccountOwner: true,
      accountOwnerId: 'owner-1',
    };

    render(
      <MemoryRouter initialEntries={['/settings?tab=payments']}>
        <SettingsTabs />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('tab', { name: /pay & book/i })).toBeInTheDocument();
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('payment-settings-mounted'));
  });
});
