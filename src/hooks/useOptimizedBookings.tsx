
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Booking } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export const useOptimizedBookings = (calendarId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimized booking fetch met indexen
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

    return (data || []).map(booking => ({
      ...booking,
      status: booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'
    }));
  };

  const bookingsQuery = useQuery({
    queryKey: ['bookings', calendarId],
    queryFn: fetchBookings,
    enabled: !!user && !!calendarId,
    staleTime: 2 * 60 * 1000, // 2 minuten
    cacheTime: 5 * 60 * 1000, // 5 minuten cache
    refetchOnWindowFocus: true,
    retry: 2
  });

  // Optimized booking creation met optimistic updates
  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: Partial<Booking>) => {
      if (!calendarId) throw new Error('Calendar ID required');
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          calendar_id: calendarId,
          ...bookingData
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

      // Optimistically update
      const optimisticBooking = {
        id: 'temp-' + Date.now(),
        ...newBooking,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Booking;

      queryClient.setQueryData(['bookings', calendarId], (old: Booking[] = []) => 
        [...old, optimisticBooking]
      );

      return { previousBookings };
    },
    onError: (err, newBooking, context) => {
      // Rollback optimistic update
      if (context?.previousBookings) {
        queryClient.setQueryData(['bookings', calendarId], context.previousBookings);
      }
      
      toast({
        title: "Fout bij aanmaken booking",
        description: "Kon booking niet aanmaken",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['bookings', calendarId] });
      queryClient.invalidateQueries({ queryKey: ['optimized-analytics', calendarId] });
      
      toast({
        title: "Booking aangemaakt",
        description: "Booking is succesvol aangemaakt",
      });
    }
  });

  // Batch booking operations voor performance
  const batchUpdateBookings = async (updates: { id: string; updates: Partial<Booking> }[]) => {
    try {
      const promises = updates.map(({ id, updates: bookingUpdates }) =>
        supabase
          .from('bookings')
          .update(bookingUpdates)
          .eq('id', id)
      );

      await Promise.all(promises);
      
      // Invalidate cache na batch update
      queryClient.invalidateQueries({ queryKey: ['bookings', calendarId] });
      
      toast({
        title: "Bookings bijgewerkt",
        description: `${updates.length} bookings zijn bijgewerkt`,
      });
    } catch (error) {
      console.error('Error batch updating bookings:', error);
      toast({
        title: "Fout bij bijwerken",
        description: "Kon niet alle bookings bijwerken",
        variant: "destructive",
      });
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
