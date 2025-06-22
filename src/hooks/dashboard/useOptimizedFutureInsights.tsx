
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FutureInsightsData {
  demand_forecast: Array<{
    week_number: number;
    bookings: number;
    trend_direction: string;
  }>;
  waitlist_size: number;
  returning_customers_month: number;
  seasonal_patterns: Array<{
    month_name: string;
    avg_bookings: number;
  }>;
  last_updated: string;
}

export function useOptimizedFutureInsights(calendarId?: string) {
  return useQuery({
    queryKey: ['optimized-future-insights', calendarId],
    queryFn: async (): Promise<FutureInsightsData | null> => {
      if (!calendarId) return null;

      console.log('🔮 Fetching future insights for:', calendarId);

      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Get bookings for trend analysis
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('calendar_id', calendarId)
        .neq('status', 'cancelled')
        .gte('start_time', oneYearAgo.toISOString());

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      // Get waitlist size
      const { data: waitlistData, error: waitlistError } = await supabase
        .from('waitlist')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('status', 'waiting');

      if (waitlistError) {
        console.error('Error fetching waitlist:', waitlistError);
      }

      const allBookings = bookingsData || [];

      // Calculate weekly demand forecast
      const weeklyBookings = new Map();
      const now = new Date();
      
      for (let i = 0; i < 8; i++) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekNumber = Math.floor((now.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        
        const weekBookings = allBookings.filter(b => {
          const bookingDate = new Date(b.start_time);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return bookingDate >= weekStart && bookingDate < weekEnd;
        });
        
        weeklyBookings.set(weekNumber, weekBookings.length);
      }

      const demandForecast = Array.from(weeklyBookings.entries())
        .map(([week, count], index, array) => {
          let trend = 'stable';
          if (index > 0) {
            const prevCount = array[index - 1][1];
            trend = count > prevCount ? 'up' : count < prevCount ? 'down' : 'stable';
          }
          
          return {
            week_number: week,
            bookings: count,
            trend_direction: trend
          };
        })
        .sort((a, b) => a.week_number - b.week_number);

      // Calculate seasonal patterns
      const monthlyStats = new Map();
      allBookings.forEach(booking => {
        const month = new Date(booking.start_time).getMonth();
        const monthName = new Date(2024, month).toLocaleString('nl-NL', { month: 'long' });
        
        if (!monthlyStats.has(monthName)) {
          monthlyStats.set(monthName, []);
        }
        monthlyStats.get(monthName).push(booking);
      });

      const seasonalPatterns = Array.from(monthlyStats.entries()).map(([monthName, bookings]) => ({
        month_name: monthName,
        avg_bookings: bookings.length / Math.max(1, Math.ceil(bookings.length / 30)) // Rough daily average
      }));

      // Calculate returning customers this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthBookings = allBookings.filter(b => new Date(b.start_time) >= thisMonth);
      const thisMonthEmails = new Set(thisMonthBookings.map(b => b.customer_email));
      
      const previousBookings = allBookings.filter(b => new Date(b.start_time) < thisMonth);
      const previousEmails = new Set(previousBookings.map(b => b.customer_email));
      
      const returningCustomers = Array.from(thisMonthEmails).filter(email => previousEmails.has(email)).length;

      return {
        demand_forecast: demandForecast,
        waitlist_size: waitlistData?.length || 0,
        returning_customers_month: returningCustomers,
        seasonal_patterns: seasonalPatterns,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarId,
    staleTime: 600000, // 10 minutes
    gcTime: 1800000, // 30 minutes
    refetchInterval: 1800000, // 30 minutes
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
