
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';

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
  useRealtimeSubscription(calendarId);

  return useQuery({
    queryKey: ['future-insights', calendarId],
    queryFn: async (): Promise<FutureInsightsData | null> => {
      if (!calendarId) return null;

      const { data, error } = await supabase
        .from('future_insights_mv')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (error) {
        console.error('Error fetching future insights:', error);
        throw error;
      }

      return data;
    },
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}
