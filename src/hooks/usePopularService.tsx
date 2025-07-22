
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePopularService(calendarIds: string | string[]) {
  return useQuery({
    queryKey: ['popular-service', calendarIds],
    queryFn: async () => {
      if (!calendarIds) return null;
      
      const ids = Array.isArray(calendarIds) ? calendarIds : [calendarIds];
      if (ids.length === 0) return null;

      console.log('🔍 Fetching popular service for calendars:', ids);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          service_name,
          service_types!inner(name)
        `)
        .in('calendar_id', ids)
        .gte('start_time', oneWeekAgo.toISOString())
        .neq('status', 'cancelled');

      if (error) {
        console.error('Error fetching popular service:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Count services
      const serviceCounts = data.reduce((acc: Record<string, number>, booking) => {
        const serviceName = booking.service_name || booking.service_types?.name || 'Unknown';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});
      
      // Find most popular
      const mostPopular = Object.entries(serviceCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (!mostPopular) return null;
      
      return {
        name: mostPopular[0],
        count: mostPopular[1]
      };
    },
    enabled: !!calendarIds && (Array.isArray(calendarIds) ? calendarIds.length > 0 : true),
    staleTime: 300000, // 5 minutes
  });
}
