
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
      .channel(`whatsapp-updates-${calendarId}`)
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
  }, [calendarId, queryClient]);
}
