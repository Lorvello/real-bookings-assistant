// DEV-ONLY no-auth visual harness for the Billing settings surface (launch-ready-loop §7).
// BillingTab is hook-heavy (useUserStatus / useSubscriptionTiers / useBillingData /
// useSettingsContext + UsageSummary's subscription-limit hooks), but the heavy NEW UI is
// PURE props: CurrentPlanSection, UsageMeters, BillingHistorySection, AvailablePlansSection.
// We mount the REAL presentational components against local mock data (QueryClient +
// TooltipProvider only). Not in prod build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Calendar, MessageCircle, Users } from 'lucide-react';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CurrentPlanSection } from '@/components/settings/billing/CurrentPlanSection';
import { UsageMeters, type UsageMeter } from '@/components/settings/billing/UsageMeters';
import { BillingHistorySection, type BillingInvoice } from '@/components/settings/billing/BillingHistorySection';
import { AvailablePlansSection, type PlanTile } from '@/components/settings/billing/AvailablePlansSection';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const MOCK_METERS: UsageMeter[] = [
  { icon: Calendar, label: 'Calendars', current: 1, max: 2, canAddMore: true, percentage: 50, variant: 'default' },
  { icon: MessageCircle, label: 'WhatsApp Contacts', current: 184, max: 250, canAddMore: true, percentage: 73.6, variant: 'default' },
  { icon: Users, label: 'Team Members', current: 2, max: 2, canAddMore: false, percentage: 100, variant: 'destructive' },
];

const MOCK_INVOICES: BillingInvoice[] = [
  { id: '1', date: 'Jun 1, 2026', amount: '€48.00', description: 'Professional plan — monthly', status: 'paid', statusLabel: 'Paid', invoiceUrl: '#' },
  { id: '2', date: 'May 1, 2026', amount: '€48.00', description: 'Professional plan — monthly', status: 'paid', statusLabel: 'Paid', invoiceUrl: '#' },
  { id: '3', date: 'Apr 1, 2026', amount: '€48.00', description: 'Professional plan — monthly', status: 'open', statusLabel: 'Pending', invoiceUrl: null },
  { id: '4', date: 'Mar 1, 2026', amount: '€48.00', description: 'Professional plan — monthly', status: 'paid', statusLabel: 'Paid', invoiceUrl: '#' },
  { id: '5', date: 'Feb 1, 2026', amount: '€24.00', description: 'Starter plan — monthly', status: 'paid', statusLabel: 'Paid', invoiceUrl: '#' },
];

const FEATURES = {
  starter: ['Unlimited WhatsApp contacts', 'Dual-calendar orchestration', 'AI reminder sequences', 'Live operations dashboard', 'Multi-language localization'],
  professional: ['Everything in Starter', 'Installment payments', 'Unlimited calendars', 'Team suite (2-10 users)', 'Complete analytics suite', 'Priority customer success'],
  enterprise: ['Everything in Professional', 'Dedicated WhatsApp Business API', 'Voice call routing', 'Omnichannel social DMs', 'Enterprise SLA', 'White-glove onboarding'],
};

function makePlans(cycle: 'monthly' | 'yearly'): PlanTile[] {
  return [
    { id: 's', tierName: 'starter', displayName: 'Starter', displayPrice: cycle === 'yearly' ? '€24' : '€30', billingText: '/month', savingsText: cycle === 'yearly' ? 'Billed annually (€288/year)' : 'For solo practitioners getting started', features: FEATURES.starter, isCurrent: false, isEnterprise: false, highlightPrice: cycle === 'yearly' },
    { id: 'p', tierName: 'professional', displayName: 'Professional', displayPrice: cycle === 'yearly' ? '€48' : '€60', billingText: '/month', savingsText: cycle === 'yearly' ? 'Billed annually (€576/year)' : 'For growing teams and multi-location', features: FEATURES.professional, isCurrent: true, isEnterprise: false, highlightPrice: cycle === 'yearly' },
    { id: 'e', tierName: 'enterprise', displayName: 'Enterprise', displayPrice: 'Starting at €300', billingText: '/month', savingsText: 'Custom pricing for large organizations', features: FEATURES.enterprise, isCurrent: false, isEnterprise: true, highlightPrice: false },
  ];
}

function Harness() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showAll, setShowAll] = useState(false);
  const noop = () => {};

  return (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          <div className="dark main-scrollbar h-screen overflow-y-auto bg-background p-3 md:p-8">
            <div className="mx-auto max-w-6xl">
              <SimplePageHeader title="Settings" />
              <div className="mt-6 flex flex-col gap-5 md:mt-8 md:flex-row md:gap-8">
                <aside className="md:w-60 md:shrink-0" />
                <div className="min-w-0 flex-1 space-y-8 pb-24">
                  {/* Active subscriber — populated */}
                  <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    <CurrentPlanSection
                      userType="subscriber"
                      hasNoSubscription={false}
                      planName="Professional"
                      planDescription="For growing teams and multi-location businesses."
                      priceText={<>€48<span className="text-sm font-normal text-muted-foreground">/month</span></>}
                      priceSubline="Billed monthly"
                      timeline={{
                        nextBilling: 'Jul 1, 2026',
                        lastPayment: 'Jun 1, 2026 — €48.00',
                        billingCycle: 'Monthly',
                        paymentStatus: 'Active',
                      }}
                      onManage={noop}
                    />
                    <UsageMeters meters={MOCK_METERS} onViewPlans={noop} />
                  </div>

                  <BillingHistorySection
                    invoices={MOCK_INVOICES}
                    showAll={showAll}
                    hasMore={MOCK_INVOICES.length > 3}
                    onToggleShowAll={() => setShowAll((v) => !v)}
                    emptyMessage=""
                    onViewPlans={noop}
                  />

                  <AvailablePlansSection
                    plans={makePlans(cycle)}
                    billingCycle={cycle}
                    onCycleChange={setCycle}
                    onUpgrade={noop}
                    onContactSales={noop}
                  />

                  {/* --- State variants for review --- */}
                  <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    {/* Trial */}
                    <CurrentPlanSection
                      userType="trial"
                      hasNoSubscription={false}
                      planName="Starter"
                      planDescription="For solo practitioners getting started."
                      priceText="Free"
                      trialNote="12 days remaining in trial"
                      timeline={{
                        nextBilling: 'Next billing date unavailable',
                        lastPayment: 'No payment history',
                        billingCycle: 'Monthly',
                        paymentStatus: 'Payment Pending',
                      }}
                      onManage={noop}
                      manageDisabled
                    />
                    {/* No subscription */}
                    <CurrentPlanSection
                      userType="expired_trial"
                      hasNoSubscription
                      planName="Free"
                      priceText="Free"
                      onManage={noop}
                      manageDisabled
                    />
                  </div>

                  <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                    {/* Empty billing history */}
                    <BillingHistorySection
                      invoices={[]}
                      showAll={false}
                      hasMore={false}
                      onToggleShowAll={noop}
                      emptyMessage="Your billing history will appear here after your first payment."
                      showPlansCta
                      onViewPlans={noop}
                    />
                    {/* No-subscription usage */}
                    <UsageMeters
                      hasNoSubscription
                      emptyMessage="Your trial has expired. Subscribe to access usage tracking and premium features."
                      onViewPlans={noop}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
