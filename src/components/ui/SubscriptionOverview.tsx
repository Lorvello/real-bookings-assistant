import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useCalendarLimits, useWhatsAppLimits, useTeamMemberLimits } from '@/hooks/useSubscriptionLimits';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { UsageSummary } from '@/components/ui/UsageSummary';
import { SubscriptionModal } from '@/components/SubscriptionModal';

interface SubscriptionOverviewProps {
  className?: string;
}

export function SubscriptionOverview({ className = "" }: SubscriptionOverviewProps) {
  const { selectedCalendar } = useCalendarContext();
  const { userStatus } = useUserStatus();
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const calendarLimits = useCalendarLimits();
  const whatsappLimits = useWhatsAppLimits();
  const teamLimits = useTeamMemberLimits(selectedCalendar?.id);

  const hasNoSubscription = userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive';

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

  if (hasNoSubscription) {
    return (
      <>
        <Card className={className}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">No Active Subscription</div>
                  <div className="text-xs text-muted-foreground">
                    Subscribe to access premium features
                  </div>
                </div>
              </div>
              
              <Button
                variant="default"
                size="sm"
                className="text-xs"
                onClick={() => setShowSubscriptionModal(true)}
              >
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
        
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
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium">Subscription Usage</div>
              <div className="text-xs text-muted-foreground">
                {getSummaryText()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasLimitReached() && (
              <Badge variant="destructive" className="text-xs">
                Limit reached
              </Badge>
            )}
            {getLimitWarningCount() > 0 && !hasLimitReached() && (
              <Badge variant="secondary" className="text-xs">
                {getLimitWarningCount()} warning{getLimitWarningCount() > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullDetails(true)}
              className="flex items-center gap-1 text-xs"
            >
              Details
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}