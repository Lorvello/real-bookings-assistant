
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ConversationMetrics {
  total_contacts: number;
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  inbound_messages: number;
  outbound_messages: number;
  avg_response_time_minutes: number;
  bookings_via_whatsapp: number;
  total_booking_intents: number;
  completed_booking_intents: number;
  conversation_to_booking_rate: number;
  booking_intent_conversion_rate: number;
}

export function useWhatsAppConversationMetrics(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-conversation-metrics', calendarId],
    queryFn: async (): Promise<ConversationMetrics | null> => {
      if (!calendarId) return null;

      const { data, error } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();

      if (error) {
        // If no analytics data exists, return default values
        if (error.code === 'PGRST116') {
          return {
            total_contacts: 0,
            total_conversations: 0,
            active_conversations: 0,
            total_messages: 0,
            inbound_messages: 0,
            outbound_messages: 0,
            avg_response_time_minutes: 0,
            bookings_via_whatsapp: 0,
            total_booking_intents: 0,
            completed_booking_intents: 0,
            conversation_to_booking_rate: 0,
            booking_intent_conversion_rate: 0,
          };
        }
        throw error;
      }

      return {
        total_contacts: data.total_contacts || 0,
        total_conversations: data.total_conversations || 0,
        active_conversations: data.active_conversations || 0,
        total_messages: data.total_messages || 0,
        inbound_messages: data.inbound_messages || 0,
        outbound_messages: data.outbound_messages || 0,
        avg_response_time_minutes: data.avg_response_time_minutes || 0,
        bookings_via_whatsapp: data.bookings_via_whatsapp || 0,
        total_booking_intents: data.total_booking_intents || 0,
        completed_booking_intents: data.completed_booking_intents || 0,
        conversation_to_booking_rate: data.conversation_to_booking_rate || 0,
        booking_intent_conversion_rate: data.booking_intent_conversion_rate || 0,
      };
    },
    enabled: !!calendarId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
