
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LiveOperationsData {
  calendar_id: string;
  today_bookings: number;
  today_pending: number;
  today_confirmed: number;
  currently_active_bookings: number;
  next_appointment_time: string | null;
  whatsapp_messages_last_hour: number;
  last_updated: string;
}

export function useLiveOperations(calendarId?: string) {
  return useQuery({
    queryKey: ['live-operations', calendarId],
    queryFn: async (): Promise<LiveOperationsData | null> => {
      if (!calendarId) return null;

      console.log('🔄 Fetching live operations for:', calendarId);

      // This is now deprecated - use useOptimizedLiveOperations instead
      // Return empty data to prevent errors
      return {
        calendar_id: calendarId,
        today_bookings: 0,
        today_pending: 0,
        today_confirmed: 0,
        currently_active_bookings: 0,
        next_appointment_time: null,
        whatsapp_messages_last_hour: 0,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
}
