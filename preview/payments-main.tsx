// DEV-ONLY no-auth visual harness for the Pay & Book settings surface (launch-ready-loop §7).
// PaymentSettingsTab is hook-heavy (usePaymentSettings / useStripeConnect / useAccountRole /
// useInstallmentSettings / useUserStatus / useProfile), but the heavy NEW UI is PURE props:
// PayAndBookHeader, StripeAccountSection (4 states), PayoutOptionsSection, PaymentFlexibilitySection,
// the How-payments-work info sections, and CurrencyConversionDialog. We mount the REAL
// presentational components against local mock data. Not in prod build.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import '@/index.css';
import '@/i18n'; // bootstrap i18n so NL renders in this standalone harness (sim sweep)
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { CreditCard } from 'lucide-react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { PaymentOptions } from '@/components/payments/PaymentOptions';
import { PayAndBookHeader } from '@/components/settings/payments/PayAndBookHeader';
import { StripeAccountSection } from '@/components/settings/payments/StripeAccountSection';
import { PayoutOptionsSection } from '@/components/settings/payments/PayoutOptionsSection';
import { PaymentFlexibilitySection } from '@/components/settings/payments/PaymentFlexibilitySection';
import { FundFlowSection, HowItWorksSection, FeesSection } from '@/components/settings/payments/PaymentInfoSections';
import { CurrencyConversionDialog } from '@/components/settings/payments/CurrencyConversionDialog';
import type { PaymentMethodFee, PayoutType } from '@/components/settings/payments/types';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const FEES: PaymentMethodFee[] = [
  { id: 'ideal', name: 'iDEAL', fee: '€0.29', feeType: 'fixed' },
  { id: 'cards_eea', name: 'Cards (EEA)', fee: '1.5% + €0.25', feeType: 'percentage' },
  { id: 'bancontact', name: 'Bancontact', fee: '€0.35', feeType: 'fixed' },
];
const calcFee = (payout: PayoutType, method: string) => {
  const f = FEES.find((m) => m.id === method);
  return f ? `${payout === 'standard' ? '3.65' : '4.4'}% + €0.6${method === 'ideal' ? '4' : '0'}` : 'N/A';
};

const ACCOUNT_COMPLETE = {
  stripe_account_id: 'acct_1Qx7TEST00connected',
  onboarding_completed: true,
  charges_enabled: true,
  payouts_enabled: true,
  account_status: 'active',
  environment: 'test',
  updated_at: new Date(0).toISOString(),
} as any;

const ACCOUNT_INCOMPLETE = {
  ...ACCOUNT_COMPLETE,
  payouts_enabled: false,
  account_status: 'pending',
} as any;

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs uppercase tracking-wide text-subtle-foreground">{label}</span>
      <span className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

function FlexibilityDemo({ required, canUseInstallments = true }: { required: boolean; canUseInstallments?: boolean }) {
  const [paymentRequired, setPaymentRequired] = useState(required);
  const [deadline, setDeadline] = useState('24');
  const [autoCancel, setAutoCancel] = useState(true);
  const [payOnSite, setPayOnSite] = useState(false);
  const [installments, setInstallments] = useState(canUseInstallments);
  const [configOpen, setConfigOpen] = useState(true);
  const [policy, setPolicy] = useState('Free cancellation up to 24h before the appointment.');
  return (
    <PaymentFlexibilitySection
      refundPolicy={policy}
      onRefundPolicyChange={setPolicy}
      onSaveRefundPolicy={() => {}}
      savingRefundPolicy={false}
      paymentRequired={paymentRequired}
      onToggleOptional={(optional) => setPaymentRequired(!optional)}
      deadlineHours={deadline}
      onDeadlineChange={setDeadline}
      onDeadlineBlur={() => {}}
      autoCancel={autoCancel}
      onToggleAutoCancel={setAutoCancel}
      payOnSiteEnabled={payOnSite}
      onTogglePayOnSite={setPayOnSite}
      installmentsEnabled={installments}
      onToggleInstallments={setInstallments}
      canUseInstallments={canUseInstallments}
      installmentConfigOpen={configOpen}
      onToggleInstallmentConfig={() => setConfigOpen((v) => !v)}
      saving={false}
      installmentSlot={
        <p className="text-sm text-muted-foreground">
          [InstallmentSettings editor renders here in the real app]
        </p>
      }
    />
  );
}

function Harness() {
  const { t: tSettings } = useTranslation('settings');
  const [payout, setPayout] = useState<PayoutType>('standard');
  const [method, setMethod] = useState('ideal');
  const [fund, setFund] = useState(true);
  const [how, setHow] = useState(true);
  const [fees, setFees] = useState(true);
  const [currency, setCurrency] = useState(false);
  const [methods, setMethods] = useState<string[]>(['ideal', 'cards']);
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
                <div className="min-w-0 flex-1 space-y-6 pb-24">
                  <PayAndBookHeader
                    enabled
                    onToggle={noop}
                    isSetupComplete
                    hasStripeAccount
                  />

                  <Divider label="Stripe account — connected" />
                  <StripeAccountSection
                    state="complete"
                    account={ACCOUNT_COMPLETE}
                    isTestMode
                    stripeLoading={false}
                    onOpenDashboard={noop}
                    onRefresh={noop}
                    onReset={noop}
                    onStartOnboarding={noop}
                    onResearch={noop}
                  />

                  <SettingsSection
                    icon={CreditCard}
                    title={tSettings('settings.payments.methods.sectionTitle', 'Payment methods')}
                    description={tSettings('settings.payments.methods.sectionDescription', 'Choose which methods customers can pay with.')}
                  >
                    <PaymentOptions
                      selectedMethods={methods}
                      onSelectionChange={setMethods}
                      onSave={noop}
                      onFeesOpen={() => setFees(true)}
                      hasUnsavedChanges
                    />
                  </SettingsSection>

                  <PayoutOptionsSection
                    selected={payout}
                    onSelect={setPayout}
                    selectedPaymentMethod={method}
                    onSelectPaymentMethod={setMethod}
                    paymentMethodsFees={FEES}
                    calculateTotalFee={calcFee}
                    hasUnsavedChanges
                    saving={false}
                    onSave={noop}
                  />

                  <Divider label="Flexibility — payment required" />
                  <FlexibilityDemo required />
                  <Divider label="Flexibility — payment optional" />
                  <FlexibilityDemo required={false} />
                  <Divider label="Flexibility, payment optional (non-Pro: installments locked)" />
                  <FlexibilityDemo required={false} canUseInstallments={false} />

                  <SettingsSection icon={Info} title={tSettings('settings.payments.howPaymentsWork', 'How payments work')} flush>
                    <div className="divide-y divide-white/[0.05]">
                      <FundFlowSection open={fund} onOpenChange={setFund} onLearnMoreFees={() => setFees(true)} />
                      <HowItWorksSection open={how} onOpenChange={setHow} paymentRequired={false} onScrollTo={noop} />
                      <FeesSection open={fees} onOpenChange={setFees} onCurrencyInfo={() => setCurrency(true)} />
                    </div>
                  </SettingsSection>

                  <Divider label="Stripe account — not connected / incomplete" />
                  <StripeAccountSection
                    state="none"
                    account={null}
                    isTestMode
                    stripeLoading={false}
                    onOpenDashboard={noop}
                    onRefresh={noop}
                    onReset={noop}
                    onStartOnboarding={noop}
                    onResearch={noop}
                  />
                  <StripeAccountSection
                    state="incomplete"
                    account={ACCOUNT_INCOMPLETE}
                    isTestMode
                    stripeLoading={false}
                    onOpenDashboard={noop}
                    onRefresh={noop}
                    onReset={noop}
                    onStartOnboarding={noop}
                    onResearch={noop}
                  />
                </div>
              </div>
            </div>
          </div>
          <CurrencyConversionDialog open={currency} onOpenChange={setCurrency} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
