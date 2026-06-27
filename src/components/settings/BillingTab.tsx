import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
type TFn = ReturnType<typeof useTranslation<'settings'>>['t'];
const getPlanFeatures = (t: TFn): Record<string, string[]> => ({
  starter: [
    t('settings.billing.planFeatures.starter.0', 'Unlimited WhatsApp contact management'),
    t('settings.billing.planFeatures.starter.1', 'Dual-calendar orchestration system'),
    t('settings.billing.planFeatures.starter.2', 'Individual user access management'),
    t('settings.billing.planFeatures.starter.3', 'AI-powered intelligent reminder sequences'),
    t('settings.billing.planFeatures.starter.4', 'Essential dashboard overview & live operations monitoring'),
    t('settings.billing.planFeatures.starter.5', 'Global multi-language localization'),
    t('settings.billing.planFeatures.starter.6', 'Streamlined payment processing & collection'),
  ],
  professional: [
    t('settings.billing.planFeatures.professional.0', 'All Starter premium features included'),
    t('settings.billing.planFeatures.professional.1', 'Automated tax compliance & administration (Coming Soon)'),
    t('settings.billing.planFeatures.professional.2', 'Flexible installment payment options'),
    t('settings.billing.planFeatures.professional.3', 'Unlimited calendar orchestration platform'),
    t('settings.billing.planFeatures.professional.4', 'Advanced team collaboration suite (2-10 users)'),
    t('settings.billing.planFeatures.professional.5', 'Multi-location business coordination'),
    t('settings.billing.planFeatures.professional.6', 'Complete analytics suite: Business Intelligence, Performance tracking & Future Insights'),
    t('settings.billing.planFeatures.professional.7', 'Dedicated priority customer success'),
  ],
  enterprise: [
    t('settings.billing.planFeatures.enterprise.0', 'Complete professional suite included'),
    t('settings.billing.planFeatures.enterprise.1', 'Unlimited enterprise user access management'),
    t('settings.billing.planFeatures.enterprise.2', 'Dedicated WhatsApp Business API with custom branding'),
    t('settings.billing.planFeatures.enterprise.3', 'Intelligent voice call routing & distribution'),
    t('settings.billing.planFeatures.enterprise.4', 'Omnichannel social media DM orchestration'),
    t('settings.billing.planFeatures.enterprise.5', 'Advanced reputation management & review analytics'),
    t('settings.billing.planFeatures.enterprise.6', 'Enterprise SLA with dedicated success management'),
    t('settings.billing.planFeatures.enterprise.7', 'White-glove onboarding & strategic integration consulting'),
  ],
});

export const BillingTab: React.FC = () => {
  const { t } = useTranslation('settings');
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
          ? t('settings.billing.errors.portalSetupError', 'Subscription management is currently being set up. Please contact support for assistance.')
          : t('settings.billing.errors.portalError', 'Failed to open billing portal. Please try again.');
      toast({
        title: t('settings.billing.toast.notice', 'Notice'),
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
      toast({ title: t('settings.billing.toast.error', 'Error'), description: t('settings.billing.errors.planNotFound', 'Selected plan not found. Please try again.'), variant: 'destructive' });
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
      toast({ title: t('settings.billing.toast.error', 'Error'), description: t('settings.billing.errors.checkoutError', 'Failed to start checkout. Please try again.'), variant: 'destructive' });
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
    if (!currentPlan) return { amount: 0, displayText: t('settings.billing.pricing.free', 'Free') };
    const actualBillingCycle = billingData?.billing_cycle || 'monthly';
    const price = actualBillingCycle === 'yearly' ? currentPlan.price_yearly : currentPlan.price_monthly;
    if (!price || price === 0) return { amount: 0, displayText: t('settings.billing.pricing.free', 'Free') };
    const monthlyPrice = actualBillingCycle === 'yearly' ? price / 12 : price;
    return { amount: Math.round(monthlyPrice), displayText: `€${Math.round(monthlyPrice)}/month` };
  };
  const currentPrice = getCurrentPrice();

  const getBillingStatus = () => {
    if (userStatus.userType === 'trial' && userStatus.daysRemaining > 0) return t('settings.billing.billingStatus.trialFree', 'Free during trial period');
    if (userStatus.userType === 'canceled_subscriber') {
      return t('settings.billing.billingStatus.canceledUntil', 'Canceled — access until {{date}}', {
        date: userStatus.subscriptionEndDate ? new Date(userStatus.subscriptionEndDate).toLocaleDateString() : 'end date',
      });
    }
    return billingCycle === 'yearly' ? t('settings.billing.billingStatus.billedAnnually', 'Billed annually') : t('settings.billing.billingStatus.billedMonthly', 'Billed monthly');
  };

  const priceText: React.ReactNode =
    currentPrice.amount === 0 ? (
      currentPrice.displayText
    ) : (
      <>
        €{currentPrice.amount}
        <span className="text-sm font-normal text-muted-foreground">{t('settings.billing.pricing.perMonth', '/month')}</span>
      </>
    );

  const getTimeline = (): BillingTimeline => {
    if (hasNoSubscription || !billingData) {
      return {
        nextBilling: t('settings.billing.timeline.noActiveSubscription', 'No active subscription'),
        lastPayment: t('settings.billing.timeline.noBillingHistory', 'No billing history'),
        billingCycle: t('settings.billing.timeline.noSubscription', 'No subscription'),
        // SENTINEL: this English literal feeds PaymentStatusValue's === checks +
        // its display map; it is translated for display there, not here.
        paymentStatus: 'Inactive',
      };
    }
    const nextBilling = billingData.next_billing_date
      ? format(new Date(billingData.next_billing_date), 'MMM d, yyyy')
      : billingData.subscribed
        ? t('settings.billing.timeline.nextBillingUnavailable', 'Next billing date unavailable')
        : t('settings.billing.timeline.noActiveSubscription', 'No active subscription');
    const lastPayment =
      billingData.last_payment_date && billingData.last_payment_amount
        ? `${format(new Date(billingData.last_payment_date), 'MMM d, yyyy')} — €${(billingData.last_payment_amount / 100).toFixed(2)}`
        : billingData.subscribed
          ? t('settings.billing.timeline.noPaymentHistory', 'No payment history')
          : t('settings.billing.timeline.noBillingHistory', 'No billing history');
    const cycle = billingData.billing_cycle
      ? billingData.billing_cycle.charAt(0).toUpperCase() + billingData.billing_cycle.slice(1) + 'ly'
      : billingData.subscribed
        ? t('settings.billing.timeline.cycleUnavailable', 'Cycle unavailable')
        : t('settings.billing.timeline.noSubscription', 'No subscription');
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
          description: inv.description || t('settings.billing.invoice.noDescription', 'No description'),
          status: inv.status,
          statusLabel:
            inv.status === 'paid'
              ? t('settings.billing.invoiceStatus.paid', 'Paid')
              : inv.status === 'open'
                ? t('settings.billing.invoiceStatus.pending', 'Pending')
                : inv.status === 'draft'
                  ? t('settings.billing.invoiceStatus.draft', 'Draft')
                  : inv.status || t('settings.billing.invoiceStatus.unknown', 'Unknown'),
          invoiceUrl: inv.invoice_url,
        }))
    : [];

  const historyEmptyMessage = (() => {
    if (hasNoSubscription) return t('settings.billing.historyEmpty.noSubscription', 'No billing history found for your account.');
    if (userStatus.userType === 'trial' || userStatus.userType === 'setup_incomplete')
      return t('settings.billing.historyEmpty.trialOrSetup', 'Your billing history will appear here after your first payment.');
    if (billingData && !billingData.subscribed) return t('settings.billing.historyEmpty.noActiveSubscription', "You don't have an active subscription yet.");
    return t('settings.billing.historyEmpty.noBillingRecords', 'No billing records found. This may be due to a recent subscription or pending payment processing.');
  })();

  const onViewPlans = () =>
    document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });

  // ---- Available plans derivation ---------------------------------------------
  const plans: PlanTile[] = (tiers || [])
    .filter((tier) => tier.tier_name !== 'free' && tier.price_monthly > 0)
    .map((tier) => {
      const isEnterprise = tier.tier_name === 'enterprise';
      let displayPrice: string;
      let billingText = t('settings.billing.planTile.perMonth', '/month');
      let savingsText: string | undefined;

      if (isEnterprise) {
        displayPrice = t('settings.billing.planTile.startingAt', 'Starting at €300');
        savingsText = t('settings.billing.planTile.customPricing', 'Custom pricing for large organizations');
      } else if (billingCycle === 'monthly') {
        displayPrice = `€${tier.price_monthly}`;
        savingsText = t('settings.billing.planDesc.' + tier.tier_name, tier.description);
      } else if (tier.tier_name === 'starter') {
        displayPrice = '€24';
        savingsText = t('settings.billing.planTile.billedAnnually', 'Billed annually (€{{amount}}/year)', { amount: 288 });
      } else if (tier.tier_name === 'professional') {
        displayPrice = '€48';
        savingsText = t('settings.billing.planTile.billedAnnually', 'Billed annually (€{{amount}}/year)', { amount: 576 });
      } else {
        displayPrice = `€${Math.round(tier.price_yearly / 12)}`;
        savingsText = t('settings.billing.planTile.billedAnnually', 'Billed annually (€{{amount}}/year)', { amount: tier.price_yearly });
      }

      return {
        id: tier.id,
        tierName: tier.tier_name,
        displayName: tier.display_name,
        displayPrice,
        billingText,
        savingsText,
        features: getPlanFeatures(t)[tier.tier_name] ?? getPlanFeatures(t).starter,
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
          planDescription={currentPlan ? t('settings.billing.planDesc.' + currentPlan.tier_name, currentPlan.description ?? '') : undefined}
          priceText={priceText}
          priceSubline={currentPlan && currentPrice.amount > 0 ? getBillingStatus() : undefined}
          trialNote={
            userStatus.userType === 'trial' && userStatus.daysRemaining > 0
              ? t('settings.billing.trialNote', '{{daysRemaining}} days remaining in trial', { daysRemaining: userStatus.daysRemaining })
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
