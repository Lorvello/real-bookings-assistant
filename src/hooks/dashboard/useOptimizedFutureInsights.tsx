
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';
import { getMockFutureInsightsData } from '@/hooks/useMockDataGenerator';

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

export function useOptimizedFutureInsights(calendarIds?: string[]) {
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['optimized-future-insights', calendarIds],
    queryFn: async (): Promise<FutureInsightsData | null> => {
      if (!calendarIds || calendarIds.length === 0) return null;

      console.log('🔮 Fetching future insights for calendars:', calendarIds);

      // Return mock data for developers or setup_incomplete users
      if (useMockData) {
        return {
          ...getMockFutureInsightsData(),
          last_updated: new Date().toISOString()
        };
      }

      // Get calendar settings to calculate capacity - aggregate across all selected calendars
      const { data: calendarSettings } = await supabase
        .from('calendar_settings')
        .select('*')
        .in('calendar_id', calendarIds);

      // Get availability rules to calculate total available hours - aggregate across all selected calendars
      const { data: availabilityData } = await supabase
        .from('availability_schedules')
        .select(`
          calendar_id,
          availability_rules(*)
        `)
        .in('calendar_id', calendarIds)
        .eq('is_default', true);

      // Get historical booking data for trend analysis across all selected calendars
      const { data: historicalBookings, error: historicalError } = await supabase
        .from('bookings')
        .select('start_time, status, customer_email, calendar_id')
        .in('calendar_id', calendarIds)
        .gte('start_time', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // 60 days
        .neq('status', 'cancelled');

      if (historicalError) {
        console.error('Error fetching historical bookings:', historicalError);
        throw historicalError;
      }

      // Calculate customer growth rate including WhatsApp contacts
      const currentMonth = new Date();
      const startOfCurrentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const startOfPreviousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);

      // Get bookings for current and previous month
      const { data: currentMonthBookings } = await supabase
        .from('bookings')
        .select('customer_email, customer_phone')
        .in('calendar_id', calendarIds)
        .neq('status', 'cancelled')
        .gte('start_time', startOfCurrentMonth.toISOString());

      const { data: previousMonthBookings } = await supabase
        .from('bookings')
        .select('customer_email, customer_phone')
        .in('calendar_id', calendarIds)
        .neq('status', 'cancelled')
        .gte('start_time', startOfPreviousMonth.toISOString())
        .lt('start_time', startOfCurrentMonth.toISOString());

      // Get WhatsApp contacts for current and previous month  
      const { data: currentMonthContacts } = await supabase
        .from('whatsapp_contacts')
        .select('phone_number, linked_customer_email')
        .gte('created_at', startOfCurrentMonth.toISOString());

      const { data: previousMonthContacts } = await supabase
        .from('whatsapp_contacts')
        .select('phone_number, linked_customer_email')
        .gte('created_at', startOfPreviousMonth.toISOString())
        .lt('created_at', startOfCurrentMonth.toISOString());

      // Count unique customers (email priority, then phone)
      const currentCustomers = new Set();
      currentMonthBookings?.forEach(b => {
        if (b.customer_email) currentCustomers.add(b.customer_email);
        else if (b.customer_phone) currentCustomers.add(b.customer_phone);
      });
      currentMonthContacts?.forEach(c => {
        if (c.linked_customer_email) currentCustomers.add(c.linked_customer_email);
        else currentCustomers.add(c.phone_number);
      });

      const previousCustomers = new Set();
      previousMonthBookings?.forEach(b => {
        if (b.customer_email) previousCustomers.add(b.customer_email);
        else if (b.customer_phone) previousCustomers.add(b.customer_phone);
      });
      previousMonthContacts?.forEach(c => {
        if (c.linked_customer_email) previousCustomers.add(c.linked_customer_email);
        else previousCustomers.add(c.phone_number);
      });
      
      const customerGrowthRate = previousCustomers.size > 0 
        ? ((currentCustomers.size - previousCustomers.size) / previousCustomers.size) * 100
        : currentCustomers.size > 0 ? 100 : 0;

      // Calculate capacity utilization across ALL selected calendars
      let capacityUtilization = 0;
      if (availabilityData && availabilityData.length > 0) {
        // Calculate total available hours per week across ALL calendars
        let totalWeeklyHours = 0;
        
        availabilityData.forEach(schedule => {
          const rules = schedule.availability_rules || [];
          const calendarWeeklyHours = rules.reduce((total, rule) => {
            if (rule.is_available) {
              const start = new Date(`1970-01-01T${rule.start_time}`);
              const end = new Date(`1970-01-01T${rule.end_time}`);
              const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              return total + hours;
            }
            return total;
          }, 0);
          totalWeeklyHours += calendarWeeklyHours;
        });

        // Calculate booked hours this week across all calendars
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const { data: weekBookings } = await supabase
          .from('bookings')
          .select('start_time, end_time')
          .in('calendar_id', calendarIds)
          .neq('status', 'cancelled')
          .gte('start_time', weekStart.toISOString())
          .lt('start_time', weekEnd.toISOString());

        const bookedHours = weekBookings?.reduce((total, booking) => {
          const start = new Date(booking.start_time);
          const end = new Date(booking.end_time);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }, 0) || 0;

        capacityUtilization = totalWeeklyHours > 0 ? (bookedHours / totalWeeklyHours) * 100 : 0;
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

      // Real seasonal patterns based on historical booking data
      const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
                         'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
      
      const seasonalPatterns = [];
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const monthBookings = historicalBookings?.filter(booking => {
          const bookingDate = new Date(booking.start_time);
          return bookingDate.getMonth() === monthIndex;
        }) || [];
        
        seasonalPatterns.push({
          month_name: monthNames[monthIndex],
          avg_bookings: monthBookings.length
        });
      }

      return {
        demand_forecast: weeklyTrends,
        customer_growth_rate: customerGrowthRate,
        capacity_utilization: Math.min(100, Math.max(0, capacityUtilization)),
        seasonal_patterns: seasonalPatterns,
        last_updated: new Date().toISOString()
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    refetchInterval: 1200000, // 20 minutes
    refetchIntervalInBackground: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
  });
}
