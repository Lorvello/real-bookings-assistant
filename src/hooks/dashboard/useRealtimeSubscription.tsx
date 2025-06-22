
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeSubscription(calendarId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!calendarId) return;

    console.log('🔄 Setting up real-time dashboard subscription for calendar:', calendarId);

    // Listen to PostgreSQL notifications for real-time dashboard updates
    const realtimeChannel = supabase
      .channel(`realtime-dashboard-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'business_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('📈 Real-time dashboard event:', payload);
          
          // Invalidate all dashboard queries immediately
          queryClient.invalidateQueries({ queryKey: ['live-operations', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['business-intelligence', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['performance-efficiency', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['future-insights', calendarId] });
          
          // Refresh materialized views
          supabase.rpc('refresh_all_dashboard_views').catch(console.error);
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time dashboard subscription status:', status);
      });

    // Also listen to NOTIFY events from database triggers
    const notifyChannel = supabase
      .channel('realtime-notifications')
      .on('broadcast', { event: 'realtime_dashboard_update' }, (payload) => {
        console.log('📢 Dashboard notification:', payload);
        if (payload.payload.calendar_id === calendarId) {
          // Invalidate queries for this specific calendar
          queryClient.invalidateQueries({ queryKey: ['live-operations', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['business-intelligence', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['performance-efficiency', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['future-insights', calendarId] });
        }
      })
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time dashboard subscriptions');
      supabase.removeChannel(realtimeChannel);
      supabase.removeChannel(notifyChannel);
    };
  }, [calendarId, queryClient]);
}
