import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePopularService(calendarId: string) {
  return useQuery({
    queryKey: ['popular-service', calendarId],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          service_name,
          service_types (
            name
          )
        `)
        .eq('calendar_id', calendarId)
        .gte('start_time', oneWeekAgo.toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;
      
      // Count services
      const serviceCounts = data?.reduce((acc: Record<string, number>, booking) => {
        const serviceName = booking.service_name || booking.service_types?.name || 'Unknown Service';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});
      
      if (!serviceCounts || Object.keys(serviceCounts).length === 0) {
        return null;
      }
      
      // Find most popular service
      const mostPopular = Object.entries(serviceCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      return {
        name: mostPopular[0],
        count: mostPopular[1]
      };
    },
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes
  });
}