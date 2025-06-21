
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

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_name,
          service_name,
          start_time,
          end_time,
          status,
          customer_phone,
          customer_email,
          notes,
          service_types (
            name
          )
        `)
        .eq('calendar_id', calendarId)
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(booking => ({
        ...booking,
        service_name: booking.service_name || booking.service_types?.name || 'Afspraak'
      }));
    },
    enabled: !!calendarId,
    staleTime: 30000, // 30 seconds
  });
}
