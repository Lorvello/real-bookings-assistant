import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Info, CreditCard } from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useAccountRole } from '@/hooks/useAccountRole';
import { ResearchModal } from './ResearchModal';
import { StripeModeIndicator } from '@/components/developer/StripeModeIndicator';
import { getStripeConfig, isTestMode } from '@/utils/stripeConfig';
import { useToast } from '@/hooks/use-toast';
import type { BusinessStripeAccount } from '@/types/payments';
import { PaymentOptions } from '../payments/PaymentOptions';
import { InstallmentSettings } from './InstallmentSettings';
import { useInstallmentSettings } from '@/hooks/useInstallmentSettings';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { SettingsSection } from './SettingsSection';
import { PayAndBookHeader } from './payments/PayAndBookHeader';
import { StripeAccountSection } from './payments/StripeAccountSection';
import { PayoutOptionsSection } from './payments/PayoutOptionsSection';
import { PaymentFlexibilitySection } from './payments/PaymentFlexibilitySection';
import { FundFlowSection, HowItWorksSection, FeesSection } from './payments/PaymentInfoSections';
import { CurrencyConversionDialog } from './payments/CurrencyConversionDialog';
import type { PaymentMethodFee, PayoutType } from './payments/types';

// Stripe + platform fee schedule shown in the payout fee-breakdown example.
const PAYMENT_METHOD_FEES: PaymentMethodFee[] = [
  { id: 'ideal', name: 'iDEAL', fee: '€0.29', feeType: 'fixed' },
  { id: 'cards_eea', name: 'Cards (EEA)', fee: '1.5% + €0.25', feeType: 'percentage' },
  { id: 'cards_uk', name: 'Cards (UK)', fee: '2.5% + €0.25', feeType: 'percentage' },
  { id: 'cards_international', name: 'Cards (International)', fee: '3.25% + €0.25', feeType: 'percentage' },
  { id: 'apple_pay', name: 'Apple Pay', fee: '1.5% + €0.25', feeType: 'percentage' },
  { id: 'bancontact', name: 'Bancontact', fee: '€0.35', feeType: 'fixed' },
  { id: 'blik', name: 'BLIK', fee: '1.6% + €0.25', feeType: 'percentage' },
  { id: 'twint', name: 'TWINT', fee: '1.9% + 0.30', feeType: 'percentage' },
  { id: 'revolut_pay', name: 'Revolut Pay', fee: '1.5% + €0.25', feeType: 'percentage' },
  { id: 'sofort', name: 'Sofort', fee: '1.4% + €0.25', feeType: 'percentage' },
  { id: 'eps', name: 'EPS', fee: '1.6% + €0.25', feeType: 'percentage' },
  { id: 'przelewy24', name: 'Przelewy24', fee: '2.2% + €0.30', feeType: 'percentage' },
  { id: 'pay_by_bank', name: 'Pay by Bank', fee: '1.5% + €0.20', feeType: 'percentage' },
  { id: 'cartes_bancaires', name: 'Cartes Bancaires', fee: '1.5% + €0.25', feeType: 'percentage' },
  { id: 'google_pay', name: 'Google Pay', fee: '1.5% + €0.25', feeType: 'percentage' },
];

/**
 * Pay & Book settings — Stripe Connect onboarding, payment methods, payout speed,
 * payment flexibility (refund policy + require/optional + installments) and the help
 * sections. This is the ORCHESTRATOR: it owns every hook, the cascade logic and the
 * Stripe handlers, and feeds pure presentational sections (settings/payments/*).
 */
export function PaymentSettingsTab() {
  const { t } = useTranslation('settings');
  // Total-fee example for the payout cards (platform + Stripe + method).
  const calculateTotalFee = (payoutType: PayoutType, paymentMethod: string) => {
    const method = PAYMENT_METHOD_FEES.find((m) => m.id === paymentMethod);
    if (!method) return 'N/A';

    // Mirror of backend DEFAULT_PLATFORM_FEE_PERCENT (0.019) in feeCalculator.ts;
    // parity enforced by src/tests/integration/platformFeeConstant.test.ts.
    const platformPercentage = 1.9;
    const platformFixed = payoutType === 'standard' ? 0.25 : 0.35;
    const stripePercentage = payoutType === 'standard' ? 0.25 : 1.0;
    const stripeFixed = payoutType === 'standard' ? 0.1 : 0;

    if (method.feeType === 'fixed') {
      const methodFixed = parseFloat(method.fee.replace(/[€£CHF]/g, '').replace(/[^0-9.]/g, ''));
      const totalPercentage = platformPercentage + stripePercentage;
      const totalFixed = platformFixed + stripeFixed + methodFixed;
      return `${totalPercentage}% + €${totalFixed.toFixed(2)}`;
    }
    const parts = method.fee.split(' + ');
    const methodPercentage = parseFloat(parts[0].replace('%', ''));
    const methodFixed = parts[1] ? parseFloat(parts[1].replace(/[€£CHF]/g, '').replace(/[^0-9.]/g, '')) : 0;
    const totalPercentage = platformPercentage + stripePercentage + methodPercentage;
    const totalFixed = platformFixed + stripeFixed + methodFixed;
    return `${totalPercentage.toFixed(2)}% + €${totalFixed.toFixed(2)}`;
  };

  const { selectedCalendar } = useCalendarContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAccountOwner, accountOwnerId, loading: roleLoading } = useAccountRole();
  const {
    settings,
    loading: settingsLoading,
    saving: settingsSaving,
    updateSettings,
    toggleSecurePayments,
    togglePaymentRequired,
    togglePaymentOptional,
    updatePaymentMethods,
    updatePayoutOption,
    updateAllowedPaymentTiming,
  } = usePaymentSettings(selectedCalendar?.id);
  const {
    loading: stripeLoading,
    getStripeAccount,
    refreshAccountStatus,
    createLoginLink,
    createOnboardingLink,
    resetStripeAccount,
  } = useStripeConnect();
  const { settings: installmentSettings, updateSettings: updateInstallmentSettings } = useInstallmentSettings();
  const { accessControl } = useUserStatus();
  const { profile } = useProfile();
  // Installments are a Professional/Enterprise feature, matching the edge fn's
  // server-side tier gate (manage-installment-settings checks subscription_tier IN
  // ('professional','enterprise')). We gate the toggle on the REAL tier entitlement,
  // NOT userStatus.hasFullAccess (true for ANY trial/subscriber regardless of tier,
  // which let non-pro users fire a call the backend rejects with a 500/403). We reuse
  // accessControl.canAccessTaxCompliance: in UserStatusContext it resolves true for
  // exactly professional + enterprise + admin, and already folds in the admin bypass
  // and the subscribers-table tier reconciliation (so a confirmed paid customer with a
  // null users.subscription_tier mirror is not wrongly locked out).
  const canUseInstallments = accessControl.canAccessTaxCompliance;
  const [stripeAccount, setStripeAccount] = useState<BusinessStripeAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [refundPolicy, setRefundPolicy] = useState('');
  const [researchModal, setResearchModal] = useState<'no-shows' | 'cashflow' | 'compliance' | 'professionalism' | null>(null);
  const [feesInfoOpen, setFeesInfoOpen] = useState(false);
  const [fundFlowOpen, setFundFlowOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [currencyConversionModalOpen, setCurrencyConversionModalOpen] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['ideal']);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingMethods, setSavingMethods] = useState(false);
  // Local buffer for the payment-deadline input so we save on blur, not per keystroke.
  const [deadlineHours, setDeadlineHours] = useState('24');
  const [installmentConfigOpen, setInstallmentConfigOpen] = useState(false);

  // Payout options state.
  const [selectedPayoutOption, setSelectedPayoutOption] = useState<PayoutType>('standard');
  const [hasUnsavedPayoutChanges, setHasUnsavedPayoutChanges] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ideal');
  const stripeConfig = getStripeConfig();

  useEffect(() => {
    if (isAccountOwner && accountOwnerId && !roleLoading) {
      loadStripeAccount();

      // Handle return from Stripe onboarding.
      const success = searchParams.get('success');
      const refresh = searchParams.get('refresh');
      if (success === 'true' || refresh === 'true') {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('success');
        newParams.delete('refresh');
        setSearchParams(newParams);
        setTimeout(() => {
          handleRefreshAccount();
        }, 1000);
      }
    }
  }, [isAccountOwner, accountOwnerId, roleLoading, searchParams, setSearchParams]);

  useEffect(() => {
    if (settings) {
      setRefundPolicy(settings.refund_policy_text || '');
      setDeadlineHours(String(settings.payment_deadline_hours ?? 24));
    }
  }, [settings]);

  // Load saved payment methods + payout option.
  useEffect(() => {
    if (settings?.enabled_payment_methods) {
      setSelectedMethods(settings.enabled_payment_methods);
      setHasUnsavedChanges(false);
    }
    if (settings?.payout_option) {
      setSelectedPayoutOption(settings.payout_option);
      setHasUnsavedPayoutChanges(false);
    }
  }, [settings?.enabled_payment_methods, settings?.payout_option]);

  // Track changes to payment methods.
  useEffect(() => {
    const original = settings?.enabled_payment_methods ?? [];
    const originalKey = [...original].sort().join(',');
    const currentKey = [...selectedMethods].sort().join(',');
    setHasUnsavedChanges(originalKey !== currentKey);
  }, [selectedMethods, settings?.enabled_payment_methods]);

  // Track changes to payout options.
  useEffect(() => {
    const original = settings?.payout_option ?? 'standard';
    setHasUnsavedPayoutChanges(original !== selectedPayoutOption);
  }, [selectedPayoutOption, settings?.payout_option]);

  // Disabling Pay & Book cascades: reset installments.
  const handleToggleSecurePayments = async (enabled: boolean) => {
    const success = await toggleSecurePayments(enabled);
    if (success && !enabled) {
      await updateInstallmentSettings({ enabled: false });
      setInstallmentConfigOpen(false);
    }
  };

  // Make Payment Optional — auto-enables Pay & Book; keeps payment_required + payment_optional coherent.
  const handleTogglePaymentOptional = async (optional: boolean) => {
    if (optional && !settings?.secure_payments_enabled) {
      await toggleSecurePayments(true);
    }
    if (!optional) {
      setInstallmentConfigOpen(false);
      await Promise.all([
        updateAllowedPaymentTiming(['pay_now']),
        updateInstallmentSettings({ enabled: false }),
        togglePaymentRequired(true),
        togglePaymentOptional(false),
      ]);
    } else {
      await Promise.all([togglePaymentRequired(false), togglePaymentOptional(true)]);
    }
  };

  const isPayOnSiteEnabled = settings?.allowed_payment_timing?.includes('pay_on_site') ?? false;

  const handleTogglePayOnSite = async (enabled: boolean) => {
    if (enabled && !settings?.secure_payments_enabled) {
      await toggleSecurePayments(true);
    }
    if (enabled && settings?.payment_required_for_booking) {
      await togglePaymentRequired(false);
    }
    const currentTimings = settings?.allowed_payment_timing || ['pay_now'];
    if (enabled) {
      const newTimings = [...currentTimings.filter((t) => t !== 'pay_on_site'), 'pay_on_site'];
      await updateAllowedPaymentTiming(newTimings);
    } else {
      const newTimings = currentTimings.filter((t) => t !== 'pay_on_site');
      await updateAllowedPaymentTiming(newTimings.length > 0 ? newTimings : ['pay_now']);
    }
  };

  const handleToggleInstallments = async (enabled: boolean) => {
    if (enabled && !settings?.secure_payments_enabled) {
      await toggleSecurePayments(true);
    }
    if (enabled && settings?.payment_required_for_booking) {
      await togglePaymentRequired(false);
    }
    return await updateInstallmentSettings({ enabled });
  };

  const handleUpdateInstallmentSettings = async (settingsData: any) => {
    if (settingsData.enabled && !settings?.secure_payments_enabled) {
      await toggleSecurePayments(true);
    }
    if (settingsData.enabled && settings?.payment_required_for_booking) {
      await togglePaymentRequired(false);
    }
    return await updateInstallmentSettings(settingsData);
  };

  const loadStripeAccount = async () => {
    setAccountLoading(true);
    try {
      const account = await getStripeAccount();
      setStripeAccount(account);
    } catch (error) {
      console.error('[PAYMENT SETTINGS] Error loading Stripe account:', error);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleRefreshAccount = async () => {
    const account = await refreshAccountStatus();
    if (account) {
      setStripeAccount(account);
      toast({
        title: t('settings.payments.toast.statusRefreshed.title', 'Account status refreshed'),
        description: t('settings.payments.toast.statusRefreshed.description', 'Your Stripe account status has been updated.'),
      });
    }
  };

  const handleOpenStripeDashboard = async () => {
    try {
      const url = await createLoginLink();
      if (!url) throw new Error('NO_CONNECTED_ACCOUNT');
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        toast({
          title: t('settings.payments.toast.popupBlocked.title', 'Pop-up blocked'),
          description: t('settings.payments.toast.popupBlocked.dashboardDescription', 'Your browser blocked the pop-up. Use the buttons to open the dashboard manually.'),
          action: (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
                {t('settings.payments.toast.popupBlocked.tryAgain', 'Try again')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast({ title: t('settings.payments.toast.linkCopied', 'Link copied to clipboard') });
                }}
              >
                {t('settings.payments.toast.popupBlocked.copyLink', 'Copy link')}
              </Button>
            </div>
          ),
        });
        return;
      }
      toast({
        title: t('settings.payments.toast.success', 'Success'),
        description: t('settings.payments.toast.dashboardOpened', 'Stripe dashboard opened in a new tab.'),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open dashboard';
      if (errorMessage === 'NO_CONNECTED_ACCOUNT') {
        toast({
          title: t('settings.payments.toast.noAccount.title', 'No Stripe account'),
          description: t('settings.payments.toast.noAccount.description', 'Please complete Stripe onboarding first.'),
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('settings.payments.toast.error', 'Error'),
          description: t('settings.payments.toast.dashboardFailed', 'Failed to open Stripe dashboard.'),
          variant: 'destructive',
        });
      }
    }
  };

  const handleStartOnboarding = async () => {
    try {
      const onboardingLink = await createOnboardingLink();
      if (onboardingLink?.url) {
        const newWindow = window.open(onboardingLink.url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          toast({
            title: t('settings.payments.toast.popupBlocked.title', 'Pop-up blocked'),
            description: t('settings.payments.toast.popupBlocked.onboardingDescription', 'Your browser blocked the pop-up. Use the buttons to start onboarding.'),
            action: (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(onboardingLink.url, '_blank')}>
                  {t('settings.payments.toast.popupBlocked.openOnboarding', 'Open onboarding')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(onboardingLink.url);
                    toast({ title: t('settings.payments.toast.linkCopied', 'Link copied to clipboard') });
                  }}
                >
                  {t('settings.payments.toast.popupBlocked.copyLink', 'Copy link')}
                </Button>
              </div>
            ),
          });
        } else {
          toast({
            title: t('settings.payments.toast.onboardingStarted.title', 'Onboarding started'),
            description: t('settings.payments.toast.onboardingStarted.description', 'Complete the setup in the new tab, then return here.'),
          });
        }
      }
    } catch (error) {
      toast({
        title: t('settings.payments.toast.error', 'Error'),
        description: t('settings.payments.toast.onboardingFailed', 'Failed to start onboarding.'),
        variant: 'destructive',
      });
    }
  };

  const handleResetStripeConnection = async () => {
    const success = await resetStripeAccount();
    if (success) {
      setStripeAccount(null);
      toast({
        title: t('settings.payments.toast.accountReset.title', 'Stripe account reset'),
        description: t('settings.payments.toast.accountReset.description', 'Your Stripe connection has been reset. You can connect a new account.'),
      });
      await loadStripeAccount();
    }
  };

  // Saves ONLY refund_policy_text: platform_fee is fixed (1.9%, R87) and the deadline
  // saves on blur. The value flows via business_overview to the AI agent.
  const handleUpdateSettings = async () => {
    await updateSettings({ refund_policy_text: refundPolicy });
  };

  // AS-3: a preset writes its canonical sentence into refund_policy_text directly.
  // We set local state AND persist with the explicit text (not the async-stale state),
  // so a single click both reflects the choice and saves it for the agent.
  const handleSelectRefundPreset = async (text: string) => {
    setRefundPolicy(text);
    await updateSettings({ refund_policy_text: text });
  };

  const handleSavePaymentMethods = async () => {
    if (!selectedMethods.length) {
      toast({
        title: t('settings.payments.toast.error', 'Error'),
        description: t('settings.payments.toast.selectAtLeastOne', 'Please select at least one payment method.'),
        variant: 'destructive',
      });
      return;
    }
    setSavingMethods(true);
    try {
      const success = await updatePaymentMethods(selectedMethods);
      if (!success) return;
      if (stripeAccount?.stripe_account_id && selectedCalendar?.id) {
        try {
          const { error } = await supabase.functions.invoke('sync-payment-methods', {
            body: { payment_methods: selectedMethods, calendar_id: selectedCalendar.id, test_mode: isTestMode() },
          });
          if (error) throw error;
        } catch (syncError) {
          console.warn('Stripe sync failed, but settings saved locally:', syncError);
        }
      }
      setHasUnsavedChanges(false);
      toast({
        title: t('settings.payments.toast.success', 'Success'),
        description: t('settings.payments.toast.methodsSaved', 'Payment methods saved successfully.'),
      });
    } catch (error) {
      console.error('Error saving payment methods:', error);
      toast({
        title: t('settings.payments.toast.error', 'Error'),
        description: t('settings.payments.toast.methodsFailed', 'Failed to save payment methods.'),
        variant: 'destructive',
      });
    } finally {
      setSavingMethods(false);
    }
  };

  const handleSavePayoutOption = async (option: PayoutType) => {
    setSavingMethods(true);
    try {
      const success = await updatePayoutOption(option);
      if (success) {
        setHasUnsavedPayoutChanges(false);
        toast({
          title: t('settings.payments.toast.success', 'Success'),
          description: t('settings.payments.toast.payoutSaved', 'Payout option saved successfully.'),
        });
      }
    } catch (error) {
      console.error('Error saving payout option:', error);
      toast({
        title: t('settings.payments.toast.error', 'Error'),
        description: t('settings.payments.toast.payoutFailed', 'Failed to save payout option.'),
        variant: 'destructive',
      });
    } finally {
      setSavingMethods(false);
    }
  };

  const handleDeadlineBlur = () => {
    const h = Math.max(1, parseInt(deadlineHours || '24', 10) || 24);
    setDeadlineHours(String(h));
    if (h !== (settings?.payment_deadline_hours ?? 24)) updateSettings({ payment_deadline_hours: h });
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const handleLearnMoreFees = () => {
    setFeesInfoOpen(true);
    setTimeout(() => scrollToSection('fees-section'), 100);
  };

  if (settingsLoading || roleLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAccountOwner) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('settings.payments.ownerOnly', 'Only account owners can manage payment settings. Contact your account owner to configure Stripe Connect and payment options.')}
        </AlertDescription>
      </Alert>
    );
  }

  // BUG-A FIX: a persisted Connect row whose `environment` differs from the app's
  // current Stripe mode must NOT collapse to "not connected". getStripeAccount now
  // returns the persisted row regardless of environment (account_owner_id scoped),
  // PREFERRING the current-mode row. We only treat it as the in-mode account when its
  // environment matches; otherwise it surfaces as the 'other-environment' state (the
  // connection persisted, the owner just needs to finish onboarding in this mode).
  const currentStripeMode = stripeConfig.mode;
  const accountMatchesMode = !!stripeAccount && stripeAccount.environment === currentStripeMode;
  const hasStripeAccount = accountMatchesMode && !!stripeAccount?.stripe_account_id;
  const isStripeSetupComplete =
    accountMatchesMode &&
    !!stripeAccount?.onboarding_completed &&
    !!stripeAccount?.charges_enabled &&
    !!stripeAccount?.payouts_enabled;
  const hasOtherEnvAccount = !!stripeAccount?.stripe_account_id && !accountMatchesMode;
  const accountState = accountLoading
    ? 'loading'
    : isStripeSetupComplete
      ? 'complete'
      : hasStripeAccount
        ? 'incomplete'
        : hasOtherEnvAccount
          ? 'other-environment'
          : 'none';
  const paymentRequired = settings?.payment_required_for_booking ?? true;

  return (
    <div className="space-y-6">
      {stripeConfig.isTestMode && <StripeModeIndicator />}

      <PayAndBookHeader
        enabled={settings?.secure_payments_enabled || false}
        onToggle={handleToggleSecurePayments}
        disabled={settingsSaving}
        isSetupComplete={!!isStripeSetupComplete}
        hasStripeAccount={hasStripeAccount}
      />

      <StripeAccountSection
        state={accountState}
        account={stripeAccount}
        isTestMode={stripeConfig.isTestMode}
        currentMode={currentStripeMode}
        stripeLoading={stripeLoading}
        onOpenDashboard={handleOpenStripeDashboard}
        onRefresh={handleRefreshAccount}
        onReset={handleResetStripeConnection}
        onStartOnboarding={handleStartOnboarding}
        onResearch={setResearchModal}
      />

      {isStripeSetupComplete && (
        <>
          <div id="payment-methods-section" className="scroll-mt-8">
            <SettingsSection
              icon={CreditCard}
              title={t('settings.payments.methods.sectionTitle', 'Payment methods')}
              description={t('settings.payments.methods.sectionDescription', 'Choose which methods customers can pay with.')}
            >
              <PaymentOptions
                selectedMethods={selectedMethods}
                onSelectionChange={setSelectedMethods}
                onSave={handleSavePaymentMethods}
                onFeesOpen={() => setFeesInfoOpen(true)}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            </SettingsSection>
          </div>

          <div id="payout-options-section" className="scroll-mt-8">
            <PayoutOptionsSection
              selected={selectedPayoutOption}
              onSelect={setSelectedPayoutOption}
              selectedPaymentMethod={selectedPaymentMethod}
              onSelectPaymentMethod={setSelectedPaymentMethod}
              paymentMethodsFees={PAYMENT_METHOD_FEES}
              calculateTotalFee={calculateTotalFee}
              hasUnsavedChanges={hasUnsavedPayoutChanges}
              saving={savingMethods}
              onSave={() => handleSavePayoutOption(selectedPayoutOption)}
            />
          </div>

          <div id="payment-flexibility-section" className="scroll-mt-8">
            <PaymentFlexibilitySection
              refundPolicy={refundPolicy}
              onRefundPolicyChange={setRefundPolicy}
              onSaveRefundPolicy={handleUpdateSettings}
              onSelectRefundPreset={handleSelectRefundPreset}
              savingRefundPolicy={settingsSaving}
              paymentRequired={paymentRequired}
              onToggleOptional={handleTogglePaymentOptional}
              deadlineHours={deadlineHours}
              onDeadlineChange={setDeadlineHours}
              onDeadlineBlur={handleDeadlineBlur}
              autoCancel={!!settings?.auto_cancel_unpaid_bookings}
              onToggleAutoCancel={(checked) => updateSettings({ auto_cancel_unpaid_bookings: checked })}
              payOnSiteEnabled={isPayOnSiteEnabled}
              onTogglePayOnSite={handleTogglePayOnSite}
              installmentsEnabled={installmentSettings?.enabled || false}
              onToggleInstallments={handleToggleInstallments}
              canUseInstallments={canUseInstallments}
              installmentConfigOpen={installmentConfigOpen}
              onToggleInstallmentConfig={() => setInstallmentConfigOpen(!installmentConfigOpen)}
              saving={settingsSaving}
              installmentSlot={
                <InstallmentSettings
                  installmentsEnabled={installmentSettings?.enabled || false}
                  defaultPlan={
                    installmentSettings?.defaultPlan || {
                      type: 'preset',
                      preset: '50_50',
                      deposits: [
                        { percentage: 50, timing: 'now' },
                        { percentage: 50, timing: 'appointment' },
                      ],
                    }
                  }
                  onUpdate={handleUpdateInstallmentSettings}
                  subscriptionTier={profile?.subscription_tier || 'free'}
                />
              }
            />
          </div>

          <SettingsSection icon={Info} title={t('settings.payments.howPaymentsWork', 'How payments work')} flush>
            <div className="divide-y divide-white/[0.05]">
              <FundFlowSection open={fundFlowOpen} onOpenChange={setFundFlowOpen} onLearnMoreFees={handleLearnMoreFees} />
              <HowItWorksSection
                open={howItWorksOpen}
                onOpenChange={setHowItWorksOpen}
                paymentRequired={paymentRequired}
                onScrollTo={scrollToSection}
              />
              <FeesSection open={feesInfoOpen} onOpenChange={setFeesInfoOpen} onCurrencyInfo={() => setCurrencyConversionModalOpen(true)} />
            </div>
          </SettingsSection>
        </>
      )}

      <ResearchModal type={researchModal} onClose={() => setResearchModal(null)} />
      <CurrencyConversionDialog open={currencyConversionModalOpen} onOpenChange={setCurrencyConversionModalOpen} />
    </div>
  );
}
