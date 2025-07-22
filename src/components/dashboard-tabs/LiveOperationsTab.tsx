
import React from 'react';
import { useOptimizedLiveOperations } from '@/hooks/dashboard/useOptimizedLiveOperations';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';
import { Badge } from '@/components/ui/badge';
import { LiveOperationsLoading } from './live-operations/LiveOperationsLoading';
import { LiveOperationsContent } from './live-operations/LiveOperationsContent';

interface LiveOperationsTabProps {
  calendarIds: string[];
}

export function LiveOperationsTab({ calendarIds }: LiveOperationsTabProps) {
  // For now, use the first calendar ID - in the future this should aggregate across all calendars
  const primaryCalendarId = calendarIds.length > 0 ? calendarIds[0] : '';
  
  const { data: liveOps, isLoading, error } = useOptimizedLiveOperations(primaryCalendarId);
  useRealtimeSubscription(primaryCalendarId);

  if (isLoading) {
    return <LiveOperationsLoading />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-2">Error loading live operations data</p>
        <p className="text-sm text-slate-400">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Live Operations</h2>
          <p className="text-slate-400 mt-1">Real-time booking activity and status</p>
        </div>
        {calendarIds.length > 1 && (
          <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-500/30">
            {calendarIds.length} calendars • Primary view
          </Badge>
        )}
      </div>

      <LiveOperationsContent data={liveOps} calendarIds={calendarIds} />
    </div>
  );
}
