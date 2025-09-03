import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMockDataControl } from '@/hooks/useMockDataControl';

export interface CustomerMetrics {
  unique_customers: number;
  returning_customers: number;
  total_customers: number;
  new_customers_this_month: number;
  customer_growth_rate: number;
}

export function useCustomerMetrics(calendarIds: string[]) {
  const { useMockData } = useMockDataControl();
  
  return useQuery({
    queryKey: ['customer-metrics', calendarIds],
    queryFn: async (): Promise<CustomerMetrics | null> => {
      if (!calendarIds || calendarIds.length === 0) return null;

      console.log('📊 Fetching customer metrics for calendars:', calendarIds);

      // Mock data for developers or setup_incomplete users
      if (useMockData) {
        return {
          unique_customers: 45,
          returning_customers: 28,
          total_customers: 73,
          new_customers_this_month: 12,
          customer_growth_rate: 18.5
        };
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Get combined customer data from bookings and WhatsApp contacts
      const { data: customerData, error } = await supabase.rpc('get_customer_metrics', {
        p_calendar_ids: calendarIds,
        p_month_start: monthStart.toISOString(),
        p_thirty_days_ago: thirtyDaysAgo.toISOString()
      });

      if (error) {
        console.error('Error fetching customer metrics:', error);
        
        // Fallback: calculate basic metrics from bookings only
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('customer_email, created_at')
          .in('calendar_id', calendarIds)
          .neq('status', 'cancelled')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (bookingsError) throw bookingsError;

        if (!bookings) return null;

        const uniqueEmails = new Set(bookings.map(b => b.customer_email).filter(Boolean));
        const newThisMonth = bookings.filter(b => new Date(b.created_at) >= monthStart).length;
        
        return {
          unique_customers: newThisMonth,
          returning_customers: Math.max(0, uniqueEmails.size - newThisMonth),
          total_customers: uniqueEmails.size,
          new_customers_this_month: newThisMonth,
          customer_growth_rate: uniqueEmails.size > 0 ? (newThisMonth / uniqueEmails.size) * 100 : 0
        };
      }

      return customerData || null;
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
  });
}