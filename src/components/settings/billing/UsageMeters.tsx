import React from 'react';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Gauge, Lock, type LucideIcon } from 'lucide-react';

export interface UsageMeter {
  icon: LucideIcon;
  label: string;
  current: number;
  /** null = unlimited (∞). */
  max: number | null;
  canAddMore: boolean;
  percentage: number;
  variant: 'default' | 'warning' | 'destructive';
}

interface UsageMetersProps {
  /** When true, show the locked / no-subscription empty state instead of meters. */
  hasNoSubscription?: boolean;
  /** Empty-state copy (trial-expired vs inactive wording is owned by the caller). */
  emptyMessage?: string;
  meters?: UsageMeter[];
  onViewPlans?: () => void;
  className?: string;
}

/**
 * Pure presentational usage meters for the Billing surface (Calendars / WhatsApp /
 * Team). Lives in settings/billing so the no-auth harness can mount it directly;
 * the hook-bound `UsageSummary` (components/ui) computes the meters and renders this.
 */
export function UsageMeters({ hasNoSubscription, emptyMessage, meters = [], onViewPlans, className }: UsageMetersProps) {
  if (hasNoSubscription) {
    return (
      <SettingsSection
        icon={Lock}
        title="Subscription usage"
        description="Subscribe to track your usage limits."
        className={className}
      >
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/[0.10] text-accent-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <p className="mb-5 max-w-sm text-sm leading-6 text-muted-foreground">
            {emptyMessage ?? 'Your subscription is inactive. Reactivate to access usage tracking and premium features.'}
          </p>
          <Button variant="outline" size="sm" onClick={onViewPlans}>
            View plans
          </Button>
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      icon={Gauge}
      title="Subscription usage"
      description="Current usage across your plan limits."
      className={className}
    >
      <div className="space-y-5">
        {meters.map((meter) => {
          const Icon = meter.icon;
          const isUnlimited = meter.max === null;
          const showProgress = !isUnlimited && (meter.max ?? 0) > 0;
          const atLimit = !meter.canAddMore && !isUnlimited;

          return (
            <div key={meter.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5 text-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02] text-muted-foreground">
                    <Icon className="h-[15px] w-[15px]" />
                  </span>
                  {meter.label}
                </span>
                <span className={`font-medium tabular-nums ${atLimit ? 'text-destructive-foreground' : 'text-foreground'}`}>
                  {meter.current || 0}
                  <span className="text-muted-foreground"> / {isUnlimited ? '∞' : meter.max || 0}</span>
                </span>
              </div>
              {showProgress && <Progress value={meter.percentage || 0} variant={meter.variant} className="h-1.5" />}
              {atLimit && (meter.max ?? 0) > 0 && (
                <p className="text-xs text-destructive-foreground">
                  Limit reached — upgrade to add more {meter.label.toLowerCase()}.
                </p>
              )}
              {isUnlimited && (
                <p className="text-xs text-muted-foreground">Unlimited {meter.label.toLowerCase()} available.</p>
              )}
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
}
