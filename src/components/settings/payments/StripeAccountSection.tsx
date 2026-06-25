import React from 'react';
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
  return (
    <details className="group mt-4">
      <summary className="inline-flex min-h-11 cursor-pointer select-none list-none items-center gap-1 text-xs text-subtle-foreground transition-colors hover:text-muted-foreground md:min-h-0 [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="h-3 w-3 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
        Technical details
      </summary>
      <p className="mt-2 pl-4 text-xs text-subtle-foreground">
        Account <span className="font-mono break-all">{accountId}</span>
        {isTestMode && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/[0.10] px-1.5 py-0.5 text-warning-foreground">
            <TestTube className="h-3 w-3" />
            Test mode
          </span>
        )}
      </p>
    </details>
  );
}

export type StripeAccountState = 'loading' | 'complete' | 'incomplete' | 'none';
type ResearchTopic = 'no-shows' | 'cashflow' | 'compliance' | 'professionalism';

interface StripeAccountSectionProps {
  state: StripeAccountState;
  account: BusinessStripeAccount | null;
  isTestMode: boolean;
  stripeLoading: boolean;
  onOpenDashboard: () => void;
  onRefresh: () => void;
  onReset: () => void;
  onStartOnboarding: () => void;
  onResearch: (topic: ResearchTopic) => void;
}

const BENEFITS: { topic: ResearchTopic; label: string }[] = [
  { topic: 'no-shows', label: 'Reduce no-shows dramatically' },
  { topic: 'cashflow', label: 'Faster access to your cash' },
  { topic: 'compliance', label: 'Secure & compliant payments' },
  { topic: 'professionalism', label: 'Present a professional business' },
];

const REQUIREMENTS = [
  'Business bank account details',
  'Business registration or tax ID',
  'Valid ID of the representative (passport or ID card)',
  'Date of birth and address of the representative',
  'Beneficial ownership details (if applicable)',
];

function BenefitsList({ onResearch }: { onResearch: (t: ResearchTopic) => void }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Shield className="h-4 w-4 text-primary" />
        Why we recommend this
      </h4>
      <p className="mb-3 text-sm text-muted-foreground">
        Upfront payments change how a booking business runs:
      </p>
      <ul className="space-y-1.5">
        {BENEFITS.map(({ topic, label }) => (
          <li key={topic}>
            <button
              type="button"
              onClick={() => onResearch(topic)}
              className="group flex w-full min-h-11 items-center gap-2.5 rounded-lg py-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-0"
            >
              <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
              <span>{label}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-subtle-foreground">Tap any benefit to learn more.</p>
    </div>
  );
}

function TestModeNote() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-warning-foreground">
      <TestTube className="h-3 w-3" />
      Test mode — no real money is processed.
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
  onOpenDashboard,
  onRefresh,
  onReset,
  onStartOnboarding,
  onResearch,
}: StripeAccountSectionProps) {
  if (state === 'loading') {
    return (
      <SettingsSection icon={CreditCard} title="Stripe account">
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading account status…
        </div>
      </SettingsSection>
    );
  }

  // Connected & fully enabled.
  if (state === 'complete' && account) {
    return (
      <SettingsSection
        icon={CreditCard}
        title="Stripe account"
        description="Connected. Payments are paid out directly to your business account."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.10] px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <CheckCircle className="h-3.5 w-3.5" />
            Active
          </span>
        }
      >
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-success-foreground" />
              Charges enabled
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-4 w-4 text-success-foreground" />
              Payouts enabled
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
            Go to dashboard
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={stripeLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh status
          </Button>
          {isTestMode && (
            <Button variant="outline" onClick={onReset} disabled={stripeLoading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
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
        title="Stripe account"
        description="Connected — a few steps left before you can accept payments."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/[0.10] px-2.5 py-1 text-xs font-medium text-warning-foreground">
            <AlertCircle className="h-3.5 w-3.5" />
            Setup required
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
              Charges {account.charges_enabled ? 'enabled' : 'disabled'}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground">
              {account.payouts_enabled ? (
                <CheckCircle className="h-4 w-4 text-success-foreground" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning-foreground" />
              )}
              Payouts {account.payouts_enabled ? 'enabled' : 'disabled'}
            </div>
          </div>
          {account.stripe_account_id && (
            <AccountTechnicalDetails accountId={account.stripe_account_id} isTestMode={isTestMode} />
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={onStartOnboarding} disabled={stripeLoading}>
            {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete setup
          </Button>
          <Button variant="outline" onClick={onRefresh} disabled={stripeLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh status
          </Button>
          {isTestMode && (
            <Button variant="outline" onClick={onReset} disabled={stripeLoading}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </SettingsSection>
    );
  }

  // Not connected yet.
  return (
    <SettingsSection
      icon={CreditCard}
      title="Stripe account"
      description="Connect Stripe to receive payments directly to your business account."
    >
      <div className="space-y-4">
        <BenefitsList onResearch={onResearch} />

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h4 className="mb-3 text-sm font-semibold text-foreground">What you'll need</h4>
          <ul className="space-y-2">
            {REQUIREMENTS.map((req) => (
              <li key={req} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-start gap-3">
          <Button size="lg" onClick={onStartOnboarding} disabled={stripeLoading}>
            {stripeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CreditCard className="mr-2 h-4 w-4" />
            Start Stripe setup
          </Button>
          {isTestMode && <TestModeNote />}
        </div>
      </div>
    </SettingsSection>
  );
}
