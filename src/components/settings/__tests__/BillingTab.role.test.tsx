import React from 'react';
import { render, screen } from '@testing-library/react';
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
  useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => mocks.role }));
vi.mock('@/hooks/useBillingData', () => ({
  useBillingData: () => {
    mocks.invoke('check-subscription');
    return { billingData: null, isLoading: true, error: null, refetch: vi.fn() };
  },
}));
vi.mock('@/hooks/useSubscriptionTiers', () => ({
  useSubscriptionTiers: () => ({ tiers: [], isLoading: true }),
}));
vi.mock('@/contexts/UserStatusContext', () => ({
  useUserStatus: () => ({
    userStatus: {
      userType: 'trial',
      daysRemaining: 30,
      isSubscriber: false,
      subscriptionEndDate: null,
    },
  }),
}));
vi.mock('@/contexts/SettingsContext', () => ({ useSettingsContext: () => ({ profileData: {} }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { BillingTab } from '@/components/settings/BillingTab';

describe('BillingTab account-role gate', () => {
  beforeEach(() => mocks.invoke.mockClear());

  it.each(['editor', 'viewer'])('invokes zero billing functions for a %s', () => {
    render(<BillingTab />);

    expect(screen.getByRole('alert')).toHaveTextContent(/only account owners/i);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
