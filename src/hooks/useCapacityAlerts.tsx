
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCapacityAlerts(calendarIds: string | string[]) {
  return useQuery({
    queryKey: ['capacity-alerts', calendarIds],
    queryFn: async () => {
      if (!calendarIds) return [];
      
      const ids = Array.isArray(calendarIds) ? calendarIds : [calendarIds];
      if (ids.length === 0) return [];

      console.log('🔍 Fetching capacity alerts for calendars:', ids);

      const alerts = [];
      const next7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
      });

      for (const date of next7Days) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Get bookings for this day across all selected calendars
        const { data: bookings } = await supabase
          .from('bookings')
          .select('calendar_id')
          .in('calendar_id', ids)
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())
          .neq('status', 'cancelled');

        const bookingCount = bookings?.length || 0;

        // Simple capacity logic - consider 8+ bookings as high capacity
        if (bookingCount >= 8) {
          alerts.push({
            date,
            type: 'fully-booked' as const,
            message: `${bookingCount} bookings scheduled`
          });
        } else if (bookingCount >= 6) {
          alerts.push({
            date,
            type: 'near-capacity' as const,
            message: `${bookingCount} bookings - near capacity`
          });
        }
      }

      return alerts;
    },
    enabled: !!calendarIds && (Array.isArray(calendarIds) ? calendarIds.length > 0 : true),
    staleTime: 300000, // 5 minutes
  });
}
