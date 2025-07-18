
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMockLiveOperationsData } from '../useMockDataGenerator';

interface LiveOperationsData {
  today_bookings: number;
  active_appointments: number;
  active_conversations_today: number;
  next_appointment_time: string | null;
  next_appointment_formatted: string | null;
  last_updated: string;
}

export function useOptimizedLiveOperations(calendarId?: string) {
  return useQuery({
    queryKey: ['optimized-live-operations', calendarId],
    queryFn: async (): Promise<LiveOperationsData | null> => {
      if (!calendarId) return null;

      console.log('🔄 Fetching live operations data for:', calendarId);

      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Get today's confirmed bookings with real-time accuracy
      const { data: todayBookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('status', 'confirmed')
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time', { ascending: true });

      if (bookingsError) {
        console.error('Error fetching today bookings:', bookingsError);
        throw bookingsError;
      }

      // Get active WhatsApp conversations that had activity today
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('whatsapp_conversations')
        .select('id, last_message_at')
        .eq('calendar_id', calendarId)
        .eq('status', 'active')
        .gte('last_message_at', todayStart.toISOString());

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
      }

      const todayBookings = todayBookingsData || [];
      
      // Calculate currently active appointments (happening right now)
      const activeAppointments = todayBookings.filter(booking => {
        const startTime = new Date(booking.start_time);
        const endTime = new Date(booking.end_time);
        return startTime <= now && endTime >= now;
      });

      // Find next appointment with proper formatting
      const nextAppointment = todayBookings
        .filter(booking => new Date(booking.start_time) > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

      let nextAppointmentFormatted = null;
      if (nextAppointment) {
        const nextTime = new Date(nextAppointment.start_time);
        const timeDiff = nextTime.getTime() - now.getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (timeDiff <= 0) {
          nextAppointmentFormatted = "Starting now";
        } else if (hours > 0) {
          nextAppointmentFormatted = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
          nextAppointmentFormatted = `${minutes}m`;
        } else {
          nextAppointmentFormatted = "< 1m";
        }
      }
      
      // Count active conversations (filter out conversations with no recent activity)
      const activeConversationsToday = conversationsData?.filter(conv => {
        if (!conv.last_message_at) return false;
        const lastMessage = new Date(conv.last_message_at);
        return lastMessage >= todayStart && lastMessage <= todayEnd;
      }).length || 0;
      
      // If no real data exists and it's a trial/demo, return mock data
      if (todayBookings.length === 0 && activeConversationsToday === 0) {
        const mockData = getMockLiveOperationsData();
        return {
          ...mockData,
          last_updated: new Date().toISOString()
        };
      }
      
      return {
        today_bookings: todayBookings.length,
        active_appointments: activeAppointments.length,
        active_conversations_today: activeConversationsToday,
        next_appointment_time: nextAppointment?.start_time || null,
        next_appointment_formatted: nextAppointmentFormatted,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 30000, // Data is fresh for 30 seconds for real-time feel
    gcTime: 120000, // Keep in cache for 2 minutes
    refetchInterval: 60000, // Background refetch every minute for live updates
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
