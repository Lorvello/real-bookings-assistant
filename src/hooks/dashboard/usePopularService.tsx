
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';

export function usePopularService(calendarIds: string[]) {
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['popular-service', calendarIds],
    queryFn: async () => {
      if (!calendarIds || calendarIds.length === 0) return null;

      console.log('📊 Fetching popular service for calendars:', calendarIds);

      // Mock data for developers or setup_incomplete users
      if (useMockData) {
        return {
          service_name: 'Knippen & Stylen',
          booking_count: 28,
          percentage: 35
        };
      }

      // Simplified: Get ALL bookings from last 30 days - most popular service is most booked
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: serviceStats, error } = await supabase
        .from('bookings')
        .select(`
          service_name,
          service_types!inner(name)
        `)
        .in('calendar_id', calendarIds)
        .eq('status', 'confirmed')
        .gte('start_time', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching service stats:', error);
        throw error;
      }

      if (!serviceStats || serviceStats.length === 0) return null;

      console.log(`📊 Analyzing ${serviceStats.length} total bookings for popular service`);

      // Count bookings per service - simple and direct
      const serviceCounts = new Map();
      let totalBookings = 0;

      serviceStats.forEach(booking => {
        const serviceName = booking.service_name || booking.service_types?.name || 'Onbekende Service';
        serviceCounts.set(serviceName, (serviceCounts.get(serviceName) || 0) + 1);
        totalBookings++;
      });

      // Find most popular service
      let popularService = { name: '', count: 0 };
      serviceCounts.forEach((count, name) => {
        if (count > popularService.count) {
          popularService = { name, count };
        }
      });

      if (popularService.count === 0) return null;

      return {
        service_name: popularService.name,
        booking_count: popularService.count,
        percentage: Math.round((popularService.count / totalBookings) * 100)
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
  });
}
