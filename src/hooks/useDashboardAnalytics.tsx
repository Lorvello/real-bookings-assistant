
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
      return (data as unknown as DashboardMetrics) || {
        today_bookings: 0,
        pending_bookings: 0,
        week_bookings: 0,
        month_bookings: 0,
        total_revenue: 0,
        conversion_rate: 0,
        avg_response_time: 0,
        last_updated: new Date().toISOString(),
      };
    },
    enabled: !!calendarId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}
