
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useRealtimeBookings(calendarIds: string[] = []) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  useEffect(() => {
    if (!calendarIds.length) return;

    console.log('🔄 Setting up realtime booking subscriptions for calendars:', calendarIds);

    // Create subscriptions for all calendar IDs
    const channels = calendarIds.map(calendarId => {
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
            
            // NIEUW: WhatsApp contact overview invalideren (trigger refresht de data, wij refreshen de query)
            queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-overview'] });
            
            // Show toast for new bookings
            if (payload.eventType === 'INSERT') {
              toast({
                title: t('realtimeBookings.newBookingTitle', 'Nieuwe afspraak'),
                description: t('realtimeBookings.newBookingDescription', 'Afspraak voor {{name}} is aangemaakt', { name: payload.new.customer_name }),
              });
            } else if (payload.eventType === 'UPDATE' && payload.old.status !== payload.new.status) {
              toast({
                title: t('realtimeBookings.statusChangedTitle', 'Status gewijzigd'),
                description: t('realtimeBookings.statusChangedDescription', 'Afspraak status is gewijzigd naar {{status}}', { status: payload.new.status }),
              });
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 Bookings subscription status for ${calendarId}:`, status);
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

      return { bookingsChannel, serviceTypesChannel };
    });

    return () => {
      console.log('🔌 Cleaning up realtime subscriptions');
      channels.forEach(({ bookingsChannel, serviceTypesChannel }) => {
        supabase.removeChannel(bookingsChannel);
        supabase.removeChannel(serviceTypesChannel);
      });
    };
  }, [calendarIds.join(','), queryClient, toast, t]); // Use join to create stable dependency
}
