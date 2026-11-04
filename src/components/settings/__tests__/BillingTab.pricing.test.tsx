import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  tiers: [
    { id: 'starter', tier_name: 'starter', display_name: 'Starter', price_monthly: 30, price_yearly: 288, description: 'Starter' },
    { id: 'enterprise', tier_name: 'enterprise', display_name: 'Enterprise', price_monthly: 300, price_yearly: 3600, description: 'Enterprise' },
  ],
  invoke: vi.fn(),
  profileTier: 'starter',
  userType: 'trial',
  billingData: null as null | { billing_cycle: 'year' | 'month' | 'yearly' | 'monthly' | null; subscribed: boolean },
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => ({ isAccountOwner: true, accountOwnerId: 'owner-1', loading: false, error: null }) }));
vi.mock('@/hooks/useBillingData', () => ({ useBillingData: () => ({ billingData: fixtures.billingData, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/hooks/useSubscriptionTiers', () => ({
  useSubscriptionTiers: () => ({ isLoading: false, tiers: fixtures.tiers }),
}));
vi.mock('@/contexts/UserStatusContext', () => ({ useUserStatus: () => ({ userStatus: { userType: fixtures.userType, daysRemaining: 30, isSubscriber: false } }) }));
vi.mock('@/contexts/SettingsContext', () => ({ useSettingsContext: () => ({ profileData: { subscription_tier: fixtures.profileTier } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: fixtures.invoke }, auth: { getSession: vi.fn() } } }));
vi.mock('@/utils/stripeConfig', () => ({ getStripeConfig: () => ({ mode: 'test' }), isTestMode: () => true, getPriceId: () => null }));
vi.mock('@/components/EnterpriseContactForm', () => ({ EnterpriseContactForm: ({ open }: { open: boolean }) => open ? <div data-testid="enterprise-contact" /> : null }));
vi.mock('@/components/ui/UsageSummary', () => ({ UsageSummary: () => null }));
vi.mock('@/components/settings/billing/CurrentPlanSection', () => ({ CurrentPlanSection: ({ priceText, priceSubline }: { priceText: React.ReactNode; priceSubline?: string }) => <><div data-testid="current-plan-price">{priceText}</div><div data-testid="current-plan-status">{priceSubline}</div></> }));
vi.mock('@/components/settings/billing/BillingHistorySection', () => ({ BillingHistorySection: () => null }));

import { BillingTab } from '@/components/settings/BillingTab';

describe('BillingTab Enterprise price display', () => {
  beforeEach(() => {
    fixtures.tiers = [
      { id: 'starter', tier_name: 'starter', display_name: 'Starter', price_monthly: 30, price_yearly: 288, description: 'Starter' },
      { id: 'enterprise', tier_name: 'enterprise', display_name: 'Enterprise', price_monthly: 300, price_yearly: 3600, description: 'Enterprise' },
    ];
    fixtures.profileTier = 'starter';
    fixtures.userType = 'trial';
    fixtures.billingData = null;
    fixtures.invoke.mockClear();
  });

  it('shows a custom price without a monthly suffix and preserves the Starter price', () => {
    render(<BillingTab />);

    const customPrice = screen.getByText('Custom pricing');
    expect(customPrice).toBeInTheDocument();
    expect(customPrice.parentElement).not.toHaveTextContent('/month');
    expect(screen.queryByText(/Starting at €300/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/intelligent reminder sequences/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('€30').some((price) => price.parentElement?.textContent?.includes('/month'))).toBe(true);
  });

  it('shows zero-priced Enterprise as custom while excluding free and other zero-priced plans', () => {
    fixtures.tiers[1].price_monthly = 0;
    fixtures.tiers.push(
      { id: 'free', tier_name: 'free', display_name: 'Free tier', price_monthly: 0, price_yearly: 0, description: '' },
      { id: 'other', tier_name: 'other', display_name: 'Other zero tier', price_monthly: 0, price_yearly: 0, description: '' },
    );
    render(<BillingTab />);

    expect(screen.getByRole('heading', { name: 'Enterprise' })).toBeInTheDocument();
    expect(screen.getByText('Custom pricing')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Free tier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Other zero tier' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Toggle yearly billing' }));
    expect(screen.getByText('Custom pricing')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Contact sales' }));
    expect(screen.getByTestId('enterprise-contact')).toBeInTheDocument();
    expect(fixtures.invoke).not.toHaveBeenCalled();
  });

  it.each([-1, Number.NaN, Infinity, '300', true, null, undefined])('does not expose Enterprise with invalid monthly price %s', (price) => {
    fixtures.tiers[1].price_monthly = price as unknown as number;
    render(<BillingTab />);
    expect(screen.queryByRole('heading', { name: 'Enterprise' })).not.toBeInTheDocument();
  });

  it('does not describe the current zero-priced Enterprise plan as free', () => {
    fixtures.profileTier = 'enterprise';
    fixtures.tiers[1].price_monthly = 0;
    fixtures.billingData = { billing_cycle: 'month', subscribed: true };
    render(<BillingTab />);
    expect(screen.getByTestId('current-plan-price')).toHaveTextContent('Custom pricing');
    expect(screen.getByTestId('current-plan-price')).not.toHaveTextContent('Free');
  });

  it.each([undefined, null, -1, Number.NaN, Infinity, '300'])('shows an unavailable current price for invalid Enterprise amount %s', (price) => {
    fixtures.profileTier = 'enterprise';
    fixtures.tiers[1].price_monthly = price as unknown as number;
    fixtures.billingData = { billing_cycle: 'month', subscribed: true };
    render(<BillingTab />);
    expect(screen.getByTestId('current-plan-price')).toHaveTextContent('Price unavailable');
  });

  it('checks the annual amount, rather than the zero monthly amount, for an annual Enterprise subscription', () => {
    fixtures.profileTier = 'enterprise';
    fixtures.tiers[1].price_monthly = 0;
    fixtures.tiers[1].price_yearly = undefined as unknown as number;
    fixtures.billingData = { billing_cycle: 'year', subscribed: true };
    render(<BillingTab />);
    expect(screen.getByTestId('current-plan-price')).toHaveTextContent('Price unavailable');
    expect(screen.getByRole('heading', { name: 'Enterprise' })).toBeInTheDocument();
  });

  it('does not present a generic annual Enterprise tier amount as the customer contract price', () => {
    fixtures.profileTier = 'enterprise';
    fixtures.tiers[1].price_monthly = 0;
    fixtures.tiers[1].price_yearly = 3600;
    fixtures.billingData = { billing_cycle: 'year', subscribed: true };
    render(<BillingTab />);
    expect(screen.getByTestId('current-plan-price')).toHaveTextContent('Custom pricing');
  });

  it('shows an unavailable Enterprise price if the actual billing interval is unknown', () => {
    fixtures.profileTier = 'enterprise';
    fixtures.billingData = { billing_cycle: null, subscribed: true };
    render(<BillingTab />);
    expect(screen.getByTestId('current-plan-price')).toHaveTextContent('Price unavailable');
  });

  it.each([
    ['year', '€24/month', 'Billed annually'], ['yearly', '€24/month', 'Billed annually'],
    ['month', '€30/month', 'Billed monthly'], ['monthly', '€30/month', 'Billed monthly'],
  ] as const)(
    'uses the provider interval %s for the current Starter price, independent of the comparison switch',
    (cycle, price, status) => {
      fixtures.userType = 'subscriber';
      fixtures.billingData = { billing_cycle: cycle, subscribed: true };
      render(<BillingTab />);
      expect(screen.getByTestId('current-plan-price')).toHaveTextContent(price);
      expect(screen.getByTestId('current-plan-status')).toHaveTextContent(status);
      fireEvent.click(screen.getByRole('switch', { name: 'Toggle yearly billing' }));
      expect(screen.getByTestId('current-plan-price')).toHaveTextContent(price);
      expect(screen.getByTestId('current-plan-status')).toHaveTextContent(status);
    },
  );

  it('does not guess a monthly Starter price when the provider billing interval is unavailable', () => {
    fixtures.billingData = { billing_cycle: null, subscribed: true };
    render(<BillingTab />);
    expect(screen.getByTestId('current-plan-price')).toHaveTextContent('Price unavailable');
  });

  it('does not invent an Enterprise plan when the active tiers omit it', () => {
    fixtures.tiers = fixtures.tiers.slice(0, 1);
    render(<BillingTab />);
    expect(screen.queryByRole('heading', { name: 'Enterprise' })).not.toBeInTheDocument();
  });
});
