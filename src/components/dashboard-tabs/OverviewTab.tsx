
import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { OverviewTabContent } from './overview/OverviewTabContent';

interface OverviewTabProps {
  calendarIds: string[];
}

export function OverviewTab({ calendarIds }: OverviewTabProps) {
  // For now, use the first calendar for the header display
  // In the future, this could show aggregated information
  const primaryCalendarId = calendarIds.length > 0 ? calendarIds[0] : '';
  
  return (
    <div className="space-y-8">
      <OverviewTabContent calendarIds={calendarIds} />
    </div>
  );
}
