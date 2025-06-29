
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Booking } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface BookingInsert {
  calendar_id: string;
  service_type_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  internal_notes?: string;
  total_price?: number;
}

export const useOptimizedBookings = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleError, retryWithBackoff } = useErrorHandler();
  const queryClient = useQueryClient();

  // Optimized booking fetch
  const fetchBookings = async (): Promise<Booking[]> => {
    if (!calendarId) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('calendar_id', calendarId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    // All bookings are now confirmed by default
    return (data || []).map(booking => ({
      ...booking,
      status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
    }));
  };

  const bookingsQuery = useQuery({
    queryKey: ['bookings', calendarId],
    queryFn: () => retryWithBackoff(fetchBookings),
    enabled: !!user && !!calendarId,
    staleTime: 2 * 60 * 1000, // 2 minuten
    gcTime: 5 * 60 * 1000, // 5 minuten cache
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      const appError = handleError(error, 'Fetch bookings');
      return appError.retryable && failureCount < 3;
    }
  });

  // Optimized booking creation - automatically confirmed by database
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: BookingInsert) => {
      if (!calendarId) throw new Error('Calendar ID required');
      
      // Database trigger will automatically set status to 'confirmed'
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          calendar_id: calendarId,
          service_type_id: bookingData.service_type_id,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          customer_phone: bookingData.customer_phone,
          start_time: bookingData.start_time,
          end_time: bookingData.end_time,
          notes: bookingData.notes,
          internal_notes: bookingData.internal_notes,
          total_price: bookingData.total_price
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newBooking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bookings', calendarId] });

      // Snapshot previous value
      const previousBookings = queryClient.getQueryData(['bookings', calendarId]);

      // Optimistically update with confirmed status (automatically set by DB)
      const optimisticBooking = {
        id: 'temp-' + Date.now(),
        ...newBooking,
        status: 'confirmed' as const,
        confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Booking;

      queryClient.setQueryData(['bookings', calendarId], (old: Booking[] = []) => 
        [...old, optimisticBooking]
      );

      return { previousBookings };
    },
    onError: (error, newBooking, context) => {
      // Rollback optimistic update
      if (context?.previousBookings) {
        queryClient.setQueryData(['bookings', calendarId], context.previousBookings);
      }
      
      const appError = handleError(error, 'Create booking');
      
      // Show more specific error messages
      if (appError.type === 'validation') {
        toast({
          title: "Validatie fout",
          description: appError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Fout bij aanmaken booking",
          description: appError.retryable ? "Probeer het opnieuw" : "Neem contact op met ondersteuning",
          variant: "destructive",
        });
      }
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['bookings', calendarId] });
      queryClient.invalidateQueries({ queryKey: ['optimized-analytics', calendarId] });
      
      toast({
        title: "Booking bevestigd",
        description: "Booking is automatisch bevestigd",
      });
    }
  });

  // Batch booking operations
  const batchUpdateBookings = async (updates: { id: string; updates: Partial<Booking> }[]) => {
    try {
      const promises = updates.map(({ id, updates: bookingUpdates }) =>
        supabase
          .from('bookings')
          .update(bookingUpdates)
          .eq('id', id)
      );

      await Promise.all(promises);
      
      // Invalidate cache after batch update
      queryClient.invalidateQueries({ queryKey: ['bookings', calendarId] });
      
      toast({
        title: "Bookings bijgewerkt",
        description: `${updates.length} bookings zijn bijgewerkt`,
      });
    } catch (error) {
      handleError(error, 'Batch update bookings');
    }
  };

  return {
    bookings: bookingsQuery.data || [],
    loading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    createBooking: createBookingMutation.mutate,
    isCreating: createBookingMutation.isPending,
    batchUpdateBookings,
    refetch: bookingsQuery.refetch
  };
};
