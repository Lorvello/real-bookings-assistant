import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWeeklyInsights(calendarId: string) {
  return useQuery({
    queryKey: ['weekly-insights', calendarId],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('calendar_id', calendarId)
        .gte('start_time', oneWeekAgo.toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return null;
      }
      
      // Count bookings by day of week
      const dayCounts = data.reduce((acc: Record<number, number>, booking) => {
        const dayOfWeek = new Date(booking.start_time).getDay();
        acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
        return acc;
      }, {});
      
      // Count bookings by hour
      const hourCounts = data.reduce((acc: Record<number, number>, booking) => {
        const hour = new Date(booking.start_time).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});
      
      // Find busiest day
      const busiestDay = Object.entries(dayCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      // Find most active hours (2-hour window)
      let maxHourCount = 0;
      let busiestHourRange = '';
      
      for (let hour = 0; hour <= 22; hour++) {
        const count = (hourCounts[hour] || 0) + (hourCounts[hour + 1] || 0);
        if (count > maxHourCount) {
          maxHourCount = count;
          busiestHourRange = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 2).toString().padStart(2, '0')}:00`;
        }
      }
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      return {
        busiestDay: busiestDay ? dayNames[parseInt(busiestDay[0])] : null,
        busiestDayCount: busiestDay ? busiestDay[1] : 0,
        mostActiveHours: busiestHourRange || null,
        mostActiveHoursCount: maxHourCount
      };
    },
    enabled: !!calendarId,
    staleTime: 300000, // 5 minutes
  });
}