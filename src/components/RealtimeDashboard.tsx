
import React from 'react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { EnhancedMetricsCards } from '@/components/EnhancedMetricsCards';
import { DashboardStatusIndicator } from '@/components/dashboard/DashboardStatusIndicator';
import { DashboardDebugInfo } from '@/components/dashboard/DashboardDebugInfo';
import { DashboardLoadingState } from '@/components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';

interface RealtimeDashboardProps {
  calendarId: string;
}

export function RealtimeDashboard({ calendarId }: RealtimeDashboardProps) {
  // Enable real-time subscriptions
  useRealtimeBookings(calendarId);
  useRealtimeDashboard(calendarId);
  
  const { data: analytics, isLoading, error } = useDashboardAnalytics(calendarId);

  console.log('🎯 RealtimeDashboard render:', { calendarId, analytics, isLoading, error });

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return <DashboardErrorState error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Real-time indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Live data - updates in real-time</span>
        {analytics?.last_updated && (
          <span className="ml-2">
            (laatste update: {new Date(analytics.last_updated).toLocaleTimeString('nl-NL')})
          </span>
        )}
      </div>

      {/* Enhanced Metrics Cards */}
      <EnhancedMetricsCards analytics={analytics!} />

      {/* Status indicators */}
      <DashboardStatusIndicator />

      {/* Debug info tijdens development */}
      <DashboardDebugInfo calendarId={calendarId} analytics={analytics!} />
    </div>
  );
}
