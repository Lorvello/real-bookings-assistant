
import { useEffect, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeSubscription(calendarId?: string) {
  const queryClient = useQueryClient();
  // Unique per mounted instance (IUX R39). Four separate Dashboard tab
  // components (Business Intelligence, Performance, Live Operations, Future
  // Insights) each call this hook with the SAME calendarId. The channel name
  // used to be keyed only by calendarId, which was invisibly safe only
  // because Radix TabsContent unmounted every inactive tab, so at most one
  // instance of this hook was ever mounted for a given calendar at a time.
  // Once a tab stays mounted after its first visit (the fix for the
  // re-fade/re-fetch-on-revisit problem in DashboardTabs.tsx), two or more
  // instances for the same calendarId mount concurrently and Supabase
  // Realtime hard-crashes on a duplicate channel name (reproduced live:
  // opening a third dashboard tab threw and took down the whole route).
  // Suffixing the channel name with a per-instance id gives each mounted
  // tab its own channel while the query-invalidation targets (shared across
  // all tabs) stay the same, so cross-tab realtime refresh still works.
  const instanceId = useId();

  useEffect(() => {
    if (!calendarId) return;

    console.log('🔄 Setting up real-time dashboard subscription for calendar:', calendarId);

    // Listen to PostgreSQL notifications for real-time dashboard updates
    const realtimeChannel = supabase
      .channel(`realtime-dashboard-${calendarId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('📈 Real-time dashboard event:', payload);
          
          // Invalidate all dashboard queries immediately
          queryClient.invalidateQueries({ queryKey: ['optimized-live-operations', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['optimized-business-intelligence', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['optimized-performance-efficiency', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['optimized-future-insights', calendarId] });
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time dashboard subscription status:', status);
      });

    // Also listen to WhatsApp messages changes
    const whatsappChannel = supabase
      .channel(`whatsapp-updates-${calendarId}-${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        (payload) => {
          console.log('💬 WhatsApp real-time event:', payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['optimized-live-operations', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['optimized-business-intelligence', calendarId] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time dashboard subscriptions');
      supabase.removeChannel(realtimeChannel);
      supabase.removeChannel(whatsappChannel);
    };
  }, [calendarId, queryClient, instanceId]);
}
