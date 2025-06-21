
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardMetrics {
  today_bookings: number;
  pending_bookings: number;
  week_bookings: number;
  month_bookings: number;
  total_revenue: number;
  conversion_rate: number;
  avg_response_time: number;
  last_updated: string;
  // Add comparison data
  prev_week_bookings?: number;
  prev_month_revenue?: number;
  prev_week_response_time?: number;
  prev_week_customers?: number;
}

export function useDashboardAnalytics(calendarId?: string) {
  return useQuery({
    queryKey: ['dashboard-analytics', calendarId],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!calendarId) {
        return {
          today_bookings: 0,
          pending_bookings: 0,
          week_bookings: 0,
          month_bookings: 0,
          total_revenue: 0,
          conversion_rate: 0,
          avg_response_time: 0,
          last_updated: new Date().toISOString(),
        };
      }

      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_calendar_id: calendarId
      });

      if (error) throw error;
      
      const baseMetrics = (data as unknown as DashboardMetrics) || {
        today_bookings: 0,
        pending_bookings: 0,
        week_bookings: 0,
        month_bookings: 0,
        total_revenue: 0,
        conversion_rate: 0,
        avg_response_time: 0,
        last_updated: new Date().toISOString(),
      };

      // Get comparison data for percentages
      const [prevWeekData, prevMonthData, prevWeekResponseTime, prevWeekCustomers] = await Promise.all([
        // Previous week bookings
        supabase
          .from('bookings')
          .select('id', { count: 'exact' })
          .eq('calendar_id', calendarId)
          .gte('start_time', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .lt('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .neq('status', 'cancelled'),
        
        // Previous month revenue
        supabase
          .from('bookings')
          .select('total_price, service_types!inner(price)')
          .eq('calendar_id', calendarId)
          .gte('start_time', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
          .lt('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .neq('status', 'cancelled'),
        
        // Previous week response time (simplified calculation)
        supabase
          .from('whatsapp_messages')
          .select('created_at, whatsapp_conversations!inner(calendar_id)')
          .eq('whatsapp_conversations.calendar_id', calendarId)
          .eq('direction', 'inbound')
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(10),
        
        // Previous week new customers
        supabase
          .from('bookings')
          .select('customer_email', { count: 'exact' })
          .eq('calendar_id', calendarId)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .neq('status', 'cancelled')
      ]);

      // Calculate previous week bookings
      const prevWeekBookings = prevWeekData.count || 0;
      
      // Calculate previous month revenue
      let prevMonthRevenue = 0;
      if (prevMonthData.data) {
        prevMonthRevenue = prevMonthData.data.reduce((sum, booking) => {
          const price = booking.total_price || booking.service_types?.price || 0;
          return sum + Number(price);
        }, 0);
      }
      
      // Simple previous response time estimate
      const prevWeekAvgResponseTime = 3; // Simplified for now
      
      // Previous week customers
      const prevWeekCustomersCount = prevWeekCustomers.count || 0;

      return {
        ...baseMetrics,
        prev_week_bookings: prevWeekBookings,
        prev_month_revenue: prevMonthRevenue,
        prev_week_response_time: prevWeekAvgResponseTime,
        prev_week_customers: prevWeekCustomersCount,
      };
    },
    enabled: !!calendarId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}
