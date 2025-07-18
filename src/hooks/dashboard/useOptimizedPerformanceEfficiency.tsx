
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMockPerformanceData } from '../useMockDataGenerator';

interface PerformanceEfficiencyData {
  avg_booking_value: number;
  no_show_rate: number;
  cancellation_rate: number;
  avg_revenue_per_day: number;
  peak_hours: Array<{
    hour: number;
    bookings: number;
    hour_label: string;
  }>;
  last_updated: string;
}

export function useOptimizedPerformanceEfficiency(
  calendarId?: string,
  startDate?: Date,
  endDate?: Date
) {
  return useQuery({
    queryKey: ['optimized-performance-efficiency', calendarId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<PerformanceEfficiencyData | null> => {
      if (!calendarId || !startDate || !endDate) return null;

      console.log('⚡ Fetching performance efficiency for:', calendarId, startDate, endDate);

      // Get bookings for the selected date range
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, service_types(price)')
        .eq('calendar_id', calendarId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      const allBookings = bookingsData || [];
      const confirmedBookings = allBookings.filter(b => b.status === 'confirmed');
      const noShowBookings = allBookings.filter(b => b.status === 'no-show');
      const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');

      // Calculate peak hours for confirmed bookings only
      const hourCounts = new Map();
      confirmedBookings.forEach(booking => {
        const hour = new Date(booking.start_time).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });

      const peakHours = Array.from(hourCounts.entries())
        .map(([hour, bookings]) => ({ 
          hour: Number(hour), 
          bookings,
          hour_label: `${String(hour).padStart(2, '0')}:00`
        }))
        .sort((a, b) => b.bookings - a.bookings);

      // Calculate average booking value from confirmed bookings
      const totalBookingValue = confirmedBookings.reduce((sum, b) => {
        const price = b.total_price || (b.service_types as any)?.price || 0;
        return sum + Number(price);
      }, 0);
      
      const avgBookingValue = confirmedBookings.length > 0 ? totalBookingValue / confirmedBookings.length : 0;

      // Calculate average revenue per day
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgRevenuePerDay = periodDays > 0 ? totalBookingValue / periodDays : 0;

      // Calculate rates based on total bookings (including cancelled/no-show)
      const totalBookings = allBookings.length;

      // If no real data exists, return mock data for trial users
      if (totalBookings === 0) {
        return getMockPerformanceData();
      }

      return {
        avg_booking_value: avgBookingValue,
        no_show_rate: totalBookings > 0 ? (noShowBookings.length / totalBookings) * 100 : 0,
        cancellation_rate: totalBookings > 0 ? (cancelledBookings.length / totalBookings) * 100 : 0,
        avg_revenue_per_day: avgRevenuePerDay,
        peak_hours: peakHours,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId && !!startDate && !!endDate,
    staleTime: 600000, // 10 minutes
    gcTime: 1200000, // 20 minutes
    refetchInterval: 900000, // 15 minutes
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
