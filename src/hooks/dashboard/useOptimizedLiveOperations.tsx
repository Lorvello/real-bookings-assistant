
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';
import { getMockLiveOperationsData } from '../useMockDataGenerator';
import { formatTimeUntil } from '@/lib/timeUntil';

interface LiveOperationsData {
  today_bookings: number;
  active_appointments: number;
  active_conversations_today: number;
  next_appointment_time: string | null;
  next_appointment_formatted: string | null;
  last_updated: string;
}

export function useOptimizedLiveOperations(calendarIds?: string[]) {
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['optimized-live-operations', calendarIds],
    queryFn: async (): Promise<LiveOperationsData | null> => {
      if (!calendarIds || calendarIds.length === 0) return null;

      console.log('🔄 Fetching live operations data for calendars:', calendarIds);

      // Return mock data for developers or setup_incomplete users
      if (useMockData) {
        return {
          ...getMockLiveOperationsData(),
          last_updated: new Date().toISOString()
        };
      }

      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Get today's confirmed bookings with real-time accuracy across all selected calendars
      const { data: todayBookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('calendar_id', calendarIds)
        .eq('status', 'confirmed')
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time', { ascending: true });

      if (bookingsError) {
        console.error('Error fetching today bookings:', bookingsError);
        throw bookingsError;
      }

      // Get ALL active WhatsApp conversations across all selected calendars
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('whatsapp_conversations')
        .select('id, status')
        .in('calendar_id', calendarIds)
        .eq('status', 'active');

      if (conversationsError) {
        // Throw (matching the bookings query above) so a failed conversations fetch
        // surfaces as the tab's error state instead of a confident wrong
        // "0 active conversations" (FQ-STATE-LIVEOPS: no silent wrong state).
        console.error('Error fetching conversations:', conversationsError);
        throw conversationsError;
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

      // Human relative with day rollover (no raw "132h" — same fix as the Overview hero).
      const nextAppointmentFormatted = nextAppointment
        ? formatTimeUntil(nextAppointment.start_time, now)
        : null;
      
      // Count ALL active conversations - this is what "active conversations" means
      const activeConversationsToday = conversationsData?.length || 0;
      
      return {
        today_bookings: todayBookings.length,
        active_appointments: activeAppointments.length,
        active_conversations_today: activeConversationsToday,
        next_appointment_time: nextAppointment?.start_time || null,
        next_appointment_formatted: nextAppointmentFormatted,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 30000, // Data is fresh for 30 seconds for real-time feel
    gcTime: 120000, // Keep in cache for 2 minutes
    refetchInterval: 60000, // Background refetch every minute for live updates
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
