
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';

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
  // Set up real-time subscription for this calendar
  useRealtimeSubscription(calendarId);

  return useQuery({
    queryKey: ['live-operations', calendarId],
    queryFn: async (): Promise<LiveOperationsData | null> => {
      if (!calendarId) return null;

      const { data, error } = await supabase
        .from('live_operations_mv')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (error) {
        console.error('Error fetching live operations:', error);
        throw error;
      }

      return data;
    },
    enabled: !!calendarId,
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 5000, // Refetch every 5 seconds as backup
    refetchIntervalInBackground: true,
  });
}
