import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNextAppointment(calendarId: string) {
  return useQuery({
    queryKey: ['next-appointment', calendarId],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_name,
          start_time,
          end_time,
          service_name,
          service_types (
            name
          )
        `)
        .eq('calendar_id', calendarId)
        .gte('start_time', now)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(1);

      if (error) throw error;
      
      return data?.[0] || null;
    },
    enabled: !!calendarId,
    refetchInterval: 60000, // Refresh every minute
  });
}