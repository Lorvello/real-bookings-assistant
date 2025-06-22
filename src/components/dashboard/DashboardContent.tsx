
import React from 'react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { CalendarDashboard } from '@/components/CalendarDashboard';
import { DashboardMetrics } from './DashboardMetrics';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardContentProps {
  calendarIds: string[];
  calendarName: string;
}

export function DashboardContent({ calendarIds, calendarName }: DashboardContentProps) {
  // For analytics, use the first calendar or undefined if no calendars
  const primaryCalendarId = calendarIds.length > 0 ? calendarIds[0] : undefined;
  const { data: analytics, isLoading } = useDashboardAnalytics(primaryCalendarId);
  
  // Set up realtime updates for the primary calendar
  useRealtimeDashboard(primaryCalendarId);

  console.log('DashboardContent render:', { calendarIds, analytics, isLoading });

  if (calendarIds.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                Geen kalenders geselecteerd
              </h3>
              <p className="text-muted-foreground">
                Selecteer een kalender om je dashboard te bekijken
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Dashboard Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-green-100 to-green-200 bg-clip-text text-transparent mb-4">
          Dashboard - {calendarName}
        </h1>
        <p className="text-gray-400 text-lg">
          {calendarIds.length > 1 
            ? `Overzicht van ${calendarIds.length} kalenders`
            : 'Overzicht van je boekingen en prestaties'
          }
        </p>
      </div>

      {/* Metrics Cards - Always show, even when loading */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">Statistieken</h2>
        <DashboardMetrics 
          analytics={analytics} 
          isLoading={isLoading}
          showMultiCalendarNote={calendarIds.length > 1}
        />
      </div>

      {/* Calendar View */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white mb-4">Kalender</h2>
        <CalendarDashboard calendarIds={calendarIds} />
      </div>
    </div>
  );
}
