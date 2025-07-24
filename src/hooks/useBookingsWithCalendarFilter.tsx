import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Booking } from '@/types/database';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export const useBookingsWithCalendarFilter = (calendarIds: string[]) => {
  const { user } = useAuth();
  const { handleError, retryWithBackoff } = useErrorHandler();

  // Fetch bookings from multiple calendars or single calendar
  const fetchBookings = async (): Promise<Booking[]> => {
    if (!calendarIds || calendarIds.length === 0) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .in('calendar_id', calendarIds)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    return (data || []).map(booking => ({
      ...booking,
      status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
    }));
  };

  const bookingsQuery = useQuery({
    queryKey: ['bookings', 'filtered', calendarIds.sort().join(',')],
    queryFn: () => retryWithBackoff(fetchBookings),
    enabled: !!user && calendarIds.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      const appError = handleError(error, 'Fetch filtered bookings');
      return appError.retryable && failureCount < 3;
    }
  });

  return {
    bookings: bookingsQuery.data || [],
    loading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    refetch: bookingsQuery.refetch
  };
};