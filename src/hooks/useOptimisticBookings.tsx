
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface CreateBookingData {
  calendar_id: string;
  service_type_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  start_time: string;
  end_time: string;
  notes?: string;
  internal_notes?: string;
  total_price?: number;
}

export function useOptimisticBookings(calendarId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: CreateBookingData) => {
      console.log('🚀 Creating booking - automatically confirmed:', bookingData);
      
      // Status is automatically forced to 'confirmed' by database trigger
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Booking created and automatically confirmed:', data);
      return data;
    },
    onMutate: async (bookingData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bookings'] });
      await queryClient.cancelQueries({ queryKey: ['multiple-calendar-bookings'] });

      // Create optimistic booking - automatically confirmed
      const optimisticBooking = {
        id: 'temp-' + Date.now(),
        ...bookingData,
        status: 'confirmed' as const,
        confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        confirmation_token: null,
        cancelled_at: null,
        cancellation_reason: null,
        booking_duration: 30,
        service_name: null,
      };

      // Snapshot the previous value
      const previousBookings = queryClient.getQueryData(['bookings', calendarId]);
      const previousMultipleBookings = queryClient.getQueryData(['multiple-calendar-bookings']);

      // Optimistically update to the new value
      if (calendarId) {
        queryClient.setQueryData(['bookings', calendarId], (old: any) => 
          old ? [...old, optimisticBooking] : [optimisticBooking]
        );
      }

      queryClient.setQueryData(['multiple-calendar-bookings'], (old: any) => 
        old ? [...old, optimisticBooking] : [optimisticBooking]
      );

      console.log('📝 Applied optimistic update - automatically confirmed');

      return { previousBookings, previousMultipleBookings };
    },
    onError: (err, bookingData, context) => {
      console.error('❌ Booking creation failed:', err);
      
      // Rollback optimistic update
      if (context?.previousBookings && calendarId) {
        queryClient.setQueryData(['bookings', calendarId], context.previousBookings);
      }
      if (context?.previousMultipleBookings) {
        queryClient.setQueryData(['multiple-calendar-bookings'], context.previousMultipleBookings);
      }

      toast({
        title: "Fout bij aanmaken afspraak",
        description: err instanceof Error ? err.message : 'Onbekende fout opgetreden',
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      console.log('🎉 Booking successfully created and automatically confirmed:', data);
      
      toast({
        title: "Afspraak bevestigd!",
        description: `Afspraak voor ${data.customer_name} is direct bevestigd.`,
      });

      // Invalidate queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['multiple-calendar-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  return {
    createBooking: createBookingMutation.mutate,
    isCreating: createBookingMutation.isPending,
  };
}
