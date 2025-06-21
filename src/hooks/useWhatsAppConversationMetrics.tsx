
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppMetrics {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  avgResponseTime: number;
  // Add comparison data
  prevWeekConversations?: number;
}

export function useWhatsAppConversationMetrics(calendarId?: string) {
  return useQuery({
    queryKey: ['whatsapp-conversation-metrics', calendarId],
    queryFn: async (): Promise<WhatsAppMetrics | null> => {
      if (!calendarId) return null;

      const [conversationsData, messagesData, prevWeekData] = await Promise.all([
        // Current conversations
        supabase
          .from('whatsapp_conversations')
          .select('id, status', { count: 'exact' })
          .eq('calendar_id', calendarId),
        
        // Total messages
        supabase
          .from('whatsapp_messages')
          .select('id, whatsapp_conversations!inner(calendar_id)', { count: 'exact' })
          .eq('whatsapp_conversations.calendar_id', calendarId),
        
        // Previous week conversations for comparison
        supabase
          .from('whatsapp_conversations')
          .select('id', { count: 'exact' })
          .eq('calendar_id', calendarId)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const totalConversations = conversationsData.count || 0;
      const activeConversations = conversationsData.data?.filter(c => c.status === 'active').length || 0;
      const totalMessages = messagesData.count || 0;
      const prevWeekConversations = prevWeekData.count || 0;

      return {
        totalConversations,
        activeConversations,
        totalMessages,
        avgResponseTime: 2, // Simplified
        prevWeekConversations,
      };
    },
    enabled: !!calendarId,
    staleTime: 60000, // 1 minute
  });
}
