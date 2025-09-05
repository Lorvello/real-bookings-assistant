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

      // Get combined customer data from bookings and WhatsApp contacts
      try {
        // Get email-based customers from bookings
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('customer_email, customer_phone, created_at')
          .in('calendar_id', calendarIds)
          .neq('status', 'cancelled')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (bookingsError) throw bookingsError;

        // Get WhatsApp contacts that are linked to these calendars
        const { data: whatsappContacts, error: contactsError } = await supabase
          .from('whatsapp_contacts')
          .select('phone_number, linked_customer_email, created_at, whatsapp_conversations!inner(calendar_id)')
          .in('whatsapp_conversations.calendar_id', calendarIds);

        if (contactsError) {
          console.error('Error fetching WhatsApp contacts:', contactsError);
        }

        // Combine and deduplicate customers
        const allCustomers = new Map<string, { firstContact: Date; source: string; bookingCount: number }>();

        // Process email-based customers from bookings
        if (bookings) {
          bookings.forEach(booking => {
            if (booking.customer_email) {
              const existing = allCustomers.get(booking.customer_email);
              const contactDate = new Date(booking.created_at);
              
              if (!existing || contactDate < existing.firstContact) {
                allCustomers.set(booking.customer_email, {
                  firstContact: contactDate,
                  source: 'email',
                  bookingCount: (existing?.bookingCount || 0) + 1
                });
              } else {
                existing.bookingCount++;
              }
            }
          });
        }

        // Process WhatsApp-based customers
        if (whatsappContacts) {
          whatsappContacts.forEach(contact => {
            const contactDate = new Date(contact.created_at);
            const identifier = contact.phone_number;
            
            // Check if this WhatsApp contact has made bookings
            const bookingCount = bookings?.filter(b => 
              b.customer_phone === contact.phone_number || 
              b.customer_email === contact.linked_customer_email
            ).length || 0;

            const existing = allCustomers.get(identifier);
            if (!existing || contactDate < existing.firstContact) {
              allCustomers.set(identifier, {
                firstContact: contactDate,
                source: 'whatsapp',
                bookingCount: Math.max(bookingCount, 1) // At least 1 for being a contact
              });
            }
          });
        }

        // Calculate metrics
        const totalCustomers = allCustomers.size;
        const newCustomersThisMonth = Array.from(allCustomers.values())
          .filter(customer => customer.firstContact >= monthStart).length;
        
        const returningCustomers = Array.from(allCustomers.values())
          .filter(customer => customer.bookingCount > 1).length;
        
        const uniqueCustomers = totalCustomers - returningCustomers;
        
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

      } catch (error) {
        console.error('Error calculating customer metrics:', error);
        
        // Fallback: basic metrics from bookings only
        const { data: bookings } = await supabase
          .from('bookings')
          .select('customer_email, created_at')
          .in('calendar_id', calendarIds)
          .neq('status', 'cancelled')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (!bookings) {
          return {
            unique_customers: 0,
            returning_customers: 0,
            total_customers: 0,
            new_customers_this_month: 0,
            customer_growth_rate: 0
          };
        }

        const uniqueEmails = new Set(bookings.map(b => b.customer_email).filter(Boolean));
        const newThisMonth = bookings.filter(b => new Date(b.created_at) >= monthStart).length;
        
        return {
          unique_customers: newThisMonth,
          returning_customers: Math.max(0, uniqueEmails.size - newThisMonth),
          total_customers: uniqueEmails.size,
          new_customers_this_month: newThisMonth,
          customer_growth_rate: uniqueEmails.size > 0 ? Math.round((newThisMonth / uniqueEmails.size) * 100 * 10) / 10 : 0
        };
      }
    },
    enabled: !!calendarIds && calendarIds.length > 0,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000, // 10 minutes
  });
}