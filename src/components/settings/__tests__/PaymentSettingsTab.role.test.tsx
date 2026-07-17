import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  role: {
    isAccountOwner: false,
    accountOwnerId: 'owner-1',
    loading: false,
    error: null as Error | null,
    retry: vi.fn(),
  },
  invoke: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => mocks.role }));
vi.mock('@/contexts/CalendarContext', () => ({ useCalendarContext: () => ({ selectedCalendar: null }) }));
vi.mock('@/hooks/usePaymentSettings', () => ({
  usePaymentSettings: () => {
    mocks.invoke('payment-settings-load');
    return {
      settings: null,
      loading: false,
      saving: false,
      updateSettings: vi.fn(),
      toggleSecurePayments: vi.fn(),
      togglePaymentRequired: vi.fn(),
      togglePaymentOptional: vi.fn(),
      updatePaymentMethods: vi.fn(),
      updatePayoutOption: vi.fn(),
      updateAllowedPaymentTiming: vi.fn(),
    };
  },
}));
vi.mock('@/hooks/useStripeConnect', () => ({
  useStripeConnect: () => ({
    loading: false,
    getStripeAccount: vi.fn(),
    refreshAccountStatus: vi.fn(),
    createLoginLink: vi.fn(),
    createOnboardingLink: vi.fn(),
    resetStripeAccount: vi.fn(),
  }),
}));
vi.mock('@/hooks/useInstallmentSettings', () => ({
  DEFAULT_INSTALLMENT_SETTINGS: {
    enabled: false,
    defaultPlan: { type: 'preset', preset: '50_50', deposits: [] },
    allowCustomerChoice: false,
    applyToServices: 'all',
    selectedServices: [],
    serviceConfigs: {},
  },
  useInstallmentSettings: () => ({ settings: null, updateSettings: vi.fn(), ready: true }),
}));
vi.mock('@/contexts/UserStatusContext', () => ({
  useUserStatus: () => ({ accessControl: { canAccessTaxCompliance: false } }),
}));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ profile: null }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/utils/stripeConfig', () => ({
  getStripeConfig: () => ({ mode: 'test', isTestMode: true, testMode: true }),
  isTestMode: () => true,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

import { PaymentSettingsTab } from '@/components/settings/PaymentSettingsTab';

const renderTab = () =>
  render(
    <MemoryRouter>
      <PaymentSettingsTab />
    </MemoryRouter>,
  );

describe('PaymentSettingsTab account-role gate', () => {
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

  it.each(['editor', 'viewer'])('mounts no payment hook and invokes zero functions for a %s', () => {
    renderTab();

    expect(screen.getByRole('alert')).toHaveTextContent(/only account owners/i);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('shows a recoverable error instead of an endless loading state when role lookup fails', () => {
    const retry = vi.fn();
    mocks.role = { ...mocks.role, error: new Error('role lookup failed'), retry };

    renderTab();

    expect(screen.getByRole('alert')).toHaveTextContent(/could not verify account ownership/i);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
