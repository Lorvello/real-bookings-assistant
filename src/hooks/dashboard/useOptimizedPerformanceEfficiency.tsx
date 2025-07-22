
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceEfficiencyData {
  no_show_rate: number;
  cancellation_rate: number;
  customer_satisfaction_score: number;
  booking_completion_rate: number;
  unique_customers: number;
  returning_customers: number;
  total_customers: number;
  peak_hours: Array<{
    hour: number;
    bookings: number;
    hour_label: string;
  }>;
  last_updated: string;
}

export function useOptimizedPerformanceEfficiency(
  calendarIds?: string[],
  startDate?: Date,
  endDate?: Date
) {
  return useQuery({
    queryKey: ['optimized-performance-efficiency', calendarIds, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<PerformanceEfficiencyData | null> => {
      if (!calendarIds || calendarIds.length === 0 || !startDate || !endDate) return null;

      console.log('⚡ Fetching performance efficiency for calendars:', calendarIds, startDate, endDate);

      // Get bookings for the selected date range across all selected calendars
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, service_types(price)')
        .in('calendar_id', calendarIds)
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

      // Calculate customer metrics - aggregate unique customers across all calendars
      const currentPeriodEmails = new Set(allBookings.map(b => b.customer_email));
      
      // Calculate returning customers (customers who also had bookings before current period across any calendar)
      const { data: historicalBookings } = await supabase
        .from('bookings')
        .select('customer_email')
        .in('calendar_id', calendarIds)
        .neq('status', 'cancelled')
        .lt('start_time', startDate.toISOString());

      const historicalEmails = new Set(historicalBookings?.map(b => b.customer_email) || []);
      
      // Correct customer logic:
      // - unique_customers: New customers (not in historical data)
      // - returning_customers: Customers who are also in historical data
      // - total_customers: unique_customers + returning_customers
      const returningCustomers = [...currentPeriodEmails].filter(email => historicalEmails.has(email)).length;
      const uniqueCustomers = [...currentPeriodEmails].filter(email => !historicalEmails.has(email)).length;
      const totalCustomers = uniqueCustomers + returningCustomers;

      // Calculate peak hours for confirmed bookings only - aggregate across all calendars
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

      // Calculate rates based on total bookings (including cancelled/no-show) across all calendars
      const totalBookings = allBookings.length;

      return {
        no_show_rate: totalBookings > 0 ? (noShowBookings.length / totalBookings) * 100 : 0,
        cancellation_rate: totalBookings > 0 ? (cancelledBookings.length / totalBookings) * 100 : 0,
        customer_satisfaction_score: 4.2 + Math.random() * 0.8, // Mock score 4.2-5.0
        booking_completion_rate: totalBookings > 0 ? (confirmedBookings.length / totalBookings) * 100 : 0,
        unique_customers: uniqueCustomers,
        returning_customers: returningCustomers,
        total_customers: totalCustomers,
        peak_hours: peakHours,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0 && !!startDate && !!endDate,
    staleTime: 600000, // 10 minutes
    gcTime: 1200000, // 20 minutes
    refetchInterval: 900000, // 15 minutes
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
