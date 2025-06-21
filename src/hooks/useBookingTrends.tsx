
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BookingTrend {
  date: string;
  bookings: number;
  revenue: number;
}

export function useBookingTrends(calendarId?: string, days: number = 7) {
  return useQuery({
    queryKey: ['booking-trends', calendarId, days],
    queryFn: async (): Promise<BookingTrend[]> => {
      if (!calendarId) return [];

      const { data, error } = await supabase.rpc('get_booking_trends', {
        p_calendar_id: calendarId,
        p_days: days
      });

      if (error) throw error;
      return (data as unknown as BookingTrend[]) || [];
    },
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes
  });
}
