import React from 'react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/button';
import { Crown, Settings, Calendar, CalendarClock, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { PlanStatusBadge, type BillingUserType } from './PlanStatusBadge';

export interface BillingTimeline {
  /** "Next Billing" / "Access Until" value. */
  nextBilling: string;
  /** Whether the first metric is an "Access Until" (canceled) vs "Next Billing". */
  accessUntil?: boolean;
  lastPayment: string;
  billingCycle: string;
  paymentStatus: string;
}

interface CurrentPlanSectionProps {
  userType: BillingUserType;
  /** True for expired_trial / canceled_and_inactive — show the no-plan empty state. */
  hasNoSubscription: boolean;
  planName: string;
  planDescription?: string;
  /** Pre-formatted price node, e.g. "Free" or €30 + a muted "/month". */
  priceText: React.ReactNode;
  /** Optional sub-line under the price (e.g. "Billed annually"). */
  priceSubline?: string;
  /** Optional emphasised trial note (e.g. "12 days remaining in trial"). */
  trialNote?: string;
  /** Shown when there is a subscription. */
  timeline?: BillingTimeline;
  onManage: () => void;
  manageDisabled?: boolean;
  loading?: boolean;
}

function PaymentStatusValue({ status }: { status: string }) {
  const isActive = status === 'Active';
  const isFailed = status === 'Payment Failed' || status === 'Failed' || status === 'Payment Method Required';
  // Active = settled (check), failed/method-required = needs attention (alert),
  // everything else (pending / inactive / canceled) = a calm waiting clock.
  const Icon = isActive ? CheckCircle : isFailed ? AlertCircle : Clock;
  const tone = isActive ? 'text-success-foreground' : isFailed ? 'text-destructive-foreground' : 'text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

/**
 * The Current Plan surface — plan identity + price hero, then a calm billing-timeline
 * metric strip. Pure props (the orchestrator owns all data + Stripe-portal handlers).
 */
export function CurrentPlanSection({
  userType,
  hasNoSubscription,
  planName,
  planDescription,
  priceText,
  priceSubline,
  trialNote,
  timeline,
  onManage,
  manageDisabled,
  loading,
}: CurrentPlanSectionProps) {
  return (
    <SettingsSection
      icon={Crown}
      title={
        <span className="flex items-center gap-2.5">
          Current plan
          <PlanStatusBadge userType={userType} />
        </span>
      }
      description="Your subscription and billing timeline."
      action={
        <Button onClick={onManage} disabled={manageDisabled} variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          {loading ? 'Loading…' : 'Manage subscription'}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Plan + price hero */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-xl font-semibold capitalize tracking-[-0.015em] text-foreground">
              {hasNoSubscription ? 'No active subscription' : `${planName} plan`}
            </h4>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {hasNoSubscription ? 'Start your subscription to access all features.' : planDescription}
            </p>
            {trialNote && <p className="mt-1.5 text-sm font-medium text-warning-foreground">{trialNote}</p>}
          </div>
          <div className="sm:text-right">
            {hasNoSubscription ? (
              <div className="text-2xl font-bold text-muted-foreground">No plan</div>
            ) : (
              <>
                <div className="text-2xl font-bold tracking-[-0.02em] text-foreground">{priceText}</div>
                {priceSubline && (
                  <p className="mt-0.5 text-sm text-muted-foreground sm:whitespace-nowrap">{priceSubline}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Billing timeline */}
        {!hasNoSubscription && timeline && (
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.012] p-5">
            <h5 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <CalendarClock className="h-4 w-4 text-accent-foreground" />
              Billing timeline
            </h5>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Metric label={timeline.accessUntil ? 'Access until' : 'Next billing'}>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-accent-foreground" />
                  {timeline.nextBilling}
                </span>
              </Metric>
              <Metric label="Last payment">{timeline.lastPayment}</Metric>
              <Metric label="Billing cycle">{timeline.billingCycle}</Metric>
              <Metric label="Payment status">
                <PaymentStatusValue status={timeline.paymentStatus} />
              </Metric>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
