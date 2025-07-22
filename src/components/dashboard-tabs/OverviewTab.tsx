
import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { EnhancedDashboardMetrics } from '@/components/dashboard/EnhancedDashboardMetrics';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface OverviewTabProps {
  calendarIds: string[];
}

export function OverviewTab({ calendarIds }: OverviewTabProps) {
  // For backwards compatibility, use the first calendar for metrics display
  // The existing hooks and components expect a single calendar context
  const { metrics, loading, error, hasCalendar } = useDashboardAnalytics();
  const { selectedCalendar } = useCalendarContext();
  
  const calendarName = selectedCalendar?.name || 'Geen kalender geselecteerd';
  
  if (!hasCalendar) {
    return (
      <div className="space-y-8">
        <DashboardHeader calendarName={calendarName} />
        <div className="text-center py-16">
          <p className="text-slate-400">Selecteer een kalender om metrics te bekijken</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <DashboardHeader calendarName={calendarName} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-gray-800/50 border-gray-700 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <DashboardHeader calendarName={calendarName} />
        <div className="text-center py-16">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DashboardHeader calendarName={calendarName} />
      <EnhancedDashboardMetrics analytics={metrics} />
    </div>
  );
}
