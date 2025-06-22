
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['business-intelligence', calendarId],
    queryFn: async (): Promise<BusinessIntelligenceData | null> => {
      if (!calendarId) return null;

      console.log('📊 Fetching business intelligence for:', calendarId);

      // This is now deprecated - use useOptimizedBusinessIntelligence instead
      // Return empty data to prevent errors
      return {
        calendar_id: calendarId,
        month_revenue: 0,
        prev_month_revenue: 0,
        unique_customers_month: 0,
        avg_booking_value: 0,
        whatsapp_conversion_rate: 0,
        service_performance: [],
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 60000,
    refetchInterval: 30000,
  });
}
