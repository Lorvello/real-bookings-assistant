
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';
import { getMockPerformanceData } from '@/hooks/useMockDataGenerator';

interface PerformanceEfficiencyData {
  no_show_rate: number;
  cancellation_rate: number;
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
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['optimized-performance-efficiency', calendarIds, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<PerformanceEfficiencyData | null> => {
      if (!calendarIds || calendarIds.length === 0 || !startDate || !endDate) return null;

      console.log('⚡ Fetching performance efficiency for calendars:', calendarIds, startDate, endDate);

      // Return mock data for developers or setup_incomplete users
      if (useMockData) {
        const mockData = getMockPerformanceData();
        return {
          no_show_rate: mockData.no_show_rate || 8.2,
          cancellation_rate: mockData.cancellation_rate || 12.5,
          booking_completion_rate: 87.5,
          unique_customers: 24,
          returning_customers: 18,
          total_customers: 42, // unique + returning
          peak_hours: mockData.peak_hours || [],
          last_updated: new Date().toISOString()
        };
      }

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
      // Count completed alongside confirmed: a finished appointment is still a successful
      // booking, so excluding it understated the rate the more diligently an owner marks
      // appointments 'completed' (and skewed peak-hours away from past, completed slots).
      const confirmedBookings = allBookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
      const noShowBookings = allBookings.filter(b => b.status === 'no-show');
      const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');

      // Customer identity = email if present, else phone. WhatsApp bookings carry NO email, so an
      // email-only count showed 0 customers despite real bookings (live bug). Aggregate across calendars.
      const customerId = (b: { customer_email?: string | null; customer_phone?: string | null }): string | null => {
        const email = (b.customer_email || '').trim();
        if (email) return `e:${email.toLowerCase()}`;
        const phone = (b.customer_phone || '').trim();
        return phone ? `p:${phone}` : null;
      };

      const currentPeriodCustomers = new Set(
        allBookings.map(customerId).filter((id): id is string => !!id)
      );

      // Returning = customers who also had bookings before this period (across the selected calendars).
      const { data: historicalBookings } = await supabase
        .from('bookings')
        .select('customer_email, customer_phone')
        .in('calendar_id', calendarIds)
        .neq('status', 'cancelled')
        .lt('start_time', startDate.toISOString());

      const historicalCustomers = new Set(
        (historicalBookings || []).map(customerId).filter((id): id is string => !!id)
      );

      // unique_customers = NEW customers this period (not seen before); returning = also seen
      // historically; total = all distinct customers this period.
      const currentArray = Array.from(currentPeriodCustomers);
      const returningCustomers = currentArray.filter(id => historicalCustomers.has(id)).length;
      const uniqueCustomers = currentArray.filter(id => !historicalCustomers.has(id)).length;
      const totalCustomers = currentPeriodCustomers.size;

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
