
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OptimizedAnalyticsData {
  calendarStats: {
    total_bookings: number;
    completed_bookings: number;
    no_show_bookings: number;
    cancelled_bookings: number;
    avg_duration_minutes: number;
    total_revenue: number;
  } | null;
  serviceTypeStats: {
    service_type_id: string;
    service_name: string;
    booking_count: number;
    avg_duration: number;
    total_revenue: number;
    no_show_count: number;
  }[];
}

export const useOptimizedAnalytics = (calendarId?: string, period: 'week' | 'month' | 'quarter' = 'month') => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchOptimizedAnalytics = async (): Promise<OptimizedAnalyticsData> => {
    if (!calendarId) {
      return { calendarStats: null, serviceTypeStats: [] };
    }

    // Haal data op uit materialized views voor snelle queries
    const [calendarStatsResult, serviceStatsResult] = await Promise.all([
      supabase
        .from('calendar_stats')
        .select('*')
        .eq('calendar_id', calendarId)
        .maybeSingle(),
      
      supabase
        .from('service_type_stats')
        .select('*')
        .eq('calendar_id', calendarId)
    ]);

    if (calendarStatsResult.error) {
      console.error('Error fetching calendar stats:', calendarStatsResult.error);
      throw calendarStatsResult.error;
    }

    if (serviceStatsResult.error) {
      console.error('Error fetching service stats:', serviceStatsResult.error);
      throw serviceStatsResult.error;
    }

    return {
      calendarStats: calendarStatsResult.data,
      serviceTypeStats: serviceStatsResult.data || []
    };
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['optimized-analytics', calendarId, period],
    queryFn: fetchOptimizedAnalytics,
    enabled: !!calendarId,
    staleTime: 5 * 60 * 1000, // 5 minuten - data blijft fresh
    gcTime: 10 * 60 * 1000, // 10 minuten - cache tijd (was cacheTime)
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60 * 1000, // Refresh elke 10 minuten
    retry: 2,
    meta: {
      onError: (error: any) => {
        console.error('Analytics fetch error:', error);
        toast({
          title: "Fout bij laden analytics",
          description: "Kon geoptimaliseerde analytics niet laden",
          variant: "destructive",
        });
      }
    }
  });

  const refreshMaterializedViews = async () => {
    try {
      const { error } = await supabase.rpc('refresh_analytics_views');
      
      if (error) {
        console.error('Error refreshing materialized views:', error);
        return false;
      }

      // Invalidate queries om nieuwe data op te halen
      queryClient.invalidateQueries({ queryKey: ['optimized-analytics'] });
      
      toast({
        title: "Analytics bijgewerkt",
        description: "Analytics data is vernieuwd",
      });
      
      return true;
    } catch (error) {
      console.error('Error refreshing views:', error);
      toast({
        title: "Fout bij bijwerken",
        description: "Kon analytics niet vernieuwen",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    analytics: data,
    loading: isLoading,
    error,
    refetch,
    refreshMaterializedViews
  };
};
