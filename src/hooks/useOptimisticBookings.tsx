
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
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newBooking) => {
      console.log('🚀 Optimistic booking creation:', newBooking);
      
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['bookings', calendarId] });
      await queryClient.cancelQueries({ queryKey: ['dashboard-analytics', calendarId] });

      // Snapshot the previous values
      const previousBookings = queryClient.getQueryData(['bookings', calendarId]);
      const previousDashboard = queryClient.getQueryData(['dashboard-analytics', calendarId]);

      // Optimistically update bookings list
      queryClient.setQueryData(['bookings', calendarId], (old: any) => {
        const optimisticBooking = {
          id: 'temp-' + Date.now(),
          ...newBooking,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return old ? [...old, optimisticBooking] : [optimisticBooking];
      });

      // Optimistically update dashboard metrics
      queryClient.setQueryData(['dashboard-analytics', calendarId], (old: any) => {
        if (!old) return old;
        
        const isToday = new Date(newBooking.start_time).toDateString() === new Date().toDateString();
        const isPending = newBooking.status === 'pending';
        
        return {
          ...old,
          today_bookings: isToday ? (old.today_bookings || 0) + 1 : old.today_bookings,
          pending_bookings: isPending ? (old.pending_bookings || 0) + 1 : old.pending_bookings,
          month_bookings: (old.month_bookings || 0) + 1,
        };
      });

      return { previousBookings, previousDashboard };
    },
    onError: (error, newBooking, context) => {
      console.error('❌ Booking creation failed, rolling back:', error);
      
      // Rollback optimistic updates
      if (context?.previousBookings) {
        queryClient.setQueryData(['bookings', calendarId], context.previousBookings);
      }
      if (context?.previousDashboard) {
        queryClient.setQueryData(['dashboard-analytics', calendarId], context.previousDashboard);
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
        description: "De afspraak is succesvol aangemaakt",
      });
      
      // The real-time subscription will handle the actual data refresh
    },
    onSettled: () => {
      // Ensure fresh data after mutation settles
      queryClient.invalidateQueries({ queryKey: ['bookings', calendarId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-analytics', calendarId] });
    },
  });

  return {
    createBooking: createBookingMutation.mutate,
    isCreating: createBookingMutation.isPending,
  };
}
