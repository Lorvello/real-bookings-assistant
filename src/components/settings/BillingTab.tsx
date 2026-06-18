import React, { useState } from 'react';
import { format } from 'date-fns';
import { EnterpriseContactForm } from '@/components/EnterpriseContactForm';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { useBillingData } from '@/hooks/useBillingData';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { UsageSummary } from '@/components/ui/UsageSummary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeConfig, isTestMode, getPriceId } from '@/utils/stripeConfig';
import { CurrentPlanSection, type BillingTimeline } from '@/components/settings/billing/CurrentPlanSection';
import { BillingHistorySection, type BillingInvoice } from '@/components/settings/billing/BillingHistorySection';
import { AvailablePlansSection, type PlanTile } from '@/components/settings/billing/AvailablePlansSection';

// Feature lists kept in sync with the public homepage pricing.
const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    'Unlimited WhatsApp contact management',
    'Dual-calendar orchestration system',
    'Individual user access management',
    'AI-powered intelligent reminder sequences',
    'Essential dashboard overview & live operations monitoring',
    'Global multi-language localization',
    'Streamlined payment processing & collection',
  ],
  professional: [
    'All Starter premium features included',
    'Automated tax compliance & administration (Coming Soon)',
    'Flexible installment payment options',
    'Unlimited calendar orchestration platform',
    'Advanced team collaboration suite (2-10 users)',
    'Multi-location business coordination',
    'Complete analytics suite: Business Intelligence, Performance tracking & Future Insights',
    'Dedicated priority customer success',
  ],
  enterprise: [
    'Complete professional suite included',
    'Unlimited enterprise user access management',
    'Dedicated WhatsApp Business API with custom branding',
    'Intelligent voice call routing & distribution',
    'Omnichannel social media DM orchestration',
    'Advanced reputation management & review analytics',
    'Enterprise SLA with dedicated success management',
    'White-glove onboarding & strategic integration consulting',
  ],
};

export const BillingTab: React.FC = () => {
  const { userStatus } = useUserStatus();
  const { tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { billingData, isLoading: billingLoading, refetch } = useBillingData();
  const { profileData } = useSettingsContext();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);

  const hasNoSubscription =
    userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive';

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { mode } = getStripeConfig();
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: { mode },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        const checkForUpdates = () => {
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              setTimeout(() => refetch(), 2000);
              document.removeEventListener('visibilitychange', checkForUpdates);
            }
          });
        };
        checkForUpdates();
      }
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      const errorMessage =
        error?.message?.includes('portal') || error?.message?.includes('Portal')
          ? 'Subscription management is currently being set up. Please contact support for assistance.'
          : 'Failed to open billing portal. Please try again.';
      toast({
        title: 'Notice',
        description: errorMessage,
        variant: error?.message?.includes('portal') ? 'default' : 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tierName: string) => {
    if (!tiers) return;
    const selectedTier = tiers.find((tier) => tier.tier_name === tierName);
    if (!selectedTier) {
      toast({ title: 'Error', description: 'Selected plan not found. Please try again.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const testMode = isTestMode();
      const priceId = getPriceId(selectedTier, billingCycle === 'yearly', testMode);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: {
          priceId,
          tier_name: selectedTier.tier_name,
          price: billingCycle === 'yearly' ? selectedTier.price_yearly : selectedTier.price_monthly,
          is_annual: billingCycle === 'yearly',
          success_url: window.location.origin + '/success',
          cancel_url: window.location.origin + '/settings?tab=billing&canceled=true',
          mode: testMode ? 'test' : 'live',
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({ title: 'Error', description: 'Failed to start checkout. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ---- Current plan derivation -------------------------------------------------
  const getCurrentPlan = () => {
    if (!tiers || !profileData) return null;
    if (hasNoSubscription) return null;
    const userTier = profileData.subscription_tier;
    if (!userTier) return tiers.find((t) => t.tier_name === 'starter') || tiers[0];
    return tiers.find((t) => t.tier_name === userTier) || tiers.find((t) => t.tier_name === 'starter') || tiers[0];
  };
  const currentPlan = getCurrentPlan();

  const getCurrentPrice = () => {
    if (!currentPlan) return { amount: 0, displayText: 'Free' };
    const actualBillingCycle = billingData?.billing_cycle || 'monthly';
    const price = actualBillingCycle === 'yearly' ? currentPlan.price_yearly : currentPlan.price_monthly;
    if (!price || price === 0) return { amount: 0, displayText: 'Free' };
    const monthlyPrice = actualBillingCycle === 'yearly' ? price / 12 : price;
    return { amount: Math.round(monthlyPrice), displayText: `€${Math.round(monthlyPrice)}/month` };
  };
  const currentPrice = getCurrentPrice();

  const getBillingStatus = () => {
    if (userStatus.userType === 'trial' && userStatus.daysRemaining > 0) return 'Free during trial period';
    if (userStatus.userType === 'canceled_subscriber') {
      return `Canceled — access until ${
        userStatus.subscriptionEndDate ? new Date(userStatus.subscriptionEndDate).toLocaleDateString() : 'end date'
      }`;
    }
    return billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly';
  };

  const priceText: React.ReactNode =
    currentPrice.amount === 0 ? (
      currentPrice.displayText
    ) : (
      <>
        €{currentPrice.amount}
        <span className="text-sm font-normal text-muted-foreground">/month</span>
      </>
    );

  const getTimeline = (): BillingTimeline => {
    if (hasNoSubscription || !billingData) {
      return {
        nextBilling: 'No active subscription',
        lastPayment: 'No billing history',
        billingCycle: 'No subscription',
        paymentStatus: 'Inactive',
      };
    }
    const nextBilling = billingData.next_billing_date
      ? format(new Date(billingData.next_billing_date), 'MMM d, yyyy')
      : billingData.subscribed
        ? 'Next billing date unavailable'
        : 'No active subscription';
    const lastPayment =
      billingData.last_payment_date && billingData.last_payment_amount
        ? `${format(new Date(billingData.last_payment_date), 'MMM d, yyyy')} — €${(billingData.last_payment_amount / 100).toFixed(2)}`
        : billingData.subscribed
          ? 'No payment history'
          : 'No billing history';
    const cycle = billingData.billing_cycle
      ? billingData.billing_cycle.charAt(0).toUpperCase() + billingData.billing_cycle.slice(1) + 'ly'
      : billingData.subscribed
        ? 'Cycle unavailable'
        : 'No subscription';
    const paymentStatus = (() => {
      if (!billingData.subscribed) return 'Inactive';
      if (billingData.payment_status === 'paid') return 'Active';
      if (billingData.payment_status === 'unpaid') return 'Payment Failed';
      if (billingData.payment_status === 'pending') return 'Payment Pending';
      if (billingData.payment_status === 'requires_payment_method') return 'Payment Method Required';
      if (billingData.payment_status === 'canceled') return 'Canceled';
      return billingData.payment_status || 'Status Unknown';
    })();
    return {
      nextBilling,
      accessUntil: userStatus.userType === 'canceled_subscriber',
      lastPayment,
      billingCycle: cycle,
      paymentStatus,
    };
  };

  // ---- Billing history derivation ---------------------------------------------
  const invoices: BillingInvoice[] = Array.isArray(billingData?.billing_history)
    ? billingData!.billing_history
        .filter((inv: any) => inv && inv.id)
        .map((inv: any) => ({
          id: inv.id,
          date: inv.date ? format(new Date(inv.date), 'MMM d, yyyy') : 'Date unavailable',
          amount:
            inv.amount && typeof inv.amount === 'number'
              ? `${inv.currency || '€'}${(inv.amount / 100).toFixed(2)}`
              : 'Amount unavailable',
          description: inv.description || 'No description',
          status: inv.status,
          statusLabel:
            inv.status === 'paid'
              ? 'Paid'
              : inv.status === 'open'
                ? 'Pending'
                : inv.status === 'draft'
                  ? 'Draft'
                  : inv.status || 'Unknown',
          invoiceUrl: inv.invoice_url,
        }))
    : [];

  const historyEmptyMessage = (() => {
    if (hasNoSubscription) return 'No billing history found for your account.';
    if (userStatus.userType === 'trial' || userStatus.userType === 'setup_incomplete')
      return 'Your billing history will appear here after your first payment.';
    if (billingData && !billingData.subscribed) return "You don't have an active subscription yet.";
    return 'No billing records found. This may be due to a recent subscription or pending payment processing.';
  })();

  const onViewPlans = () =>
    document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });

  // ---- Available plans derivation ---------------------------------------------
  const plans: PlanTile[] = (tiers || [])
    .filter((tier) => tier.tier_name !== 'free' && tier.price_monthly > 0)
    .map((tier) => {
      const isEnterprise = tier.tier_name === 'enterprise';
      let displayPrice: string;
      let billingText = '/month';
      let savingsText: string | undefined;

      if (isEnterprise) {
        displayPrice = 'Starting at €300';
        savingsText = 'Custom pricing for large organizations';
      } else if (billingCycle === 'monthly') {
        displayPrice = `€${tier.price_monthly}`;
        savingsText = tier.description;
      } else if (tier.tier_name === 'starter') {
        displayPrice = '€24';
        savingsText = 'Billed annually (€288/year)';
      } else if (tier.tier_name === 'professional') {
        displayPrice = '€48';
        savingsText = 'Billed annually (€576/year)';
      } else {
        displayPrice = `€${Math.round(tier.price_yearly / 12)}`;
        savingsText = `Billed annually (€${tier.price_yearly}/year)`;
      }

      return {
        id: tier.id,
        tierName: tier.tier_name,
        displayName: tier.display_name,
        displayPrice,
        billingText,
        savingsText,
        features: PLAN_FEATURES[tier.tier_name] ?? PLAN_FEATURES.starter,
        isCurrent: tier.tier_name === currentPlan?.tier_name,
        isEnterprise,
        highlightPrice: billingCycle === 'yearly' && !isEnterprise,
      };
    });

  if (tiersLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <CurrentPlanSection
          userType={userStatus.userType}
          hasNoSubscription={hasNoSubscription}
          planName={currentPlan?.display_name || currentPlan?.tier_name || 'Free'}
          planDescription={currentPlan?.description}
          priceText={priceText}
          priceSubline={currentPlan && currentPrice.amount > 0 ? getBillingStatus() : undefined}
          trialNote={
            userStatus.userType === 'trial' && userStatus.daysRemaining > 0
              ? `${userStatus.daysRemaining} days remaining in trial`
              : undefined
          }
          timeline={getTimeline()}
          onManage={handleManageSubscription}
          manageDisabled={loading || !userStatus.isSubscriber}
          loading={loading}
        />
        <UsageSummary />
      </div>

      <BillingHistorySection
        invoices={invoices}
        loading={billingLoading}
        showAll={showAllHistory}
        hasMore={invoices.length > 3}
        onToggleShowAll={() => setShowAllHistory((v) => !v)}
        emptyMessage={historyEmptyMessage}
        showPlansCta={
          userStatus.userType === 'trial' ||
          userStatus.userType === 'expired_trial' ||
          userStatus.userType === 'setup_incomplete'
        }
        onViewPlans={onViewPlans}
      />

      <AvailablePlansSection
        plans={plans}
        billingCycle={billingCycle}
        onCycleChange={setBillingCycle}
        onUpgrade={handleUpgrade}
        onContactSales={() => setShowEnterpriseForm(true)}
        loading={loading}
      />

      <EnterpriseContactForm open={showEnterpriseForm} onOpenChange={setShowEnterpriseForm} />
    </div>
  );
};
