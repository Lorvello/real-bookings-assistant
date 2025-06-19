
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookingIntent } from '@/types/whatsapp';

export function useBookingIntents(conversationId: string) {
  return useQuery({
    queryKey: ['booking-intents', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_intents')
        .select(`
          *,
          service_types (
            id,
            name,
            duration,
            price
          ),
          bookings (
            id,
            start_time,
            end_time,
            status,
            customer_name,
            customer_email
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
}

export function useActiveBookingIntent(conversationId: string) {
  return useQuery({
    queryKey: ['active-booking-intent', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_intents')
        .select(`
          *,
          service_types (
            id,
            name,
            duration,
            price
          )
        `)
        .eq('conversation_id', conversationId)
        .eq('status', 'collecting_info')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
}

export function useCreateBookingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (intent: Omit<BookingIntent, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('booking_intents')
        .insert([intent])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['booking-intents', data.conversation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['active-booking-intent', data.conversation_id] 
      });
    },
  });
}

export function useUpdateBookingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string;
    } & Partial<BookingIntent>) => {
      const { data, error } = await supabase
        .from('booking_intents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['booking-intents', data.conversation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['active-booking-intent', data.conversation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-memory'] 
      });
    },
  });
}

export function useCompleteBookingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      intentId, 
      bookingId 
    }: { 
      intentId: string; 
      bookingId: string;
    }) => {
      const { data, error } = await supabase
        .from('booking_intents')
        .update({ 
          status: 'booked',
          booking_id: bookingId
        })
        .eq('id', intentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['booking-intents', data.conversation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['active-booking-intent', data.conversation_id] 
      });
    },
  });
}

export function useAbandonBookingIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (intentId: string) => {
      const { data, error } = await supabase
        .from('booking_intents')
        .update({ status: 'abandoned' })
        .eq('id', intentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['booking-intents', data.conversation_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['active-booking-intent', data.conversation_id] 
      });
    },
  });
}
