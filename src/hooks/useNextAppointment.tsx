
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNextAppointment(calendarIds: string | string[]) {
  return useQuery({
    queryKey: ['next-appointment', calendarIds],
    queryFn: async () => {
      if (!calendarIds) return null;
      
      const ids = Array.isArray(calendarIds) ? calendarIds : [calendarIds];
      if (ids.length === 0) return null;

      console.log('🔍 Fetching next appointment for calendars:', ids);

      const now = new Date();
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types(name)
        `)
        .in('calendar_id', ids)
        .eq('status', 'confirmed')
        .gte('start_time', now.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .order('start_time', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Error fetching next appointment:', error);
        throw error;
      }

      return data?.[0] || null;
    },
    enabled: !!calendarIds && (Array.isArray(calendarIds) ? calendarIds.length > 0 : true),
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}
