
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMockBusinessIntelligenceData } from '../useMockDataGenerator';

interface BusinessIntelligenceData {
  current_period_revenue: number;
  prev_period_revenue: number;
  unique_customers: number;
  returning_customers: number;
  avg_booking_value: number;
  service_performance: Array<{
    service_name: string;
    booking_count: number;
    revenue: number;
    avg_price: number;
  }>;
  last_updated: string;
}

export function useOptimizedBusinessIntelligence(
  calendarId?: string, 
  startDate?: Date, 
  endDate?: Date
) {
  return useQuery({
    queryKey: ['optimized-business-intelligence', calendarId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<BusinessIntelligenceData | null> => {
      if (!calendarId || !startDate || !endDate) return null;

      console.log('📊 Fetching business intelligence for:', calendarId, startDate, endDate);

      // Calculate the previous period of the same length for comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = new Date(startDate.getTime());

      // Get bookings for current period and previous period
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types!inner(name, price)
        `)
        .eq('calendar_id', calendarId)
        .neq('status', 'cancelled')
        .gte('start_time', prevStartDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      const currentPeriodBookings = bookingsData?.filter(b => 
        new Date(b.start_time) >= startDate && new Date(b.start_time) <= endDate
      ) || [];

      const previousPeriodBookings = bookingsData?.filter(b => 
        new Date(b.start_time) >= prevStartDate && new Date(b.start_time) < startDate
      ) || [];

      // Calculate unique customers for current period
      const currentPeriodEmails = new Set(currentPeriodBookings.map(b => b.customer_email));
      
      // Calculate returning customers (customers who also had bookings before current period)
      const { data: historicalBookings } = await supabase
        .from('bookings')
        .select('customer_email')
        .eq('calendar_id', calendarId)
        .neq('status', 'cancelled')
        .lt('start_time', startDate.toISOString());

      const historicalEmails = new Set(historicalBookings?.map(b => b.customer_email) || []);
      const returningCustomers = [...currentPeriodEmails].filter(email => historicalEmails.has(email)).length;

      // Calculate service performance for current period
      const serviceStats = new Map();
      currentPeriodBookings.forEach(booking => {
        const serviceName = booking.service_name || booking.service_types?.name || 'Unknown';
        const price = booking.total_price || booking.service_types?.price || 0;
        
        if (!serviceStats.has(serviceName)) {
          serviceStats.set(serviceName, { count: 0, revenue: 0 });
        }
        
        const stats = serviceStats.get(serviceName);
        stats.count += 1;
        stats.revenue += price;
      });

      const servicePerformance = Array.from(serviceStats.entries()).map(([name, stats]) => ({
        service_name: name,
        booking_count: stats.count,
        revenue: stats.revenue,
        avg_price: stats.count > 0 ? stats.revenue / stats.count : 0
      }));

      // If no real data exists, return mock data for trial users
      if (currentPeriodBookings.length === 0) {
        return getMockBusinessIntelligenceData();
      }

      return {
        current_period_revenue: currentPeriodBookings.reduce((sum, b) => 
          sum + (b.total_price || b.service_types?.price || 0), 0),
        prev_period_revenue: previousPeriodBookings.reduce((sum, b) => 
          sum + (b.total_price || b.service_types?.price || 0), 0),
        unique_customers: currentPeriodEmails.size,
        returning_customers: returningCustomers,
        avg_booking_value: currentPeriodBookings.length > 0 
          ? currentPeriodBookings.reduce((sum, b) => sum + (b.total_price || b.service_types?.price || 0), 0) / currentPeriodBookings.length
          : 0,
        service_performance: servicePerformance,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId && !!startDate && !!endDate,
    staleTime: 300000, // 5 minutes
    gcTime: 900000, // 15 minutes
    refetchInterval: 600000, // 10 minutes
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
