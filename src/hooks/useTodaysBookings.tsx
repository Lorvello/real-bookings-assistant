
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TodaysBooking {
  id: string;
  customer_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: string;
  customer_phone?: string;
  customer_email: string;
  notes?: string;
}

export function useTodaysBookings(calendarId?: string) {
  return useQuery({
    queryKey: ['todays-bookings', calendarId],
    queryFn: async (): Promise<TodaysBooking[]> => {
      if (!calendarId) return [];

      const { data, error } = await supabase.rpc('get_todays_schedule', {
        p_calendar_id: calendarId
      });

      if (error) throw error;
      return (data as TodaysBooking[]) || [];
    },
    enabled: !!calendarId,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refresh every 2 minutes
  });
}
