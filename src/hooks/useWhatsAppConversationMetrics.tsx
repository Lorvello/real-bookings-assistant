
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ConversationMetrics {
  totalConversations: number;
  activeConversations: number;
  avgResponses: number;
  totalMessages: number;
  responseRate: number;
}

export function useWhatsAppConversationMetrics(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-conversation-metrics', calendarId],
    queryFn: async (): Promise<ConversationMetrics> => {
      if (!calendarId) {
        return {
          totalConversations: 0,
          activeConversations: 0,
          avgResponses: 0,
          totalMessages: 0,
          responseRate: 0,
        };
      }

      // Get conversation counts
      const { data: conversations, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('id, status')
        .eq('calendar_id', calendarId);

      if (convError) throw convError;

      const totalConversations = conversations?.length || 0;
      const activeConversations = conversations?.filter(c => c.status === 'active').length || 0;

      // Get message counts
      const { data: messages, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('id, direction, conversation_id')
        .in('conversation_id', conversations?.map(c => c.id) || []);

      if (msgError) throw msgError;

      const totalMessages = messages?.length || 0;
      const outboundMessages = messages?.filter(m => m.direction === 'outbound').length || 0;
      const inboundMessages = messages?.filter(m => m.direction === 'inbound').length || 0;

      const avgResponses = totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;
      const responseRate = inboundMessages > 0 ? Math.round((outboundMessages / inboundMessages) * 100) : 0;

      return {
        totalConversations,
        activeConversations,
        avgResponses,
        totalMessages,
        responseRate,
      };
    },
    enabled: !!calendarId,
  });
}
