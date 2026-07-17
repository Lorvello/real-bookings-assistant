import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, CreditCard } from "lucide-react";
import { useCalendarContext } from "@/contexts/CalendarContext";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { useAccountRole } from "@/hooks/useAccountRole";
import { ResearchModal } from "./ResearchModal";
import { StripeModeIndicator } from "@/components/developer/StripeModeIndicator";
import { getStripeConfig, isTestMode } from "@/utils/stripeConfig";
import { useToast } from "@/hooks/use-toast";
import {
  deriveStripeAccountState,
  type BusinessStripeAccount,
} from "@/types/payments";
import { PaymentOptions } from "../payments/PaymentOptions";
import { InstallmentSettings } from "./InstallmentSettings";
import {
  DEFAULT_INSTALLMENT_SETTINGS,
  type InstallmentSettings as PersistedInstallmentSettings,
  useInstallmentSettings,
} from "@/hooks/useInstallmentSettings";
import { useUserStatus } from "@/contexts/UserStatusContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { SettingsSection } from "./SettingsSection";
import { PayAndBookHeader } from "./payments/PayAndBookHeader";
import { StripeAccountSection } from "./payments/StripeAccountSection";
import { PayoutOptionsSection } from "./payments/PayoutOptionsSection";
import { PaymentFlexibilitySection } from "./payments/PaymentFlexibilitySection";
import {
  FundFlowSection,
  HowItWorksSection,
  FeesSection,
} from "./payments/PaymentInfoSections";
import type { PayoutType } from "./payments/types";

/**
 * Pay & Book settings — Stripe Connect onboarding, payment methods, payout speed,
 * payment flexibility (refund policy + require/optional + installments) and the help
 * sections. This is the ORCHESTRATOR: it owns every hook, the cascade logic and the
 * Stripe handlers, and feeds pure presentational sections (settings/payments/*).
 */
export function PaymentSettingsTab() {
  const { t } = useTranslation("settings");
  const { isAccountOwner, accountOwnerId, loading, error, retry } =
    useAccountRole();

  if (loading) {
    return (
      <div
        className="flex min-h-[12rem] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        {t(
          "settings.payments.checkingOwnership",
          "Checking account ownership…",
        )}
      </div>
    );
  }

  if (error || (isAccountOwner && !accountOwnerId)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-3">
          <p>
            {t(
              "settings.payments.ownerCheckError",
              "We could not verify account ownership.",
            )}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            {t("settings.payments.retryOwnerCheck", "Try again")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!isAccountOwner) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t(
            "settings.payments.ownerOnly",
            "Only account owners can manage payment settings. Contact your account owner to configure Stripe Connect and payment options.",
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return <PaymentSettingsContent />;
}

function PaymentSettingsContent() {
  const { t } = useTranslation("settings");
  const { selectedCalendar } = useCalendarContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
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
  const {
    settings: installmentSettings,
    updateSettings: updateInstallmentSettings,
    ready: installmentSettingsReady,
  } = useInstallmentSettings();
  const effectiveInstallmentSettings =
    installmentSettings ?? DEFAULT_INSTALLMENT_SETTINGS;
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
  const [stripeAccount, setStripeAccount] =
    useState<BusinessStripeAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [refundPolicy, setRefundPolicy] = useState("");
  const [researchModal, setResearchModal] = useState<
    "no-shows" | "cashflow" | "compliance" | "professionalism" | null
  >(null);
  const [feesInfoOpen, setFeesInfoOpen] = useState(false);
  const [fundFlowOpen, setFundFlowOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["ideal"]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingMethods, setSavingMethods] = useState(false);
  // Local buffer for the payment-deadline input so we save on blur, not per keystroke.
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [installmentConfigOpen, setInstallmentConfigOpen] = useState(false);

  // Payout options state.
  const [selectedPayoutOption, setSelectedPayoutOption] =
    useState<PayoutType>("standard");
  const [hasUnsavedPayoutChanges, setHasUnsavedPayoutChanges] = useState(false);
  const stripeConfig = getStripeConfig();

  useEffect(() => {
    loadStripeAccount();

    // Handle return from Stripe onboarding.
    const success = searchParams.get("success");
    const refresh = searchParams.get("refresh");
    if (success === "true" || refresh === "true") {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("success");
      newParams.delete("refresh");
      setSearchParams(newParams);
      setTimeout(() => {
        handleRefreshAccount();
      }, 1000);
    }
    // useStripeConnect currently returns fresh handler identities on each render;
    // depending on them would turn this account load into a render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (settings) {
      setRefundPolicy(settings.refund_policy_text || "");
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
    const originalKey = [...original].sort().join(",");
    const currentKey = [...selectedMethods].sort().join(",");
    setHasUnsavedChanges(originalKey !== currentKey);
  }, [selectedMethods, settings?.enabled_payment_methods]);

  // Track changes to payout options.
  useEffect(() => {
    const original = settings?.payout_option ?? "standard";
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
        updateAllowedPaymentTiming(["pay_now"]),
        updateInstallmentSettings({ enabled: false }),
        togglePaymentRequired(true),
        togglePaymentOptional(false),
      ]);
    } else {
      await Promise.all([
        togglePaymentRequired(false),
        togglePaymentOptional(true),
      ]);
    }
  };

  const isPayOnSiteEnabled =
    settings?.allowed_payment_timing?.includes("pay_on_site") ?? false;

  const handleTogglePayOnSite = async (enabled: boolean) => {
    if (enabled && !settings?.secure_payments_enabled) {
      await toggleSecurePayments(true);
    }
    if (enabled && settings?.payment_required_for_booking) {
      await togglePaymentRequired(false);
    }
    const currentTimings = settings?.allowed_payment_timing || ["pay_now"];
    if (enabled) {
      const newTimings = [
        ...currentTimings.filter((t) => t !== "pay_on_site"),
        "pay_on_site",
      ];
      await updateAllowedPaymentTiming(newTimings);
    } else {
      const newTimings = currentTimings.filter((t) => t !== "pay_on_site");
      await updateAllowedPaymentTiming(
        newTimings.length > 0 ? newTimings : ["pay_now"],
      );
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

  const handleUpdateInstallmentSettings = async (
    settingsData: PersistedInstallmentSettings,
  ) => {
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
      console.error("[PAYMENT SETTINGS] Error loading Stripe account:", error);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleRefreshAccount = async () => {
    const account = await refreshAccountStatus();
    if (account) {
      setStripeAccount(account);
      toast({
        title: t(
          "settings.payments.toast.statusRefreshed.title",
          "Account status refreshed",
        ),
        description: t(
          "settings.payments.toast.statusRefreshed.description",
          "Your Stripe account status has been updated.",
        ),
      });
    }
  };

  const handleOpenStripeDashboard = async () => {
    try {
      const url = await createLoginLink();
      if (!url) throw new Error("NO_CONNECTED_ACCOUNT");
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        toast({
          title: t(
            "settings.payments.toast.popupBlocked.title",
            "Pop-up blocked",
          ),
          description: t(
            "settings.payments.toast.popupBlocked.dashboardDescription",
            "Your browser blocked the pop-up. Use the buttons to open the dashboard manually.",
          ),
          action: (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, "_blank")}
              >
                {t(
                  "settings.payments.toast.popupBlocked.tryAgain",
                  "Try again",
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast({
                    title: t(
                      "settings.payments.toast.linkCopied",
                      "Link copied to clipboard",
                    ),
                  });
                }}
              >
                {t(
                  "settings.payments.toast.popupBlocked.copyLink",
                  "Copy link",
                )}
              </Button>
            </div>
          ),
        });
        return;
      }
      toast({
        title: t("settings.payments.toast.success", "Success"),
        description: t(
          "settings.payments.toast.dashboardOpened",
          "Stripe dashboard opened in a new tab.",
        ),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to open dashboard";
      if (errorMessage === "NO_CONNECTED_ACCOUNT") {
        toast({
          title: t(
            "settings.payments.toast.noAccount.title",
            "No Stripe account",
          ),
          description: t(
            "settings.payments.toast.noAccount.description",
            "Please complete Stripe onboarding first.",
          ),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("settings.payments.toast.error", "Error"),
          description: t(
            "settings.payments.toast.dashboardFailed",
            "Failed to open Stripe dashboard.",
          ),
          variant: "destructive",
        });
      }
    }
  };

  const handleStartOnboarding = async () => {
    try {
      const onboardingLink = await createOnboardingLink();
      if (onboardingLink?.url) {
        const newWindow = window.open(
          onboardingLink.url,
          "_blank",
          "noopener,noreferrer",
        );
        if (!newWindow) {
          toast({
            title: t(
              "settings.payments.toast.popupBlocked.title",
              "Pop-up blocked",
            ),
            description: t(
              "settings.payments.toast.popupBlocked.onboardingDescription",
              "Your browser blocked the pop-up. Use the buttons to start onboarding.",
            ),
            action: (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(onboardingLink.url, "_blank")}
                >
                  {t(
                    "settings.payments.toast.popupBlocked.openOnboarding",
                    "Open onboarding",
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(onboardingLink.url);
                    toast({
                      title: t(
                        "settings.payments.toast.linkCopied",
                        "Link copied to clipboard",
                      ),
                    });
                  }}
                >
                  {t(
                    "settings.payments.toast.popupBlocked.copyLink",
                    "Copy link",
                  )}
                </Button>
              </div>
            ),
          });
        } else {
          toast({
            title: t(
              "settings.payments.toast.onboardingStarted.title",
              "Onboarding started",
            ),
            description: t(
              "settings.payments.toast.onboardingStarted.description",
              "Complete the setup in the new tab, then return here.",
            ),
          });
        }
      }
    } catch (error) {
      toast({
        title: t("settings.payments.toast.error", "Error"),
        description: t(
          "settings.payments.toast.onboardingFailed",
          "Failed to start onboarding.",
        ),
        variant: "destructive",
      });
    }
  };

  const handleResetStripeConnection = async () => {
    const success = await resetStripeAccount();
    if (success) {
      setStripeAccount(null);
      toast({
        title: t(
          "settings.payments.toast.accountReset.title",
          "Stripe account reset",
        ),
        description: t(
          "settings.payments.toast.accountReset.description",
          "Your Stripe connection has been reset. You can connect a new account.",
        ),
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
        title: t("settings.payments.toast.error", "Error"),
        description: t(
          "settings.payments.toast.selectAtLeastOne",
          "Please select at least one payment method.",
        ),
        variant: "destructive",
      });
      return;
    }
    setSavingMethods(true);
    try {
      const success = await updatePaymentMethods(selectedMethods);
      if (!success) return;
      if (stripeAccount?.stripe_account_id && selectedCalendar?.id) {
        try {
          const { error } = await supabase.functions.invoke(
            "sync-payment-methods",
            {
              body: {
                payment_methods: selectedMethods,
                calendar_id: selectedCalendar.id,
                test_mode: isTestMode(),
              },
            },
          );
          if (error) throw error;
        } catch (syncError) {
          console.warn(
            "Stripe sync failed, but settings saved locally:",
            syncError,
          );
        }
      }
      setHasUnsavedChanges(false);
      toast({
        title: t("settings.payments.toast.success", "Success"),
        description: t(
          "settings.payments.toast.methodsSaved",
          "Payment methods saved successfully.",
        ),
      });
    } catch (error) {
      console.error("Error saving payment methods:", error);
      toast({
        title: t("settings.payments.toast.error", "Error"),
        description: t(
          "settings.payments.toast.methodsFailed",
          "Failed to save payment methods.",
        ),
        variant: "destructive",
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
          title: t("settings.payments.toast.success", "Success"),
          description: t(
            "settings.payments.toast.payoutSaved",
            "Payout option saved successfully.",
          ),
        });
      }
    } catch (error) {
      console.error("Error saving payout option:", error);
      toast({
        title: t("settings.payments.toast.error", "Error"),
        description: t(
          "settings.payments.toast.payoutFailed",
          "Failed to save payout option.",
        ),
        variant: "destructive",
      });
    } finally {
      setSavingMethods(false);
    }
  };

  const handleDeadlineBlur = () => {
    const h = Math.max(1, parseInt(deadlineHours || "24", 10) || 24);
    setDeadlineHours(String(h));
    if (h !== (settings?.payment_deadline_hours ?? 24))
      updateSettings({ payment_deadline_hours: h });
  };

  const scrollToSection = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const handleLearnMoreFees = () => {
    setFeesInfoOpen(true);
    setTimeout(() => scrollToSection("fees-section"), 100);
  };

  // The outer owner gate has already resolved before this component can mount.
  if (settingsLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">
          {t("settings.payments.loadingLabel", "Loading payment settings")}
        </span>
        {/* Pay & Book header */}
        <div className="surface-raised rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="shimmer h-5 w-40 rounded bg-white/[0.06]" />
              <div className="shimmer h-4 w-64 rounded bg-white/[0.05]" />
            </div>
            <div className="shimmer h-6 w-11 rounded-full bg-white/[0.06]" />
          </div>
        </div>
        {/* Stripe account card */}
        <div className="surface-raised rounded-xl p-6 space-y-3">
          <div className="shimmer h-4 w-28 rounded bg-white/[0.06]" />
          <div className="shimmer h-9 w-48 rounded-md bg-white/[0.05]" />
        </div>
        {/* Option rows */}
        <div className="surface-raised rounded-xl p-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="shimmer h-4 w-44 rounded bg-white/[0.06]" />
                <div className="shimmer h-3 w-56 rounded bg-white/[0.04]" />
              </div>
              <div className="shimmer h-6 w-11 rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // BUG-A FIX: a persisted Connect row whose `environment` differs from the app's
  // current Stripe mode must NOT collapse to "not connected". getStripeAccount now
  // returns the persisted row regardless of environment (account_owner_id scoped),
  // PREFERRING the current-mode row. We only treat it as the in-mode account when its
  // environment matches; otherwise it surfaces as the 'other-environment' state (the
  // connection persisted, the owner just needs to finish onboarding in this mode).
  const currentStripeMode = stripeConfig.mode;
  const accountMatchesMode =
    !!stripeAccount && stripeAccount.environment === currentStripeMode;
  const hasStripeAccount =
    accountMatchesMode && !!stripeAccount?.stripe_account_id;
  const isStripeSetupComplete =
    accountMatchesMode &&
    !!stripeAccount?.onboarding_completed &&
    !!stripeAccount?.charges_enabled &&
    !!stripeAccount?.payouts_enabled;
  // State derivation lives in one shared pure fn (src/types/payments.ts) so the UI and
  // the persistence test can never drift (FQ-2-obs). Loading is decided here first.
  const accountState = accountLoading
    ? "loading"
    : deriveStripeAccountState(stripeAccount ?? null, currentStripeMode);
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
              title={t(
                "settings.payments.methods.sectionTitle",
                "Payment methods",
              )}
              description={t(
                "settings.payments.methods.sectionDescription",
                "Choose which methods customers can pay with.",
              )}
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
              onToggleAutoCancel={(checked) =>
                updateSettings(
                  { auto_cancel_unpaid_bookings: checked },
                  {
                    optimistic: true,
                    settingLabel: t(
                      "settings.payments.setting.autoCancel",
                      "Auto-cancel unpaid bookings",
                    ),
                  },
                )
              }
              payOnSiteEnabled={isPayOnSiteEnabled}
              onTogglePayOnSite={handleTogglePayOnSite}
              installmentsEnabled={effectiveInstallmentSettings.enabled}
              onToggleInstallments={handleToggleInstallments}
              canUseInstallments={canUseInstallments}
              installmentsReady={installmentSettingsReady}
              installmentConfigOpen={installmentConfigOpen}
              onToggleInstallmentConfig={() =>
                setInstallmentConfigOpen(!installmentConfigOpen)
              }
              saving={settingsSaving}
              installmentSlot={
                <InstallmentSettings
                  installmentsEnabled={effectiveInstallmentSettings.enabled}
                  defaultPlan={effectiveInstallmentSettings.defaultPlan}
                  allowCustomerChoice={
                    effectiveInstallmentSettings.allowCustomerChoice
                  }
                  applyToServices={effectiveInstallmentSettings.applyToServices}
                  selectedServices={
                    effectiveInstallmentSettings.selectedServices
                  }
                  serviceConfigs={effectiveInstallmentSettings.serviceConfigs}
                  onUpdate={handleUpdateInstallmentSettings}
                  subscriptionTier={profile?.subscription_tier || "free"}
                />
              }
            />
          </div>

          <SettingsSection
            icon={Info}
            title={t("settings.payments.howPaymentsWork", "How payments work")}
            flush
          >
            <div className="divide-y divide-white/[0.05]">
              <FundFlowSection
                open={fundFlowOpen}
                onOpenChange={setFundFlowOpen}
                onLearnMoreFees={handleLearnMoreFees}
              />
              <HowItWorksSection
                open={howItWorksOpen}
                onOpenChange={setHowItWorksOpen}
                paymentRequired={paymentRequired}
                onScrollTo={scrollToSection}
              />
              <FeesSection open={feesInfoOpen} onOpenChange={setFeesInfoOpen} />
            </div>
          </SettingsSection>
        </>
      )}

      <ResearchModal
        type={researchModal}
        onClose={() => setResearchModal(null)}
      />
    </div>
  );
}
