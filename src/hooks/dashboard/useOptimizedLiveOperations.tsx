
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LiveOperationsData {
  today_bookings: number;
  today_pending: number;
  today_confirmed: number;
  currently_active_bookings: number;
  next_appointment_time: string | null;
  whatsapp_messages_last_hour: number;
  last_updated: string;
}

export function useOptimizedLiveOperations(calendarId?: string) {
  return useQuery({
    queryKey: ['optimized-live-operations', calendarId],
    queryFn: async (): Promise<LiveOperationsData | null> => {
      if (!calendarId) return null;

      console.log('🔄 Fetching live operations data for:', calendarId);

      // Get today's bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('calendar_id', calendarId)
        .gte('start_time', new Date().toISOString().split('T')[0])
        .lt('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      // Get WhatsApp messages count (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: messagesData, error: messagesError } = await supabase
        .from('whatsapp_messages')
        .select('id, conversation_id!inner(calendar_id)')
        .eq('conversation_id.calendar_id', calendarId)
        .eq('direction', 'inbound')
        .gte('created_at', oneHourAgo);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
      }

      const now = new Date();
      const todayBookings = bookingsData?.filter(b => b.status !== 'cancelled') || [];
      
      return {
        today_bookings: todayBookings.length,
        today_pending: todayBookings.filter(b => b.status === 'pending').length,
        today_confirmed: todayBookings.filter(b => b.status === 'confirmed').length,
        currently_active_bookings: todayBookings.filter(b => {
          const start = new Date(b.start_time);
          const end = new Date(b.end_time);
          return start <= now && end >= now && b.status === 'confirmed';
        }).length,
        next_appointment_time: todayBookings
          .filter(b => new Date(b.start_time) > now && b.status === 'confirmed')
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]?.start_time || null,
        whatsapp_messages_last_hour: messagesData?.length || 0,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 60000, // Data is fresh for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchInterval: 120000, // Background refetch every 2 minutes (reduced from 1 minute)
    refetchIntervalInBackground: true,
    retry: 2, // Reduced retry attempts
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000), // Reduced max delay
  });
}
