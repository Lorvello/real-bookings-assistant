
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppMessage } from '@/types/whatsapp';

export function useWhatsAppMessages(conversationId: string) {
  return useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: Partial<WhatsAppMessage>) => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert([{
          ...message,
          direction: 'outbound',
          status: 'sent'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-messages', data.conversation_id] 
      });
      
      // Update last message timestamp in conversation
      supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', data.conversation_id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        });
    },
  });
}

export function useReceiveWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: Partial<WhatsAppMessage>) => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert([{
          ...message,
          direction: 'inbound',
          status: 'delivered'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-messages', data.conversation_id] 
      });
      
      // Update last message timestamp in conversation
      supabase
        .from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', data.conversation_id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        });
    },
  });
}
