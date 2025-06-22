
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';

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
  useRealtimeSubscription(calendarId);

  return useQuery({
    queryKey: ['performance-efficiency', calendarId],
    queryFn: async (): Promise<PerformanceEfficiencyData | null> => {
      if (!calendarId) return null;

      const { data, error } = await supabase
        .from('performance_efficiency_mv')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (error) {
        console.error('Error fetching performance efficiency:', error);
        throw error;
      }

      return data;
    },
    enabled: !!calendarId,
    staleTime: 120000, // 2 minutes
    refetchInterval: 60000, // Refetch every minute
  });
}
