
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BusinessIntelligenceData {
  month_revenue: number;
  prev_month_revenue: number;
  unique_customers_month: number;
  avg_booking_value: number;
  whatsapp_conversion_rate: number;
  service_performance: Array<{
    service_name: string;
    booking_count: number;
    revenue: number;
    avg_price: number;
  }>;
  last_updated: string;
}

export function useOptimizedBusinessIntelligence(calendarId?: string) {
  return useQuery({
    queryKey: ['optimized-business-intelligence', calendarId],
    queryFn: async (): Promise<BusinessIntelligenceData | null> => {
      if (!calendarId) return null;

      console.log('📊 Fetching business intelligence for:', calendarId);

      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get bookings for this month and last month
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types!inner(name, price)
        `)
        .eq('calendar_id', calendarId)
        .neq('status', 'cancelled')
        .gte('start_time', startOfLastMonth.toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      // Get booking intents for conversion rate
      const { data: intentsData, error: intentsError } = await supabase
        .from('booking_intents')
        .select(`
          *,
          whatsapp_conversations!inner(calendar_id)
        `)
        .eq('whatsapp_conversations.calendar_id', calendarId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (intentsError) {
        console.error('Error fetching intents:', intentsError);
      }

      const thisMonthBookings = bookingsData?.filter(b => 
        new Date(b.start_time) >= startOfThisMonth
      ) || [];

      const lastMonthBook­ings = bookingsData?.filter(b => 
        new Date(b.start_time) >= startOfLastMonth && 
        new Date(b.start_time) <= endOfLastMonth
      ) || [];

      // Calculate service performance
      const serviceStats = new Map();
      thisMonthBookings.forEach(booking => {
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

      // Calculate conversion rate
      const totalIntents = intentsData?.length || 0;
      const completedIntents = intentsData?.filter(i => i.status === 'completed').length || 0;
      const conversionRate = totalIntents > 0 ? (completedIntents / totalIntents) * 100 : 0;

      return {
        month_revenue: thisMonthBookings.reduce((sum, b) => 
          sum + (b.total_price || b.service_types?.price || 0), 0),
        prev_month_revenue: lastMonthBookings.reduce((sum, b) => 
          sum + (b.total_price || b.service_types?.price || 0), 0),
        unique_customers_month: new Set(thisMonthBookings.map(b => b.customer_email)).size,
        avg_booking_value: thisMonthBookings.length > 0 
          ? thisMonthBookings.reduce((sum, b) => sum + (b.total_price || b.service_types?.price || 0), 0) / thisMonthBookings.length
          : 0,
        whatsapp_conversion_rate: conversionRate,
        service_performance: servicePerformance,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes (increased from 2 minutes)
    gcTime: 900000, // 15 minutes (increased from 10 minutes)
    refetchInterval: 600000, // 10 minutes (increased from 5 minutes)
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
