
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';
import { getMockBusinessIntelligenceData } from '@/hooks/useMockDataGenerator';

interface BusinessIntelligenceData {
  current_period_revenue: number;
  prev_period_revenue: number;
  avg_booking_value: number;
  monthly_growth: number;
  revenue_per_day: number;
  service_performance: Array<{
    service_name: string;
    booking_count: number;
    revenue: number;
    avg_price: number;
  }>;
  last_updated: string;
}

export function useOptimizedBusinessIntelligence(
  calendarIds?: string[], 
  startDate?: Date, 
  endDate?: Date
) {
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['optimized-business-intelligence', calendarIds, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<BusinessIntelligenceData | null> => {
      if (!calendarIds || calendarIds.length === 0 || !startDate || !endDate) return null;

      console.log('📊 Fetching business intelligence for calendars:', calendarIds, startDate, endDate);

      // Return mock data for developers or setup_incomplete users
      if (useMockData) {
        return {
          ...getMockBusinessIntelligenceData(),
          last_updated: new Date().toISOString()
        };
      }

      // Calculate the previous period of the same length for comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = new Date(startDate.getTime());

      // Get bookings for current period and previous period across all selected calendars
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types!inner(name, price)
        `)
        .in('calendar_id', calendarIds)
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

      // Calculate financial metrics - aggregate across all calendars
      const currentPeriodRevenue = currentPeriodBookings.reduce((sum, b) => 
        sum + (b.total_price || b.service_types?.price || 0), 0);
      
      const previousPeriodRevenue = previousPeriodBookings.reduce((sum, b) => 
        sum + (b.total_price || b.service_types?.price || 0), 0);

      // Calculate monthly growth percentage
      const monthlyGrowth = previousPeriodRevenue > 0 
        ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : 0;

      // Calculate revenue per day
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const revenuePerDay = periodDays > 0 ? currentPeriodRevenue / periodDays : 0;

      // Calculate service performance for current period - aggregate across all calendars
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

      return {
        current_period_revenue: currentPeriodRevenue,
        prev_period_revenue: previousPeriodRevenue,
        avg_booking_value: currentPeriodBookings.length > 0 
          ? currentPeriodRevenue / currentPeriodBookings.length
          : 0,
        monthly_growth: monthlyGrowth,
        revenue_per_day: revenuePerDay,
        service_performance: servicePerformance,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0 && !!startDate && !!endDate,
    staleTime: 300000, // 5 minutes
    gcTime: 900000, // 15 minutes
    refetchInterval: 600000, // 10 minutes
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
