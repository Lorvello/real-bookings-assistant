
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FutureInsightsData {
  calendar_id: string;
  demand_forecast: Array<{
    week_number: number;
    bookings: number;
    trend_direction: string;
  }>;
  waitlist_size: number;
  returning_customers_month: number;
  seasonal_patterns: Array<{
    month_name: string;
    avg_bookings: number;
  }>;
  last_updated: string;
}

export function useFutureInsights(calendarId?: string) {
  return useQuery({
    queryKey: ['future-insights', calendarId],
    queryFn: async (): Promise<FutureInsightsData | null> => {
      if (!calendarId) return null;

      console.log('🔮 Fetching future insights for:', calendarId);

      // This is now deprecated - use useOptimizedFutureInsights instead
      // Return empty data to prevent errors
      return {
        calendar_id: calendarId,
        demand_forecast: [],
        waitlist_size: 0,
        returning_customers_month: 0,
        seasonal_patterns: [],
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 300000,
    refetchInterval: 120000,
  });
}
