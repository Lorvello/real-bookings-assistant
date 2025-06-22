
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BookingData {
  calendar_id: string;
  service_type_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_time: string;
  end_time: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes?: string;
  internal_notes?: string;
  total_price?: number;
}

export function useOptimisticBookings(calendarId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: BookingData) => {
      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select(`
          *,
          service_types (
            name,
            color,
            duration
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newBooking) => {
      console.log('🚀 Optimistic booking creation:', newBooking);
      
      // Cancel outgoing refetches voor alle relevante queries
      await queryClient.cancelQueries({ queryKey: ['bookings'] });
      await queryClient.cancelQueries({ queryKey: ['dashboard-analytics'] });

      // Snapshot the previous values
      const previousBookings = queryClient.getQueryData(['bookings', calendarId]);
      const previousMultipleBookings = queryClient.getQueryData(['multiple-calendar-bookings']);

      // Optimistically update single calendar bookings
      queryClient.setQueryData(['bookings', calendarId], (old: any) => {
        const optimisticBooking = {
          id: 'temp-' + Date.now(),
          ...newBooking,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return old ? [...old, optimisticBooking] : [optimisticBooking];
      });

      // Optimistically update multiple calendar bookings (voor kalender views die meerdere kalenders tonen)
      queryClient.setQueryData(['multiple-calendar-bookings'], (old: any) => {
        if (!old) return old;
        const optimisticBooking = {
          id: 'temp-' + Date.now(),
          ...newBooking,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [...old, optimisticBooking];
      });

      return { previousBookings, previousMultipleBookings };
    },
    onError: (error, newBooking, context) => {
      console.error('❌ Booking creation failed, rolling back:', error);
      
      // Rollback optimistic updates
      if (context?.previousBookings) {
        queryClient.setQueryData(['bookings', calendarId], context.previousBookings);
      }
      if (context?.previousMultipleBookings) {
        queryClient.setQueryData(['multiple-calendar-bookings'], context.previousMultipleBookings);
      }
      
      toast({
        title: "Fout bij aanmaken afspraak",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      console.log('✅ Booking created successfully:', data);
      
      toast({
        title: "Afspraak aangemaakt",
        description: "De afspraak is succesvol aangemaakt en is nu zichtbaar in de kalender",
      });
    },
    onSettled: () => {
      // Invalidate en refresh alle relevante queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['multiple-calendar-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
    },
  });

  return {
    createBooking: createBookingMutation.mutate,
    isCreating: createBookingMutation.isPending,
  };
}
