
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServicePopularity {
  service_name: string;
  booking_count: number;
  percentage: number;
}

export function useServicePopularity(calendarId?: string) {
  return useQuery({
    queryKey: ['service-popularity', calendarId],
    queryFn: async (): Promise<ServicePopularity[]> => {
      if (!calendarId) return [];

      // Query bookings to calculate service popularity
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('service_name, service_type_id')
        .eq('calendar_id', calendarId)
        .not('status', 'in', '("cancelled","no-show")');
      
      if (error) throw error;
      if (!bookings) return [];
      
      // Calculate statistics
      const serviceStats = bookings.reduce((acc, booking) => {
        const name = booking.service_name || 'Unknown';
        if (!acc[name]) {
          acc[name] = { service_name: name, booking_count: 0 };
        }
        acc[name].booking_count++;
        return acc;
      }, {} as Record<string, { service_name: string; booking_count: number }>);
      
      const total = bookings.length;
      const result = Object.values(serviceStats).map(stat => ({
        ...stat,
        percentage: total > 0 ? Math.round((stat.booking_count / total) * 100) : 0
      }));
      
      return result.sort((a, b) => b.booking_count - a.booking_count);
    },
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes
  });
}
