import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Crown, Users, MessageCircle, Calendar, Lock } from 'lucide-react';
import { useCalendarLimits, useWhatsAppLimits, useTeamMemberLimits } from '@/hooks/useSubscriptionLimits';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { UpgradePrompt } from '@/components/ui/UpgradePrompt';

interface UsageSummaryProps {
  className?: string;
}

export function UsageSummary({ className = "" }: UsageSummaryProps) {
  const { selectedCalendar } = useCalendarContext();
  const { userStatus } = useUserStatus();
  const calendarLimits = useCalendarLimits();
  const whatsappLimits = useWhatsAppLimits();
  const teamLimits = useTeamMemberLimits(selectedCalendar?.id);

  const hasNoSubscription = userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive';

  if (hasNoSubscription) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-muted-foreground" />
            No Active Subscription
          </CardTitle>
          <CardDescription>
            Subscribe to view usage limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              {userStatus.userType === 'expired_trial' 
                ? 'Your trial has expired. Subscribe to access usage tracking and premium features.'
                : 'Your subscription is inactive. Reactivate to access usage tracking and premium features.'
              }
            </p>
            <Button 
              onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}
              variant="outline"
              size="sm"
              className="w-full"
            >
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getUsagePercentage = (current: number, max: number | null) => {
    if (max === null) return 0;
    return Math.max(0, Math.min((current / max) * 100, 100));
  };

  const getProgressVariant = (percentage: number): "default" | "warning" | "destructive" => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 75) return 'warning';
    return 'default';
  };

  const limits = [
    {
      icon: Calendar,
      label: 'Calendars',
      current: calendarLimits.currentCount,
      max: calendarLimits.maxCalendars,
      canAddMore: calendarLimits.canCreateMore,
      percentage: getUsagePercentage(calendarLimits.currentCount, calendarLimits.maxCalendars),
      variant: getProgressVariant(getUsagePercentage(calendarLimits.currentCount, calendarLimits.maxCalendars))
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp Contacts',
      current: whatsappLimits.currentCount,
      max: whatsappLimits.maxContacts,
      canAddMore: whatsappLimits.canAddMore,
      percentage: getUsagePercentage(whatsappLimits.currentCount, whatsappLimits.maxContacts),
      variant: getProgressVariant(getUsagePercentage(whatsappLimits.currentCount, whatsappLimits.maxContacts))
    },
    {
      icon: Users,
      label: 'Team Members',
      current: teamLimits.currentCount,
      max: teamLimits.maxTeamMembers,
      canAddMore: teamLimits.canAddMore,
      percentage: getUsagePercentage(teamLimits.currentCount, teamLimits.maxTeamMembers),
      variant: getProgressVariant(getUsagePercentage(teamLimits.currentCount, teamLimits.maxTeamMembers))
    }
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-4 w-4 text-primary" />
          Subscription Usage
        </CardTitle>
        <CardDescription>
          Current usage across your subscription limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {limits.map((limit) => {
          const Icon = limit.icon;
          return (
            <div key={limit.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{limit.label}</span>
                </div>
                <span className={`font-medium ${!limit.canAddMore ? 'text-destructive' : ''}`}>
                  {limit.current}/{limit.max === null ? '∞' : limit.max}
                </span>
              </div>
              {limit.max !== null && (
                <Progress 
                  value={limit.percentage} 
                  variant={limit.variant}
                  className="h-2"
                />
              )}
              {!limit.canAddMore && (
                <p className="text-xs text-destructive">
                  Limit reached - upgrade to add more {limit.label.toLowerCase()}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}