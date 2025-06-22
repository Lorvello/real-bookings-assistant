
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/dashboard/useRealtimeSubscription';

interface BusinessIntelligenceData {
  calendar_id: string;
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

export function useBusinessIntelligence(calendarId?: string) {
  useRealtimeSubscription(calendarId);

  return useQuery({
    queryKey: ['business-intelligence', calendarId],
    queryFn: async (): Promise<BusinessIntelligenceData | null> => {
      if (!calendarId) return null;

      const { data, error } = await supabase
        .from('business_intelligence_mv')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (error) {
        console.error('Error fetching business intelligence:', error);
        throw error;
      }

      return data;
    },
    enabled: !!calendarId,
    staleTime: 60000, // 1 minute
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
