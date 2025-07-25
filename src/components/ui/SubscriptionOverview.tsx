import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { useCalendarLimits, useWhatsAppLimits, useTeamMemberLimits } from '@/hooks/useSubscriptionLimits';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { UsageSummary } from '@/components/ui/UsageSummary';

interface SubscriptionOverviewProps {
  className?: string;
}

export function SubscriptionOverview({ className = "" }: SubscriptionOverviewProps) {
  const { selectedCalendar } = useCalendarContext();
  const [showFullDetails, setShowFullDetails] = useState(false);
  const calendarLimits = useCalendarLimits();
  const whatsappLimits = useWhatsAppLimits();
  const teamLimits = useTeamMemberLimits(selectedCalendar?.id);

  const getUsagePercentage = (current: number, max: number | null) => {
    if (max === null) return 0;
    return Math.max(0, Math.min((current / max) * 100, 100));
  };

  const hasLimitReached = () => {
    return !calendarLimits.canCreateMore || !whatsappLimits.canAddMore || !teamLimits.canAddMore;
  };

  const getLimitWarningCount = () => {
    let count = 0;
    if (getUsagePercentage(calendarLimits.currentCount, calendarLimits.maxCalendars) >= 75) count++;
    if (getUsagePercentage(whatsappLimits.currentCount, whatsappLimits.maxContacts) >= 75) count++;
    if (getUsagePercentage(teamLimits.currentCount, teamLimits.maxTeamMembers) >= 75) count++;
    return count;
  };

  const getSummaryText = () => {
    const parts = [];
    
    if (calendarLimits.maxCalendars !== null) {
      parts.push(`${calendarLimits.currentCount}/${calendarLimits.maxCalendars} calendars`);
    }
    
    if (whatsappLimits.maxContacts !== null) {
      parts.push(`${whatsappLimits.currentCount}/${whatsappLimits.maxContacts} contacts`);
    }
    
    if (teamLimits.maxTeamMembers !== null) {
      parts.push(`${teamLimits.currentCount}/${teamLimits.maxTeamMembers} team members`);
    }
    
    return parts.join(' • ');
  };

  if (showFullDetails) {
    return (
      <div className={className}>
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullDetails(false)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronUp className="h-4 w-4" />
            Hide subscription details
          </Button>
        </div>
        <UsageSummary />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-2 md:pt-6 pb-2 md:pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-3 flex-1 min-w-0">
            <Crown className="h-3 w-3 md:h-5 md:w-5 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xxs md:text-sm font-medium">Subscription Usage</div>
              <div className="text-xxxs md:text-xs text-muted-foreground truncate">
                {getSummaryText()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {hasLimitReached() && (
              <Badge variant="destructive" className="text-xxxs md:text-xs px-1 md:px-2 py-0 md:py-1">
                Limit
              </Badge>
            )}
            {getLimitWarningCount() > 0 && !hasLimitReached() && (
              <Badge variant="secondary" className="text-xxxs md:text-xs px-1 md:px-2 py-0 md:py-1">
                {getLimitWarningCount()}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullDetails(true)}
              className="flex items-center gap-0.5 md:gap-1 text-xxxs md:text-xs h-6 md:h-8 px-1.5 md:px-3 min-w-[44px]"
            >
              <span className="hidden md:inline">Details</span>
              <span className="md:hidden">Det</span>
              <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}