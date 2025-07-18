import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCapacityAlerts(calendarId: string) {
  return useQuery({
    queryKey: ['capacity-alerts', calendarId],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      // Get bookings for the next 7 days
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('calendar_id', calendarId)
        .gte('start_time', today.toISOString())
        .lt('start_time', nextWeek.toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;
      
      // Get calendar settings for max bookings per day
      const { data: settings } = await supabase
        .from('calendar_settings')
        .select('max_bookings_per_day')
        .eq('calendar_id', calendarId)
        .single();
      
      const maxBookingsPerDay = settings?.max_bookings_per_day || 10;
      
      // Group bookings by date
      const bookingsByDate = bookings?.reduce((acc: Record<string, number>, booking) => {
        const date = new Date(booking.start_time).toDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};
      
      // Find days approaching or exceeding capacity
      const alerts = [];
      
      for (const [date, count] of Object.entries(bookingsByDate)) {
        if (count >= maxBookingsPerDay) {
          alerts.push({
            type: 'fully-booked',
            date: new Date(date),
            count,
            maxBookings: maxBookingsPerDay,
            message: `Fully booked (${count}/${maxBookingsPerDay} bookings)`
          });
        } else if (count >= maxBookingsPerDay * 0.8) {
          alerts.push({
            type: 'near-capacity',
            date: new Date(date),
            count,
            maxBookings: maxBookingsPerDay,
            message: `Near capacity (${count}/${maxBookingsPerDay} bookings)`
          });
        }
      }
      
      // Sort alerts by date
      alerts.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      return alerts.slice(0, 3); // Return max 3 alerts
    },
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes
  });
}