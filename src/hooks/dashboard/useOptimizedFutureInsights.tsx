
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
  customer_growth_is_new?: boolean; // true = no prior-month baseline (show "New", not a fake %)
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

      // The 12-month seasonal-patterns chart needs a full year of history, not the
      // 60-day trend window — otherwise 10 of 12 months are always 0 (a window
      // artifact, not real data). Separate query so the trend/forecast calcs above
      // keep their 60-day window.
      const { data: seasonalBookings } = await supabase
        .from('bookings')
        .select('start_time')
        .in('calendar_id', calendarIds)
        .gte('start_time', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()) // 12 months
        .neq('status', 'cancelled');

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

      // Get WhatsApp contacts for current and previous month — TENANT-SCOPED.
      // Previously these filtered by created_at ONLY, with no owner/calendar scope, so
      // the customer-growth metric mixed in OTHER businesses' contacts. (RLS already
      // limits the in-app result to this owner, but a metric must be scoped explicitly
      // for a correct count and not lean on RLS for its arithmetic.) Scope to the
      // contacts reachable from the selected calendars, mirroring how bookings are
      // scoped by calendar_id above.
      const { data: ownerConvos } = await supabase
        .from('whatsapp_conversations')
        .select('contact_id')
        .in('calendar_id', calendarIds);
      const ownerContactIds = Array.from(
        new Set((ownerConvos || []).map(c => c.contact_id).filter(Boolean))
      );

      let currentMonthContacts: any[] = [];
      let previousMonthContacts: any[] = [];
      if (ownerContactIds.length > 0) {
        const { data: cmc } = await supabase
          .from('whatsapp_contacts')
          .select('phone_number, linked_customer_email')
          .in('id', ownerContactIds)
          .gte('created_at', startOfCurrentMonth.toISOString());
        currentMonthContacts = cmc || [];

        const { data: pmc } = await supabase
          .from('whatsapp_contacts')
          .select('phone_number, linked_customer_email')
          .in('id', ownerContactIds)
          .gte('created_at', startOfPreviousMonth.toISOString())
          .lt('created_at', startOfCurrentMonth.toISOString());
        previousMonthContacts = pmc || [];
      }

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
      
      // No prior-month baseline: do NOT fabricate "+100%" (every first month would show it).
      // Flag as new so the UI shows "New" instead of an invented growth rate.
      const hasCustomerBaseline = previousCustomers.size > 0;
      const customerGrowthRate = hasCustomerBaseline
        ? ((currentCustomers.size - previousCustomers.size) / previousCustomers.size) * 100
        : 0;
      const customerGrowthIsNew = !hasCustomerBaseline && currentCustomers.size > 0;

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
      
      // FORWARD-looking "upcoming bookings": bucket the next 4 weeks (week index 0 =
      // the next 7 days). The old code offset every booking by +8 and then read weeks
      // 1..4, which plotted bookings from 4–7 weeks in the PAST and silently dropped
      // genuinely upcoming ones (a booking now → index 8, excluded from the 1..4 read;
      // +1 week → 9, dropped entirely). Now index by whole weeks AHEAD of now and keep
      // only the next four (0..3), surfaced as week_number 1..4.
      const nowMs = new Date().getTime();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      historicalBookings?.forEach(booking => {
        const weeksAhead = Math.floor((new Date(booking.start_time).getTime() - nowMs) / weekMs);
        if (weeksAhead >= 0 && weeksAhead < 4) {
          bookingsByWeek.set(weeksAhead, (bookingsByWeek.get(weeksAhead) || 0) + 1);
        }
      });

      for (let week = 0; week < 4; week++) {
        const bookings = bookingsByWeek.get(week) || 0;
        const prevWeekBookings = week > 0 ? (bookingsByWeek.get(week - 1) || 0) : 0;
        weeklyTrends.push({
          week_number: week + 1,
          bookings, // real upcoming bookings that week (no synthetic noise/inflation)
          trend_direction: bookings > prevWeekBookings ? 'up' : bookings < prevWeekBookings ? 'down' : 'stable'
        });
      }

      // Real seasonal patterns from a full year of history (seasonalBookings),
      // so each month reflects actual bookings rather than the 60-day window.
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];

      const seasonalPatterns = [];
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const monthBookings = seasonalBookings?.filter(booking => {
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
        customer_growth_is_new: customerGrowthIsNew,
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
