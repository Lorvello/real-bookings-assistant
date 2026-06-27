import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Crown, ChevronUp, Lock } from 'lucide-react';
import { useCalendarLimits, useWhatsAppLimits, useTeamMemberLimits } from '@/hooks/useSubscriptionLimits';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { UsageSummary } from '@/components/ui/UsageSummary';
import { SubscriptionModal } from '@/components/SubscriptionModal';

interface SubscriptionOverviewProps {
  className?: string;
}

interface UsagePillProps {
  label: string;
  current: number;
  max: number | null;
}

/** Compact usage chip with a hairline progress track — calm, informative, on-brand.
 *  Unlimited (max === null) reads as "current" with no bar. Warns at 75%, alerts at 100%. */
function UsagePill({ label, current, max }: UsagePillProps) {
  const pct = max === null ? 0 : Math.max(0, Math.min((current / max) * 100, 100));
  const atLimit = max !== null && current >= max;
  const warning = !atLimit && pct >= 75;
  const barColor = atLimit
    ? 'bg-destructive-foreground'
    : warning
      ? 'bg-gold-foreground'
      : 'bg-primary';

  return (
    <div className="min-w-[7rem] flex-1 rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.06]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">
          {label}
        </span>
        <span className="text-xs font-semibold tabular-nums text-foreground">
          {current}
          <span className="text-subtle-foreground">/{max === null ? '∞' : max}</span>
        </span>
      </div>
      {max !== null && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct === 0 ? 0 : Math.max(pct, 4)}%` }} />
        </div>
      )}
    </div>
  );
}

export function SubscriptionOverview({ className = '' }: SubscriptionOverviewProps) {
  const { t } = useTranslation('dashboard');
  const { selectedCalendar } = useCalendarContext();
  const { userStatus } = useUserStatus();
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const calendarLimits = useCalendarLimits();
  const whatsappLimits = useWhatsAppLimits();
  const teamLimits = useTeamMemberLimits(selectedCalendar?.id);

  const hasNoSubscription =
    userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive';

  const getUsagePercentage = (current: number, max: number | null) => {
    if (max === null) return 0;
    return Math.max(0, Math.min((current / max) * 100, 100));
  };

  const hasLimitReached = () =>
    !calendarLimits.canCreateMore || !whatsappLimits.canAddMore || !teamLimits.canAddMore;

  const getLimitWarningCount = () => {
    let count = 0;
    if (getUsagePercentage(calendarLimits.currentCount, calendarLimits.maxCalendars) >= 75) count++;
    if (getUsagePercentage(whatsappLimits.currentCount, whatsappLimits.maxContacts) >= 75) count++;
    if (getUsagePercentage(teamLimits.currentCount, teamLimits.maxTeamMembers) >= 75) count++;
    return count;
  };

  // Build the visible usage pills (only metrics that have a configured limit or count).
  // Labels translated at build site (rebuilt every render, so they refresh on toggle).
  const pills: UsagePillProps[] = [
    { label: t('dashboard.subOverview.pillCalendars', 'Calendars'), current: calendarLimits.currentCount, max: calendarLimits.maxCalendars },
    { label: t('dashboard.subOverview.pillContacts', 'Contacts'), current: whatsappLimits.currentCount, max: whatsappLimits.maxContacts },
    { label: t('dashboard.subOverview.pillTeam', 'Team'), current: teamLimits.currentCount, max: teamLimits.maxTeamMembers },
  ];

  if (hasNoSubscription) {
    return (
      <>
        <div className={`surface-raised rounded-xl md:rounded-2xl p-5 md:p-6 ${className}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-white/[0.06]">
                <Lock className="h-5 w-5 text-subtle-foreground" aria-hidden />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{t('dashboard.subOverview.noSubTitle', 'No active subscription')}</div>
                <div className="text-xs text-muted-foreground">{t('dashboard.subOverview.noSubDesc', 'Subscribe to unlock your premium features.')}</div>
              </div>
            </div>
            <Button onClick={() => setShowSubscriptionModal(true)} className="shrink-0">
              {t('dashboard.subOverview.upgrade', 'Upgrade')}
            </Button>
          </div>
        </div>

        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          userType={userStatus.userType}
        />
      </>
    );
  }

  if (showFullDetails) {
    return (
      <div className={className}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFullDetails(false)}
          className="mb-3 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
          {t('dashboard.subOverview.hideDetails', 'Hide subscription details')}
        </Button>
        <UsageSummary />
      </div>
    );
  }

  return (
    <div className={`surface-raised rounded-xl md:rounded-2xl p-5 md:p-6 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="glow-accent relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 ring-1 ring-gold/20">
            <Crown className="h-5 w-5 text-gold-foreground" aria-hidden />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{t('dashboard.subOverview.usageTitle', 'Subscription usage')}</div>
            <div className="text-xs text-muted-foreground">{t('dashboard.subOverview.usageDesc', 'Your plan limits at a glance.')}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasLimitReached() ? (
            <span className="rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive-foreground">
              {t('dashboard.subOverview.limitReached', 'Limit reached')}
            </span>
          ) : getLimitWarningCount() > 0 ? (
            <span className="rounded-md bg-gold/10 px-2 py-1 text-xs font-medium text-gold-foreground">
              {t('dashboard.subOverview.approaching', '{{n}} approaching limit', { n: getLimitWarningCount() })}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullDetails(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t('dashboard.subOverview.details', 'Details')}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {pills.map((p) => (
          <UsagePill key={p.label} {...p} />
        ))}
      </div>
    </div>
  );
}
