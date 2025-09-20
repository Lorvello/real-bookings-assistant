
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ServicePopularity {
  service_name: string;
  booking_count: number;
  percentage: number;
}

export function useServicePopularity(calendarId?: string) {
  return useQuery({
    queryKey: ['service-popularity', calendarId],
    queryFn: async (): Promise<ServicePopularity[]> => {
      if (!calendarId) return [];

      const { data, error } = await supabase
        .from('service_popularity_stats')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('booking_count', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes
  });
}
