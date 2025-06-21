
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeBookings(calendarId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!calendarId) return;

    console.log('🔄 Setting up realtime booking subscription for calendar:', calendarId);

    // Listen to booking changes for this calendar
    const bookingsChannel = supabase
      .channel(`bookings-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('📱 Real-time booking update:', payload);
          
          // Invalidate relevant queries immediately
          queryClient.invalidateQueries({ queryKey: ['bookings', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-analytics', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['optimized-analytics', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['todays-bookings', calendarId] });
          
          // Show toast for new bookings
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Nieuwe afspraak",
              description: `Afspraak voor ${payload.new.customer_name} is aangemaakt`,
            });
          } else if (payload.eventType === 'UPDATE' && payload.old.status !== payload.new.status) {
            toast({
              title: "Status gewijzigd",
              description: `Afspraak status is gewijzigd naar ${payload.new.status}`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Bookings subscription status:', status);
      });

    // Listen to service type changes (affects booking calculations)
    const serviceTypesChannel = supabase
      .channel(`service-types-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_types',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('🛠️ Service type update:', payload);
          
          // Invalidate queries that depend on service types
          queryClient.invalidateQueries({ queryKey: ['bookings', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-analytics', calendarId] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up realtime subscriptions');
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(serviceTypesChannel);
    };
  }, [calendarId, queryClient, toast]);
}
