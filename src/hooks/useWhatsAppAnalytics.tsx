
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppAnalyticsData {
  calendar_id: string;
  calendar_name: string;
  total_contacts: number;
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  inbound_messages: number;
  outbound_messages: number;
  total_booking_intents: number;
  completed_booking_intents: number;
  bookings_via_whatsapp: number;
  booking_intent_conversion_rate: number;
  conversation_to_booking_rate: number;
  avg_response_time_minutes: number;
}

export interface MessageVolumeData {
  calendar_id: string;
  message_date: string;
  message_hour: number;
  message_count: number;
  inbound_count: number;
  outbound_count: number;
}

export interface ConversationTopicsData {
  calendar_id: string;
  topic_category: string;
  conversation_count: number;
}

export function useWhatsAppAnalytics(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-analytics', calendarId],
    queryFn: async () => {
      if (!calendarId) return null;
      
      const { data, error } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .eq('calendar_id', calendarId)
        .single();
      
      if (error) throw error;
      return data as WhatsAppAnalyticsData;
    },
    enabled: !!calendarId,
  });
}

export function useWhatsAppMessageVolume(calendarId?: string, days: number = 30) {
  return useQuery({
    queryKey: ['whatsapp-message-volume', calendarId, days],
    queryFn: async () => {
      if (!calendarId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_message_volume')
        .select('*')
        .eq('calendar_id', calendarId)
        .gte('message_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('message_date', { ascending: false })
        .order('message_hour', { ascending: true });
      
      if (error) throw error;
      return data as MessageVolumeData[];
    },
    enabled: !!calendarId,
  });
}

export function useWhatsAppConversationTopics(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-conversation-topics', calendarId],
    queryFn: async () => {
      if (!calendarId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_conversation_topics')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('conversation_count', { ascending: false });
      
      if (error) throw error;
      return data as ConversationTopicsData[];
    },
    enabled: !!calendarId,
  });
}

export function useWhatsAppAnalyticsSummary(calendarId?: string) {
  const analytics = useWhatsAppAnalytics(calendarId);
  const messageVolume = useWhatsAppMessageVolume(calendarId, 7); // Last 7 days
  const topics = useWhatsAppConversationTopics(calendarId);

  return {
    analytics: analytics.data,
    messageVolume: messageVolume.data,
    topics: topics.data,
    isLoading: analytics.isLoading || messageVolume.isLoading || topics.isLoading,
    error: analytics.error || messageVolume.error || topics.error,
  };
}
