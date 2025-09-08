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
  const defaultMetrics: CustomerMetrics = {
    unique_customers: 0,
    returning_customers: 0,
    total_customers: 0,
    new_customers_this_month: 0,
    customer_growth_rate: 0
  };
  
  return useQuery({
    queryKey: ['customer-metrics', calendarIds],
    queryFn: async (): Promise<CustomerMetrics | null> => {
      if (!calendarIds || calendarIds.length === 0) return defaultMetrics;

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

      // Get all bookings from the selected calendars - simple approach
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('customer_email, customer_phone, created_at, status')
        .in('calendar_id', calendarIds)
        .neq('status', 'cancelled');

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }

      if (!bookings || bookings.length === 0) {
        return defaultMetrics;
      }

      // Simple customer deduplication: email priority, then phone
      const customerMap = new Map();
      
      bookings.forEach(booking => {
        // Use email as primary identifier
        if (booking.customer_email) {
          const email = booking.customer_email.toLowerCase();
          if (!customerMap.has(email)) {
            customerMap.set(email, {
              firstBooking: new Date(booking.created_at),
              bookingCount: 0
            });
          }
          customerMap.get(email).bookingCount++;
        } else if (booking.customer_phone) {
          // Only use phone if no email
          const phone = booking.customer_phone;
          if (!customerMap.has(phone)) {
            customerMap.set(phone, {
              firstBooking: new Date(booking.created_at),
              bookingCount: 0
            });
          }
          customerMap.get(phone).bookingCount++;
        }
      });

      const customers = Array.from(customerMap.values());
      const totalCustomers = customers.length;
      
      // Unique customers: have only 1 booking
      const uniqueCustomers = customers.filter(c => c.bookingCount === 1).length;
      
      // Returning customers: have 2+ bookings  
      const returningCustomers = customers.filter(c => c.bookingCount >= 2).length;
      
      // New customers this month
      const newCustomersThisMonth = customers
        .filter(c => c.firstBooking >= monthStart).length;
      
      const customerGrowthRate = totalCustomers > 0 
        ? Math.round((newCustomersThisMonth / totalCustomers) * 100 * 10) / 10
        : 0;

      return {
        unique_customers: uniqueCustomers,
        returning_customers: returningCustomers,
        total_customers: totalCustomers,
        new_customers_this_month: newCustomersThisMonth,
        customer_growth_rate: customerGrowthRate
      };
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
  });
}