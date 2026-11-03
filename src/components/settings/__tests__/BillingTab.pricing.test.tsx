import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => ({ isAccountOwner: true, accountOwnerId: 'owner-1', loading: false, error: null }) }));
vi.mock('@/hooks/useBillingData', () => ({ useBillingData: () => ({ billingData: null, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useSubscriptionTiers', () => ({
  useSubscriptionTiers: () => ({ isLoading: false, tiers: [
    { id: 'starter', tier_name: 'starter', display_name: 'Starter', price_monthly: 30, price_yearly: 288, description: 'Starter' },
    { id: 'enterprise', tier_name: 'enterprise', display_name: 'Enterprise', price_monthly: 300, price_yearly: 3600, description: 'Enterprise' },
  ] }),
}));
vi.mock('@/contexts/UserStatusContext', () => ({ useUserStatus: () => ({ userStatus: { userType: 'trial', daysRemaining: 30, isSubscriber: false } }) }));
vi.mock('@/contexts/SettingsContext', () => ({ useSettingsContext: () => ({ profileData: { subscription_tier: 'starter' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() }, auth: { getSession: vi.fn() } } }));
vi.mock('@/utils/stripeConfig', () => ({ getStripeConfig: () => ({ mode: 'test' }), isTestMode: () => true, getPriceId: () => null }));
vi.mock('@/components/EnterpriseContactForm', () => ({ EnterpriseContactForm: () => null }));
vi.mock('@/components/ui/UsageSummary', () => ({ UsageSummary: () => null }));
vi.mock('@/components/settings/billing/CurrentPlanSection', () => ({ CurrentPlanSection: () => null }));
vi.mock('@/components/settings/billing/BillingHistorySection', () => ({ BillingHistorySection: () => null }));

import { BillingTab } from '@/components/settings/BillingTab';

describe('BillingTab Enterprise price display', () => {
  it('shows a custom price without a monthly suffix and preserves the Starter price', () => {
    render(<BillingTab />);

    const customPrice = screen.getByText('Custom pricing');
    expect(customPrice).toBeInTheDocument();
    expect(customPrice.parentElement).not.toHaveTextContent('/month');
    expect(screen.queryByText(/Starting at €300/i)).not.toBeInTheDocument();
    expect(screen.getByText('€30').parentElement).toHaveTextContent('/month');
  });
});
