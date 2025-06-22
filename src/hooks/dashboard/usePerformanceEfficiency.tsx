
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceEfficiencyData {
  calendar_id: string;
  avg_response_time_minutes: number;
  no_show_rate: number;  
  cancellation_rate: number;
  calendar_utilization_rate: number;
  peak_hours: Array<{
    hour: number;
    count: number;
  }>;
  last_updated: string;
}

export function usePerformanceEfficiency(calendarId?: string) {
  return useQuery({
    queryKey: ['performance-efficiency', calendarId],
    queryFn: async (): Promise<PerformanceEfficiencyData | null> => {
      if (!calendarId) return null;

      console.log('⚡ Fetching performance efficiency for:', calendarId);

      // This is now deprecated - use useOptimizedPerformanceEfficiency instead
      // Return empty data to prevent errors
      return {
        calendar_id: calendarId,
        avg_response_time_minutes: 0,
        no_show_rate: 0,
        cancellation_rate: 0,
        calendar_utilization_rate: 0,
        peak_hours: [],
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 120000,
    refetchInterval: 60000,
  });
}
