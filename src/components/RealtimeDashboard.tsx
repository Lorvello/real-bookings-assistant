
import React from 'react';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { EnhancedDashboardMetrics } from '@/components/dashboard/EnhancedDashboardMetrics';
import { DashboardStatusIndicator } from '@/components/dashboard/DashboardStatusIndicator';
import { DashboardDebugInfo } from '@/components/dashboard/DashboardDebugInfo';
import { DashboardLoadingState } from '@/components/dashboard/DashboardLoadingState';
import { DashboardErrorState } from '@/components/dashboard/DashboardErrorState';

interface RealtimeDashboardProps {
  calendarId: string;
}

export function RealtimeDashboard({ calendarId }: RealtimeDashboardProps) {
  // Enable real-time subscriptions - pass calendarId as array
  useRealtimeBookings([calendarId]);
  useRealtimeDashboard(calendarId);
  
  const { metrics, loading, error } = useDashboardAnalytics();

  // RealtimeDashboard metrics tracking removed from production

  if (loading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return <DashboardErrorState error={new Error(error)} />;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Metrics Cards with WhatsApp data */}
      <EnhancedDashboardMetrics analytics={metrics!} />

      {/* Status indicators */}
      <DashboardStatusIndicator />

      {/* Debug info tijdens development */}
      <DashboardDebugInfo calendarId={calendarId} analytics={metrics!} />
    </div>
  );
}
