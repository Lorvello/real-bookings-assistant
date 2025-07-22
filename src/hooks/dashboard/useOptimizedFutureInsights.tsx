
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMockFutureInsightsData } from '../useMockDataGenerator';

interface FutureInsightsData {
  demand_forecast: Array<{
    week_number: number;
    bookings: number;
    trend_direction: string;
  }>;
  customer_growth_rate: number;
  capacity_utilization: number;
  seasonal_patterns: Array<{
    month_name: string;
    avg_bookings: number;
  }>;
  last_updated: string;
}

export function useOptimizedFutureInsights(calendarIds?: string | string[]) {
  return useQuery({
    queryKey: ['optimized-future-insights', calendarIds],
    queryFn: async (): Promise<FutureInsightsData | null> => {
      if (!calendarIds) return null;

      const ids = Array.isArray(calendarIds) ? calendarIds : [calendarIds];
      if (ids.length === 0) return null;

      console.log('🔮 Fetching future insights for calendars:', ids);

      // Get calendar settings to calculate capacity (use first calendar for now)
      const { data: calendarSettings } = await supabase
        .from('calendar_settings')
        .select('*')
        .in('calendar_id', ids)
        .limit(1)
        .single();

      // Get availability rules to calculate total available hours (use first calendar for now)
      const { data: availabilityData } = await supabase
        .from('availability_schedules')
        .select(`
          *,
          availability_rules(*)
        `)
        .in('calendar_id', ids)
        .eq('is_default', true)
        .limit(1);

      // Get historical booking data for trend analysis across all selected calendars
      const { data: historicalBookings, error: historicalError } = await supabase
        .from('bookings')
        .select('start_time, status, customer_email, calendar_id')
        .in('calendar_id', ids)
        .gte('start_time', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // 60 days
        .neq('status', 'cancelled');

      if (historicalError) {
        console.error('Error fetching historical bookings:', historicalError);
        throw historicalError;
      }

      // Calculate customer growth rate (current month vs previous month) across all calendars
      const currentMonth = new Date();
      const startOfCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const startOfPreviousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);

      const { data: currentMonthBookings } = await supabase
        .from('bookings')
        .select('customer_email')
        .in('calendar_id', ids)
        .gte('start_time', startOfCurrentMonth.toISOString())
        .neq('status', 'cancelled');

      const { data: previousMonthBookings } = await supabase
        .from('bookings')
        .select('customer_email')
        .in('calendar_id', ids)
        .gte('start_time', startOfPreviousMonth.toISOString())
        .lt('start_time', startOfCurrentMonth.toISOString())
        .neq('status', 'cancelled');

      const currentMonthCustomers = new Set(currentMonthBookings?.map(b => b.customer_email) || []).size;
      const previousMonthCustomers = new Set(previousMonthBookings?.map(b => b.customer_email) || []).size;
      
      const customerGrowthRate = previousMonthCustomers > 0 
        ? ((currentMonthCustomers - previousMonthCustomers) / previousMonthCustomers) * 100
        : currentMonthCustomers > 0 ? 100 : 0;

      // Calculate capacity utilization (simplified for multiple calendars)
      let capacityUtilization = 0;
      if (availabilityData && availabilityData.length > 0) {
        // Calculate total available hours per week for the first calendar
        const schedule = availabilityData[0];
        const rules = schedule.availability_rules || [];
        
        const totalWeeklyHours = rules.reduce((total, rule) => {
          if (rule.is_available) {
            const start = new Date(`1970-01-01T${rule.start_time}`);
            const end = new Date(`1970-01-01T${rule.end_time}`);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return total + hours;
          }
          return total;
        }, 0);

        // Calculate booked hours this week across all calendars
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const { data: weekBookings } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .in('calendar_id', ids)
          .neq('status', 'cancelled')
          .gte('start_time', weekStart.toISOString())
          .lt('start_time', weekEnd.toISOString());

        const bookedHours = weekBookings?.reduce((total, booking) => {
          const start = new Date(booking.start_time);
          const end = new Date(booking.end_time);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }, 0) || 0;

        // Multiply by number of calendars for total capacity
        const totalCapacity = totalWeeklyHours * ids.length;
        capacityUtilization = totalCapacity > 0 ? (bookedHours / totalCapacity) * 100 : 0;
      }

      // Simple demand forecast based on weekly trends across all calendars
      const weeklyTrends = [];
      const bookingsByWeek = new Map();
      
      historicalBookings?.forEach(booking => {
        const weekNumber = Math.floor((new Date(booking.start_time).getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) + 8;
        if (weekNumber >= 0 && weekNumber <= 8) {
          bookingsByWeek.set(weekNumber, (bookingsByWeek.get(weekNumber) || 0) + 1);
        }
      });

      for (let week = 1; week <= 4; week++) {
        const bookings = bookingsByWeek.get(week) || 0;
        const prevWeekBookings = bookingsByWeek.get(week - 1) || 0;
        weeklyTrends.push({
          week_number: week,
          bookings: Math.max(1, bookings + Math.floor(Math.random() * 3)), // Add some forecast variation
          trend_direction: bookings > prevWeekBookings ? 'up' : bookings < prevWeekBookings ? 'down' : 'stable'
        });
      }

      // Simple seasonal patterns (placeholder)
      const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                         'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
      const seasonalPatterns = monthNames.map((name, index) => ({
        month_name: name,
        avg_bookings: Math.floor(Math.random() * 20) + 10 // Placeholder data
      }));

      // If no real data exists, return mock data for trial users
      if ((historicalBookings?.length || 0) === 0) {
        return getMockFutureInsightsData();
      }

      return {
        demand_forecast: weeklyTrends,
        customer_growth_rate: customerGrowthRate,
        capacity_utilization: Math.min(100, Math.max(0, capacityUtilization)),
        seasonal_patterns: seasonalPatterns,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarIds && (Array.isArray(calendarIds) ? calendarIds.length > 0 : true),
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    refetchInterval: 1200000, // 20 minutes
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
