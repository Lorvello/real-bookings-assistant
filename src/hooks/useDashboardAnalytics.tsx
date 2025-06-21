
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

      console.log('📊 Fetching dashboard analytics for calendar:', calendarId);

      // Probeer eerst de materialized view
      let { data: mvData } = await supabase
        .from('dashboard_metrics_mv')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      console.log('📈 Materialized view data:', mvData);

      // Als materialized view leeg is, bereken direct
      if (!mvData) {
        console.log('⚠️ Materialized view empty, calculating directly...');
        
        const today = new Date().toISOString().split('T')[0];
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const monthStart = new Date();
        monthStart.setDate(1);

        // Haal alle bookings op voor deze kalender
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            *,
            service_types!left(price)
          `)
          .eq('calendar_id', calendarId);

        if (error) {
          console.error('❌ Error fetching bookings:', error);
          throw error;
        }

        console.log('📋 Direct bookings data:', bookings);

        if (!bookings || bookings.length === 0) {
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

        // Bereken metrics handmatig
        const todayBookings = bookings.filter(b => 
          b.start_time && 
          new Date(b.start_time).toDateString() === new Date().toDateString() &&
          b.status !== 'cancelled'
        ).length;

        const pendingBookings = bookings.filter(b => b.status === 'pending').length;

        const weekBookings = bookings.filter(b => 
          b.start_time && 
          new Date(b.start_time) >= weekStart &&
          b.status !== 'cancelled'
        ).length;

        const monthBookings = bookings.filter(b => 
          b.start_time && 
          new Date(b.start_time) >= monthStart &&
          b.status !== 'cancelled'
        ).length;

        const monthRevenue = bookings
          .filter(b => 
            b.start_time && 
            new Date(b.start_time) >= monthStart &&
            b.status !== 'cancelled'
          )
          .reduce((sum, b) => {
            const price = b.total_price || b.service_types?.price || 0;
            return sum + Number(price);
          }, 0);

        return {
          today_bookings: todayBookings,
          pending_bookings: pendingBookings,
          week_bookings: weekBookings,
          month_bookings: monthBookings,
          total_revenue: monthRevenue,
          conversion_rate: 0,
          avg_response_time: 0,
          last_updated: new Date().toISOString(),
        };
      }

      // Gebruik materialized view data
      return {
        today_bookings: mvData.today_bookings || 0,
        pending_bookings: mvData.pending_bookings || 0,
        week_bookings: mvData.week_bookings || 0,
        month_bookings: mvData.month_bookings || 0,
        total_revenue: Number(mvData.month_revenue || 0),
        conversion_rate: 0,
        avg_response_time: 0,
        last_updated: mvData.last_updated || new Date().toISOString(),
      };
    },
    enabled: !!calendarId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
    retry: 3,
  });
}
