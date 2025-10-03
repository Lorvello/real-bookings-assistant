import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface Booking {
  id: string;
  calendar_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_time: string;
  end_time: string;
  status: string;
  service_name: string;
  total_price?: number;
  notes?: string;
  created_at: string;
}

interface UseConsolidatedBookingsProps {
  calendarId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

/**
 * Consolidated booking hook that replaces multiple separate booking queries
 * Reduces redundant API calls and provides memoized derived data
 */
export function useConsolidatedBookings({
  calendarId,
  startDate,
  endDate,
  status
}: UseConsolidatedBookingsProps = {}) {
  
  const { data: bookings, ...queryState } = useQuery({
    queryKey: ['consolidated-bookings', calendarId, startDate, endDate, status],
    queryFn: async (): Promise<Booking[]> => {
      if (!calendarId) return [];

      let query = supabase
        .from('bookings')
        .select(`
          id,
          calendar_id,
          customer_name,
          customer_email,
          customer_phone,
          start_time,
          end_time,
          status,
          service_name,
          total_price,
          notes,
          created_at
        `)
        .eq('calendar_id', calendarId)
        .order('start_time', { ascending: true });

      if (startDate) {
        query = query.gte('start_time', startDate);
      }
      
      if (endDate) {
        query = query.lte('start_time', endDate);
      }
      
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!calendarId,
    staleTime: 120000, // 2 minutes - balanced for booking changes
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Memoized derived data to prevent recalculation
  const derivedData = useMemo(() => {
    if (!bookings) return null;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    return {
      all: bookings,
      today: bookings.filter(b => b.start_time.startsWith(today)),
      upcoming: bookings.filter(b => new Date(b.start_time) > now),
      past: bookings.filter(b => new Date(b.end_time) < now),
      confirmed: bookings.filter(b => b.status === 'confirmed'),
      pending: bookings.filter(b => b.status === 'pending'),
      cancelled: bookings.filter(b => b.status === 'cancelled'),
      byStatus: bookings.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [bookings]);

  return {
    bookings: bookings || [],
    ...derivedData,
    ...queryState
  };
}
