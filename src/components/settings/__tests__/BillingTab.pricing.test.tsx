import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  tiers: [
    { id: 'starter', tier_name: 'starter', display_name: 'Starter', price_monthly: 30, price_yearly: 288, description: 'Starter' },
    { id: 'enterprise', tier_name: 'enterprise', display_name: 'Enterprise', price_monthly: 300, price_yearly: 3600, description: 'Enterprise' },
  ],
  invoke: vi.fn(),
  profileTier: 'starter',
  userType: 'trial',
  isSubscriber: false,
  isStatusLoading: false,
  billingData: null as null | { billing_cycle: 'year' | 'month' | 'yearly' | 'monthly' | null; subscribed: boolean; stripe_status?: string | null; stripe_subscription_id?: string | null; payment_status?: string },
  billingLoading: false,
  billingFetching: false,
  tiersLoading: false,
  tiersError: null as Error | null,
  billingError: null as Error | null,
  refetchTiers: vi.fn(),
  refetchBilling: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }) }));
vi.mock('@/hooks/useAccountRole', () => ({ useAccountRole: () => ({ isAccountOwner: true, accountOwnerId: 'owner-1', loading: false, error: null }) }));
vi.mock('@/hooks/useBillingData', () => ({ useBillingData: () => ({ billingData: fixtures.billingData, isLoading: fixtures.billingLoading, isFetching: fixtures.billingFetching, error: fixtures.billingError, refetch: fixtures.refetchBilling }) }));
vi.mock('@/hooks/useSubscriptionTiers', () => ({
  useSubscriptionTiers: () => ({ isLoading: fixtures.tiersLoading, tiers: fixtures.tiers, error: fixtures.tiersError, refetch: fixtures.refetchTiers }),
}));
vi.mock('@/contexts/UserStatusContext', () => ({ useUserStatus: () => ({ userStatus: { userType: fixtures.userType, daysRemaining: 30, isSubscriber: fixtures.isSubscriber, isStatusLoading: fixtures.isStatusLoading } }) }));
vi.mock('@/contexts/SettingsContext', () => ({ useSettingsContext: () => ({ profileData: { subscription_tier: fixtures.profileTier } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: fixtures.invoke }, auth: { getSession: fixtures.getSession } } }));
vi.mock('@/utils/stripeConfig', () => ({ getStripeConfig: () => ({ mode: 'test' }), isTestMode: () => true, getPriceId: () => 'price_test' }));
vi.mock('@/components/EnterpriseContactForm', () => ({ EnterpriseContactForm: ({ open }: { open: boolean }) => open ? <div data-testid="enterprise-contact" /> : null }));
vi.mock('@/components/ui/UsageSummary', () => ({ UsageSummary: () => null }));
vi.mock('@/components/settings/billing/CurrentPlanSection', () => ({ CurrentPlanSection: ({ priceText, priceSubline, planName }: { priceText: React.ReactNode; priceSubline?: string; planName: string }) => <><div data-testid="current-plan-name">{planName}</div><div data-testid="current-plan-price">{priceText}</div><div data-testid="current-plan-status">{priceSubline}</div></> }));
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
    fixtures.isSubscriber = false;
    fixtures.isStatusLoading = false;
    fixtures.billingData = null;
    fixtures.billingLoading = false;
    fixtures.billingFetching = false;
    fixtures.tiersLoading = false;
    fixtures.tiersError = null;
    fixtures.billingError = null;
    fixtures.invoke.mockClear();
    fixtures.refetchTiers.mockClear();
    fixtures.refetchBilling.mockReset();
    fixtures.getSession.mockReset();
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

  it('does not display a free plan on a tier-fetch failure and retries only that fetch', () => {
    fixtures.tiers = [];
    fixtures.tiersError = new Error('tiers unavailable');
    render(<BillingTab />);
    expect(screen.getByRole('alert')).toHaveTextContent('Plan details are unavailable');
    expect(screen.queryByRole('heading', { name: 'Available plans' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('current-plan-price')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(fixtures.refetchTiers).toHaveBeenCalledTimes(1);
    expect(fixtures.refetchBilling).not.toHaveBeenCalled();
    expect(fixtures.invoke).not.toHaveBeenCalled();
  });

  it.each(['empty', 'missing'])('does not claim a free plan when tier data is %s', (state) => {
    fixtures.tiers = state === 'empty' ? [] : undefined as unknown as typeof fixtures.tiers;
    render(<BillingTab />);
    expect(screen.getByRole('alert')).toHaveTextContent('Plan details are unavailable');
    expect(screen.queryByTestId('current-plan-price')).not.toBeInTheDocument();
  });

  it('still exposes a separate billing failure after the tier failure is resolved', () => {
    const activeTiers = fixtures.tiers;
    fixtures.tiers = [];
    fixtures.tiersError = new Error('tiers unavailable');
    fixtures.billingError = new Error('billing unavailable');
    const { rerender } = render(<BillingTab />);
    expect(screen.getByRole('alert')).toHaveTextContent('Plan details are unavailable');
    fixtures.tiers = activeTiers;
    fixtures.tiersError = null;
    rerender(<BillingTab />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your billing details");
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(fixtures.refetchBilling).toHaveBeenCalledTimes(1);
    expect(fixtures.refetchTiers).not.toHaveBeenCalled();
  });

  it('does not present Starter as the current plan when the current Enterprise tier is missing', () => {
    fixtures.profileTier = 'enterprise';
    fixtures.tiers = fixtures.tiers.slice(0, 1);
    fixtures.billingData = { billing_cycle: 'month', subscribed: true };
    render(<BillingTab />);
    expect(screen.getByTestId('current-plan-name')).toHaveTextContent('Unknown plan');
    expect(screen.getByTestId('current-plan-price')).toHaveTextContent('Price unavailable');
  });

  it('announces that subscription plans are loading', () => {
    fixtures.tiersLoading = true;
    render(<BillingTab />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading subscription plans');
  });

  it('keeps the existing billing portal reachable for an owner with verified active billing', async () => {
    fixtures.tiersError = new Error('tiers unavailable');
    fixtures.isSubscriber = true;
    fixtures.billingData = { billing_cycle: 'month', subscribed: true };
    fixtures.getSession.mockResolvedValue({ data: { session: { access_token: 'fake-token' } } });
    fixtures.invoke.mockResolvedValue({ data: { url: 'https://billing.example.test' }, error: null });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<BillingTab />);
    fireEvent.click(screen.getByRole('button', { name: 'Manage subscription' }));
    await waitFor(() => expect(fixtures.invoke).toHaveBeenCalledWith('customer-portal', {
      headers: { Authorization: 'Bearer fake-token' }, body: { mode: 'test' },
    }));
    expect(openSpy).toHaveBeenCalledWith('https://billing.example.test', '_blank');
    openSpy.mockRestore();
  });

  it.each(['not-subscribed', 'provider-not-subscribed', 'billing-loading', 'billing-refetching', 'status-loading', 'billing-error', 'no-billing-data'])('does not offer the portal on tier failure when %s', (state) => {
    fixtures.tiersError = new Error('tiers unavailable');
    fixtures.isSubscriber = state !== 'not-subscribed';
    fixtures.billingData = state === 'no-billing-data' ? null : { billing_cycle: 'month', subscribed: state !== 'provider-not-subscribed' };
    fixtures.billingLoading = state === 'billing-loading';
    fixtures.billingFetching = state === 'billing-refetching';
    fixtures.isStatusLoading = state === 'status-loading';
    fixtures.billingError = state === 'billing-error' ? new Error('billing failed') : null;
    render(<BillingTab />);
    expect(screen.queryByRole('button', { name: 'Manage subscription' })).not.toBeInTheDocument();
    expect(fixtures.invoke).not.toHaveBeenCalled();
  });

  it.each(['trial', 'expired_trial', 'canceled_and_inactive', 'setup_incomplete'])('allows a new plan for confirmed unsubscribed %s', async (state) => {
    fixtures.userType = state;
    fixtures.profileTier = '';
    fixtures.billingData = { billing_cycle: null, subscribed: false, stripe_status: null, stripe_subscription_id: null, payment_status: state === 'trial' ? 'trialing' : 'unpaid' };
    fixtures.getSession.mockResolvedValue({ data: { session: { access_token: 'fake-token' } } });
    fixtures.invoke.mockResolvedValue({ data: { url: 'https://checkout.example.test' }, error: null });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<BillingTab />);
    const choose = screen.getByRole('button', { name: /Switch to/ });
    expect(choose).toBeEnabled();
    fireEvent.click(choose);
    await waitFor(() => expect(fixtures.invoke).toHaveBeenCalledWith('create-checkout', expect.objectContaining({ body: expect.objectContaining({ tier_name: 'starter' }) })));
    openSpy.mockRestore();
  });

  it('allows a replacement after a confirmed canceled Stripe subscription', () => {
    fixtures.userType = 'canceled_and_inactive';
    fixtures.profileTier = '';
    fixtures.billingData = { billing_cycle: null, subscribed: false, stripe_status: 'canceled', stripe_subscription_id: 'sub_fake', payment_status: 'canceled' };
    render(<BillingTab />);
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeEnabled();
  });

  it('allows a replacement for an explicitly expired incomplete Stripe subscription', () => {
    fixtures.userType = 'missed_payment';
    fixtures.profileTier = '';
    fixtures.billingData = { billing_cycle: null, subscribed: false, stripe_status: 'incomplete_expired', stripe_subscription_id: 'sub_fake', payment_status: 'unpaid' };
    render(<BillingTab />);
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeEnabled();
  });

  it.each(['trial', 'setup_incomplete'])('allows %s with Starter in the profile to choose Starter when no subscription exists', (state) => {
    fixtures.userType = state;
    fixtures.profileTier = 'starter';
    fixtures.billingData = { billing_cycle: null, subscribed: false, stripe_status: null, stripe_subscription_id: null, payment_status: 'unpaid' };
    render(<BillingTab />);
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeEnabled();
  });

  it.each(['billing-missing', 'billing-loading', 'billing-refetching', 'status-loading', 'status-unknown', 'conflicting-subscriber', 'stripe-past-due', 'stripe-incomplete', 'provider-fields-missing', 'payment-status-unknown', 'active-subscription'])('does not start checkout when %s', (scenario) => {
    fixtures.profileTier = '';
    fixtures.billingData = { billing_cycle: null, subscribed: false, stripe_status: null, stripe_subscription_id: null, payment_status: 'unpaid' };
    if (scenario === 'billing-missing') fixtures.billingData = null;
    if (scenario === 'billing-loading') fixtures.billingLoading = true;
    if (scenario === 'billing-refetching') fixtures.billingFetching = true;
    if (scenario === 'status-loading') fixtures.isStatusLoading = true;
    if (scenario === 'status-unknown') fixtures.userType = 'unknown';
    if (scenario === 'conflicting-subscriber') fixtures.isSubscriber = true;
    if (scenario === 'provider-fields-missing') fixtures.billingData = { billing_cycle: null, subscribed: false };
    if (scenario === 'payment-status-unknown') fixtures.billingData!.payment_status = 'unknown';
    if (scenario === 'stripe-past-due' || scenario === 'stripe-incomplete') {
      fixtures.billingData!.stripe_status = scenario === 'stripe-past-due' ? 'past_due' : 'incomplete';
      fixtures.billingData!.stripe_subscription_id = 'sub_fake';
    }
    if (scenario === 'active-subscription') {
      fixtures.billingData = { billing_cycle: 'month', subscribed: true, stripe_status: 'active', stripe_subscription_id: 'sub_fake', payment_status: 'paid' };
      fixtures.isSubscriber = true;
      fixtures.userType = 'subscriber';
    }
    render(<BillingTab />);
    const choose = screen.getByRole('button', { name: /Switch to/ });
    expect(choose).toBeDisabled();
    fireEvent.click(choose);
    expect(fixtures.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Contact sales' }));
    expect(screen.getByTestId('enterprise-contact')).toBeInTheDocument();
    expect(fixtures.invoke).not.toHaveBeenCalled();
  });

  it('does not direct an active customer to a disabled management button and offers a status refresh', () => {
    fixtures.userType = 'canceled_subscriber';
    fixtures.isSubscriber = false;
    fixtures.billingData = { billing_cycle: 'month', subscribed: true, stripe_status: 'active', stripe_subscription_id: 'sub_fake', payment_status: 'paid' };
    render(<BillingTab />);
    expect(screen.queryByText('Manage your current subscription to change plans.')).not.toBeInTheDocument();
    expect(screen.getByText(/We cannot confirm that a new subscription can be started/)).toHaveTextContent('reload this page');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh billing status' }));
    expect(fixtures.refetchBilling).toHaveBeenCalledTimes(1);
    expect(fixtures.invoke).not.toHaveBeenCalled();
  });

  it('blocks cached unsubscribed data while a billing refresh is in flight', () => {
    fixtures.profileTier = '';
    fixtures.billingData = { billing_cycle: null, subscribed: false, stripe_status: null, stripe_subscription_id: null, payment_status: 'unpaid' };
    const { rerender } = render(<BillingTab />);
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeEnabled();
    fixtures.billingFetching = true;
    rerender(<BillingTab />);
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh billing status' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Switch to/ }));
    expect(fixtures.invoke).not.toHaveBeenCalled();
    fixtures.billingData = { billing_cycle: 'month', subscribed: true, stripe_status: 'active', stripe_subscription_id: 'sub_fake', payment_status: 'paid' };
    fixtures.billingFetching = false;
    fixtures.userType = 'subscriber';
    fixtures.isSubscriber = true;
    rerender(<BillingTab />);
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeDisabled();
    expect(fixtures.invoke).not.toHaveBeenCalled();
  });
});
