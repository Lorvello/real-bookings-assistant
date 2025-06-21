
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeDashboard(calendarId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!calendarId) return;

    console.log('📊 Setting up realtime dashboard subscription for calendar:', calendarId);

    // Listen to PostgreSQL notifications for dashboard refresh
    const dashboardChannel = supabase
      .channel(`dashboard-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `calendar_id=eq.${calendarId}`,
        },
        async (payload) => {
          console.log('📈 Dashboard trigger from booking change:', payload);
          
          // Invalidate queries immediately
          queryClient.invalidateQueries({ queryKey: ['dashboard-analytics', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['optimized-analytics', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['booking-trends', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['todays-bookings', calendarId] });
          
          // Probeer de materialized view te refreshen
          try {
            await supabase.rpc('refresh_dashboard_metrics');
            console.log('✅ Dashboard metrics refreshed');
          } catch (error) {
            console.error('❌ Error refreshing dashboard metrics:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Dashboard subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up dashboard subscriptions');
      supabase.removeChannel(dashboardChannel);
    };
  }, [calendarId, queryClient]);
}
