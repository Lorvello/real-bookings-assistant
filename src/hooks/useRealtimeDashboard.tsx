
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
        (payload) => {
          console.log('📈 Dashboard trigger from booking change:', payload);
          
          // Debounce dashboard refreshes to avoid too many updates
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-analytics', calendarId] });
            queryClient.invalidateQueries({ queryKey: ['optimized-analytics', calendarId] });
            queryClient.invalidateQueries({ queryKey: ['booking-trends', calendarId] });
          }, 500);
        }
      )
      .subscribe();

    // Listen to database notifications from our trigger
    const notificationChannel = supabase
      .channel('dashboard-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, 
        async (payload) => {
          // Refresh materialized view when we get notification
          if (payload.new?.calendar_id === calendarId) {
            try {
              await supabase.rpc('refresh_dashboard_metrics');
              console.log('✅ Dashboard metrics refreshed');
            } catch (error) {
              console.error('❌ Error refreshing dashboard metrics:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up dashboard subscriptions');
      supabase.removeChannel(dashboardChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [calendarId, queryClient]);
}
