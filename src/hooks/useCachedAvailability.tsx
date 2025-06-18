
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CachedSlot {
  slot_start: string;
  slot_end: string;
  is_available: boolean;
}

export const useCachedAvailability = (
  calendarId: string,
  serviceTypeId: string,
  dateRange: { start: string; end: string }
) => {
  const queryClient = useQueryClient();

  const fetchAvailableSlots = async (): Promise<CachedSlot[]> => {
    if (!calendarId || !serviceTypeId) return [];

    const { data, error } = await supabase.rpc('get_available_slots_range', {
      p_calendar_id: calendarId,
      p_service_type_id: serviceTypeId,
      p_start_date: dateRange.start,
      p_end_date: dateRange.end
    });

    if (error) {
      console.error('Error fetching available slots:', error);
      throw error;
    }

    return data || [];
  };

  const availabilityQuery = useQuery({
    queryKey: ['availability', calendarId, serviceTypeId, dateRange.start, dateRange.end],
    queryFn: fetchAvailableSlots,
    enabled: !!calendarId && !!serviceTypeId,
    staleTime: 60 * 1000, // 1 minuut - availability verandert snel
    gcTime: 5 * 60 * 1000, // 5 minuten cache (was cacheTime)
    refetchOnWindowFocus: true,
    retry: 1
  });

  // Prefetch volgende week/maand voor betere UX
  const prefetchNextPeriod = (days: number = 7) => {
    const nextStart = new Date(dateRange.end);
    nextStart.setDate(nextStart.getDate() + 1);
    
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + days);

    queryClient.prefetchQuery({
      queryKey: [
        'availability', 
        calendarId, 
        serviceTypeId, 
        nextStart.toISOString().split('T')[0],
        nextEnd.toISOString().split('T')[0]
      ],
      queryFn: async () => {
        const { data } = await supabase.rpc('get_available_slots_range', {
          p_calendar_id: calendarId,
          p_service_type_id: serviceTypeId,
          p_start_date: nextStart.toISOString().split('T')[0],
          p_end_date: nextEnd.toISOString().split('T')[0]
        });
        return data || [];
      },
      staleTime: 60 * 1000
    });
  };

  return {
    slots: availabilityQuery.data || [],
    loading: availabilityQuery.isLoading,
    error: availabilityQuery.error,
    refetch: availabilityQuery.refetch,
    prefetchNextPeriod
  };
};
