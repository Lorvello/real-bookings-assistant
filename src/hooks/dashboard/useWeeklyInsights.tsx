
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';

export function useWeeklyInsights(calendarIds: string[]) {
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['weekly-insights', calendarIds],
    queryFn: async () => {
      if (!calendarIds || calendarIds.length === 0) return null;

      console.log('📈 Fetching weekly insights for calendars:', calendarIds);

      // Mock data for developers or setup_incomplete users
      if (useMockData) {
        return {
          current_week: 28,
          previous_week: 22,
          growth_percentage: 27.3,
          trend: 'up' as const
        };
      }

      const now = new Date();
      
      // Calculate current week boundaries
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 7);
      
      // Calculate previous week boundaries
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(currentWeekStart.getDate() - 7);
      
      const previousWeekEnd = new Date(currentWeekStart);

      // Get current week bookings
      const { data: currentWeekBookings, error: currentError } = await supabase
        .from('bookings')
        .select('id')
        .in('calendar_id', calendarIds)
        .neq('status', 'cancelled')
        .gte('start_time', currentWeekStart.toISOString())
        .lt('start_time', currentWeekEnd.toISOString());

      // Get previous week bookings
      const { data: previousWeekBookings, error: previousError } = await supabase
        .from('bookings')
        .select('id')
        .in('calendar_id', calendarIds)
        .neq('status', 'cancelled')
        .gte('start_time', previousWeekStart.toISOString())
        .lt('start_time', previousWeekEnd.toISOString());

      if (currentError || previousError) {
        console.error('Error fetching weekly insights:', currentError || previousError);
        throw currentError || previousError;
      }

      const currentWeekCount = currentWeekBookings?.length || 0;
      const previousWeekCount = previousWeekBookings?.length || 0;

      let growthPercentage = 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';

      if (previousWeekCount > 0) {
        growthPercentage = ((currentWeekCount - previousWeekCount) / previousWeekCount) * 100;
        trend = growthPercentage > 0 ? 'up' : growthPercentage < 0 ? 'down' : 'stable';
      } else if (currentWeekCount > 0) {
        growthPercentage = 100;
        trend = 'up';
      }

      return {
        current_week: currentWeekCount,
        previous_week: previousWeekCount,
        growth_percentage: Math.round(growthPercentage * 10) / 10,
        trend
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
  });
}
