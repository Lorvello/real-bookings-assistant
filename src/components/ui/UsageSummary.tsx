import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, MessageCircle, Calendar } from 'lucide-react';
import { useCalendarLimits, useWhatsAppLimits, useTeamMemberLimits } from '@/hooks/useSubscriptionLimits';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { UsageMeters, type UsageMeter } from '@/components/settings/billing/UsageMeters';

interface UsageSummaryProps {
  className?: string;
}

const getUsagePercentage = (current: number, max: number | null) => {
  if (max === null || max === 0) return 0;
  if (current === 0) return 0;
  return Math.max(0, Math.min((current / max) * 100, 100));
};

const getProgressVariant = (percentage: number): 'default' | 'warning' | 'destructive' => {
  if (percentage >= 90) return 'destructive';
  if (percentage >= 75) return 'warning';
  return 'default';
};

/**
 * Hook-bound usage summary for the Billing surface (and SubscriptionOverview). Owns
 * the subscription-limit hooks and feeds the pure <UsageMeters> presentational
 * (settings/billing) — which the no-auth harness mounts directly with mock meters.
 */
export function UsageSummary({ className = '' }: UsageSummaryProps) {
  const { t } = useTranslation('settings');
  const { selectedCalendar } = useCalendarContext();
  const { userStatus } = useUserStatus();
  const calendarLimits = useCalendarLimits();
  const whatsappLimits = useWhatsAppLimits();
  const teamLimits = useTeamMemberLimits(selectedCalendar?.id);

  const hasNoSubscription =
    userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive';

  const onViewPlans = () =>
    document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });

  if (hasNoSubscription) {
    return (
      <UsageMeters
        className={className}
        hasNoSubscription
        emptyMessage={
          userStatus.userType === 'expired_trial'
            ? t('settings.billing.usageSummary.trialExpiredMessage', 'Your trial has expired. Subscribe to access usage tracking and premium features.')
            : t('settings.billing.usageSummary.inactiveMessage', 'Your subscription is inactive. Reactivate to access usage tracking and premium features.')
        }
        onViewPlans={onViewPlans}
      />
    );
  }

  const meters: UsageMeter[] = [
    {
      icon: Calendar,
      label: t('settings.billing.usageMeters.calendars', 'Calendars'),
      current: calendarLimits.currentCount,
      max: calendarLimits.maxCalendars,
      canAddMore: calendarLimits.canCreateMore,
      percentage: getUsagePercentage(calendarLimits.currentCount, calendarLimits.maxCalendars),
      variant: getProgressVariant(getUsagePercentage(calendarLimits.currentCount, calendarLimits.maxCalendars)),
    },
    {
      icon: MessageCircle,
      label: t('settings.billing.usageMeters.whatsappContacts', 'WhatsApp Contacts'),
      current: whatsappLimits.currentCount,
      max: whatsappLimits.maxContacts,
      canAddMore: whatsappLimits.canAddMore,
      percentage: getUsagePercentage(whatsappLimits.currentCount, whatsappLimits.maxContacts),
      variant: getProgressVariant(getUsagePercentage(whatsappLimits.currentCount, whatsappLimits.maxContacts)),
    },
    {
      icon: Users,
      label: t('settings.billing.usageMeters.teamMembers', 'Team Members'),
      current: teamLimits.currentCount,
      max: teamLimits.maxTeamMembers,
      canAddMore: teamLimits.canAddMore,
      percentage: getUsagePercentage(teamLimits.currentCount, teamLimits.maxTeamMembers),
      variant: getProgressVariant(getUsagePercentage(teamLimits.currentCount, teamLimits.maxTeamMembers)),
    },
  ];

  return <UsageMeters className={className} meters={meters} onViewPlans={onViewPlans} />;
}
