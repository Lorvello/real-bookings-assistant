
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

      // Get today's bookings (only confirmed ones)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('status', 'confirmed')
        .gte('start_time', new Date().toISOString().split('T')[0])
        .lt('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      // Get WhatsApp conversations that had activity today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('status', 'active')
        .gte('last_message_at', todayStart.toISOString());

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
      }

      const now = new Date();
      const todayBookings = bookingsData || [];
      
      // Calculate currently active appointments
      const activeAppointments = todayBookings.filter(b => {
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        return start <= now && end >= now;
      });

      // Find next appointment and format time properly
      const nextAppointment = todayBookings
        .filter(b => new Date(b.start_time) > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

      let nextAppointmentFormatted = null;
      if (nextAppointment) {
        const nextTime = new Date(nextAppointment.start_time);
        const timeDiff = nextTime.getTime() - now.getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
          nextAppointmentFormatted = `${hours}h ${minutes}m`;
        } else {
          nextAppointmentFormatted = `${minutes}m`;
        }
      }
      
      // If no real data exists, return mock data for trial users  
      if (todayBookings.length === 0 && (conversationsData?.length || 0) === 0) {
        return getMockLiveOperationsData();
      }
      
      return {
        today_bookings: todayBookings.length,
        active_appointments: activeAppointments.length,
        active_conversations_today: conversationsData?.length || 0,
        next_appointment_time: nextAppointment?.start_time || null,
        next_appointment_formatted: nextAppointmentFormatted,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 60000, // Data is fresh for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchInterval: 120000, // Background refetch every 2 minutes
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
