import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Loader2,
  Shield,
  ArrowRight,
  Check,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  TestTube,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsSection } from '../SettingsSection';
import type { BusinessStripeAccount } from '@/types/payments';

// The raw Stripe account id (acct_…) is a developer/support detail, not something a
// salon owner needs front-and-centre — tuck it behind a collapsed "Technical details"
// disclosure (D4: hide dev-internals). Keeps it reachable for support without clutter.
function AccountTechnicalDetails({ accountId, isTestMode }: { accountId: string; isTestMode: boolean }) {
  const { t } = useTranslation('settings');
  return (
    <details className="group mt-4">
      <summary className="inline-flex min-h-11 cursor-pointer select-none list-none items-center gap-1 text-xs text-subtle-foreground transition-colors hover:text-muted-foreground md:min-h-0 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="h-3 w-3 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
        {t('settings.payments.account.technicalDetails', 'Technical details')}
      </summary>
      <p className="mt-2 pl-4 text-xs text-subtle-foreground">
        {t('settings.payments.account.accountLabel', 'Account')}{' '}
        <span className="font-mono break-all">{accountId}</span>
        {isTestMode && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/[0.10] px-1.5 py-0.5 text-warning-foreground">
            <TestTube className="h-3 w-3" />
            {t('settings.payments.account.testModeBadge', 'Test mode')}
          </span>
        )}
      </p>
    </details>
  );
}

// 'other-environment' = a Connect account PERSISTS for this owner but only in the
// OTHER Stripe environment than the one the app currently runs in (e.g. an owner
// onboarded in test, and the app is now in live mode). We must NEVER render this as
// "not connected" (the BUG-A regression); the connection survives re-login and we
// guide the owner to finish onboarding in the current environment instead.
export type StripeAccountState = 'loading' | 'complete' | 'incomplete' | 'other-environment' | 'none';
type ResearchTopic = 'no-shows' | 'cashflow' | 'compliance' | 'professionalism';

interface StripeAccountSectionProps {
  state: StripeAccountState;
  account: BusinessStripeAccount | null;
  isTestMode: boolean;
  stripeLoading: boolean;
  // The Stripe environment the app currently runs in ('test' | 'live'); used by the
  // 'other-environment' state to name which environment still needs onboarding.
  currentMode: 'test' | 'live';
  onOpenDashboard: () => void;
  onRefresh: () => void;
  onReset: () => void;
  onStartOnboarding: () => void;
  onResearch: (topic: ResearchTopic) => void;
}

// `topic` is the stable logic value passed to onResearch; `labelKey`/`labelDefault`
// drive the translated display only (R41 decouple).
const BENEFITS: { topic: ResearchTopic; labelKey: string; labelDefault: string }[] = [
  { topic: 'no-shows', labelKey: 'settings.payments.account.benefits.noShows', labelDefault: 'Reduce no-shows dramatically' },
  { topic: 'cashflow', labelKey: 'settings.payments.account.benefits.cashflow', labelDefault: 'Faster access to your cash' },
  { topic: 'compliance', labelKey: 'settings.payments.account.benefits.compliance', labelDefault: 'Secure & compliant payments' },
  { topic: 'professionalism', labelKey: 'settings.payments.account.benefits.professionalism', labelDefault: 'Present a professional business' },
];

const REQUIREMENTS: { key: string; default: string }[] = [
  { key: 'settings.payments.account.requirements.bankAccount', default: 'Business bank account details' },
  { key: 'settings.payments.account.requirements.registration', default: 'Business registration or tax ID' },
  { key: 'settings.payments.account.requirements.id', default: 'Valid ID of the representative (passport or ID card)' },
  { key: 'settings.payments.account.requirements.dobAddress', default: 'Date of birth and address of the representative' },
  { key: 'settings.payments.account.requirements.ownership', default: 'Beneficial ownership details (if applicable)' },
];

function BenefitsList({ onResearch }: { onResearch: (t: ResearchTopic) => void }) {
  const { t } = useTranslation('settings');
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Shield className="h-4 w-4 text-primary" />
        {t('settings.payments.account.whyRecommend', 'Why we recommend this')}
      </h4>
      <p className="mb-3 text-sm text-muted-foreground">
        {t('settings.payments.account.whyRecommendBody', 'Upfront payments change how a booking business runs:')}
      </p>
      <ul className="space-y-1.5">
        {BENEFITS.map(({ topic, labelKey, labelDefault }) => (
          <li key={topic}>
            <button
              type="button"
              onClick={() => onResearch(topic)}
              className="group flex w-full min-h-11 items-center gap-2.5 rounded-lg py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-0"
            >
              <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              <span>{t(labelKey, labelDefault)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-subtle-foreground">{t('settings.payments.account.tapBenefit', 'Tap any benefit to learn more.')}</p>
    </div>
  );
}

function TestModeNote() {
  const { t } = useTranslation('settings');
  return (
    <p className="flex items-center gap-1.5 text-xs text-warning-foreground">
      <TestTube className="h-3 w-3" />
      {t('settings.payments.account.testModeNote', 'Test mode, no real money is processed.')}
    </p>
  );
}

/**
 * The Stripe Connect account section — one of four states (loading / not-connected /
 * incomplete / connected). Pure presentational: every action is a prop the
 * PaymentSettingsTab orchestrator wires to its useStripeConnect handlers.
 */
export function StripeAccountSection({
  state,
  account,
  isTestMode,
  stripeLoading,
  currentMode,
  onOpenDashboard,
  onRefresh,
  onReset,
  onStartOnboarding,
  onResearch,
}: StripeAccountSectionProps) {
  const { t } = useTranslation('settings');
  if (state === 'loading') {
    return (
      <SettingsSection icon={CreditCard} title={t('settings.payments.account.title', 'Stripe account')}>
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t('settings.payments.account.loadingStatus', 'Loading account status…')}
        </div>
      </SettingsSection>
    );
  }

  // Connected & fully enabled.
  if (state === 'complete' && account) {
    return (
      <SettingsSection
        icon={CreditCard}
        title={t('settings.payments.account.title', 'Stripe account')}
        description={t('settings.payments.account.connectedDescription', 'Connected. Payments are paid out directly to your business account.')}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.10] px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <CheckCircle className="h-3.5 w-3.5" />
            {t('settings.payments.account.statusActive', 'Active')}
          </span>
        }
      >
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-success-foreground" />
              {t('settings.payments.account.chargesEnabled', 'Charges enabled')}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-success-foreground" />
              {t('settings.payments.account.payoutsEnabled', 'Payouts enabled')}
            </div>
          </div>
          {account.stripe_account_id && (
            <AccountTechnicalDetails accountId={account.stripe_account_id} isTestMode={isTestMode} />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={onOpenDashboard} disabled={stripeLoading}>
            {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('settings.payments.account.goToDashboard', 'Go to dashboard')}
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={stripeLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('settings.payments.account.refreshStatus', 'Refresh status')}
          </Button>
          {isTestMode && (
            <Button variant="outline" onClick={onReset} disabled={stripeLoading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('settings.payments.account.reset', 'Reset')}
            </Button>
          )}
        </div>
        {isTestMode && <div className="mt-3"><TestModeNote /></div>}
      </SettingsSection>
    );
  }

  // Connected but onboarding/capabilities incomplete.
  if (state === 'incomplete' && account) {
    return (
      <SettingsSection
        icon={CreditCard}
        title={t('settings.payments.account.title', 'Stripe account')}
        description={t('settings.payments.account.incompleteDescription', 'Connected, a few steps left before you can accept payments.')}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/[0.10] px-2.5 py-1 text-xs font-medium text-warning-foreground">
            <AlertCircle className="h-3.5 w-3.5" />
            {t('settings.payments.account.setupRequired', 'Setup required')}
          </span>
        }
      >
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              {account.charges_enabled ? (
                <CheckCircle className="h-4 w-4 text-success-foreground" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning-foreground" />
              )}
              {account.charges_enabled
                ? t('settings.payments.account.chargesEnabled', 'Charges enabled')
                : t('settings.payments.account.chargesDisabled', 'Charges disabled')}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              {account.payouts_enabled ? (
                <CheckCircle className="h-4 w-4 text-success-foreground" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning-foreground" />
              )}
              {account.payouts_enabled
                ? t('settings.payments.account.payoutsEnabled', 'Payouts enabled')
                : t('settings.payments.account.payoutsDisabled', 'Payouts disabled')}
            </div>
          </div>
          {account.stripe_account_id && (
            <AccountTechnicalDetails accountId={account.stripe_account_id} isTestMode={isTestMode} />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={onStartOnboarding} disabled={stripeLoading}>
            {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.payments.account.completeSetup', 'Complete setup')}
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={stripeLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('settings.payments.account.refreshStatus', 'Refresh status')}
          </Button>
          {isTestMode && (
            <Button variant="outline" onClick={onReset} disabled={stripeLoading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('settings.payments.account.reset', 'Reset')}
            </Button>
          )}
        </div>
      </SettingsSection>
    );
  }

  // BUG-A FIX: a connection PERSISTS for this owner, but in the OTHER Stripe
  // environment than the app currently runs in. The connection survived re-login;
  // we surface that honestly and point the owner at finishing onboarding in the
  // current environment, rather than the misleading "not connected" empty-state.
  if (state === 'other-environment' && account) {
    const storedIsTest = account.environment === 'test';
    const currentEnvLabel = currentMode === 'live'
      ? t('settings.payments.account.envLabel.live', 'live')
      : t('settings.payments.account.envLabel.test', 'test');
    const storedEnvLabel = storedIsTest
      ? t('settings.payments.account.envLabel.test', 'test')
      : t('settings.payments.account.envLabel.live', 'live');
    return (
      <SettingsSection
        icon={CreditCard}
        title={t('settings.payments.account.title', 'Stripe account')}
        description={t(
          'settings.payments.account.otherEnvDescription',
          'Your Stripe connection is saved. To accept {{currentEnv}} payments you only need to finish onboarding in {{currentEnv}} mode, you do not have to reconnect.',
          { currentEnv: currentEnvLabel },
        )}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/[0.10] px-2.5 py-1 text-xs font-medium text-warning-foreground">
            <AlertCircle className="h-3.5 w-3.5" />
            {t('settings.payments.account.finishSetupBadge', 'Finish setup')}
          </span>
        }
      >
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-start gap-2.5 text-sm text-foreground">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground" />
            <span>
              {t(
                'settings.payments.account.otherEnvConnected',
                'Connected in {{storedEnv}} mode. Your connection persists, no need to reconnect after logging in.',
                { storedEnv: storedEnvLabel },
              )}
            </span>
          </div>
          {account.stripe_account_id && (
            <AccountTechnicalDetails accountId={account.stripe_account_id} isTestMode={storedIsTest} />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={onStartOnboarding} disabled={stripeLoading}>
            {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.payments.account.finishInCurrentEnv', 'Finish {{currentEnv}} onboarding', { currentEnv: currentEnvLabel })}
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={stripeLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('settings.payments.account.refreshStatus', 'Refresh status')}
          </Button>
        </div>
      </SettingsSection>
    );
  }

  // Not connected yet (no Connect row persisted in ANY environment for this owner).
  return (
    <SettingsSection
      icon={CreditCard}
      title={t('settings.payments.account.title', 'Stripe account')}
      description={t('settings.payments.account.notConnectedDescription', 'Connect Stripe to receive payments directly to your business account.')}
    >
      <div className="space-y-4">
        <BenefitsList onResearch={onResearch} />

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h4 className="mb-3 text-sm font-semibold text-foreground">{t('settings.payments.account.whatYouNeed', "What you'll need")}</h4>
          <ul className="space-y-2">
            {REQUIREMENTS.map((req) => (
              <li key={req.key} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground" />
                <span>{t(req.key, req.default)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-3">
          <Button size="lg" onClick={onStartOnboarding} disabled={stripeLoading}>
            {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CreditCard className="mr-2 h-4 w-4" />
            {t('settings.payments.account.startSetup', 'Start Stripe setup')}
          </Button>
          {isTestMode && <TestModeNote />}
        </div>
      </div>
    </SettingsSection>
  );
}
