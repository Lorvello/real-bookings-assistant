
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppConversation } from '@/types/whatsapp';
import { useWhatsAppConversationUpdates } from './useWhatsAppConversationUpdates';

export function useWhatsAppConversations(calendarId: string) {
  // Set up real-time updates
  useWhatsAppConversationUpdates(calendarId);

  return useQuery({
    queryKey: ['whatsapp-conversations', calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          whatsapp_contacts (
            id,
            phone_number,
            display_name,
            first_name,
            last_name,
            profile_picture_url,
            created_at
          )
        `)
        .eq('calendar_id', calendarId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
  });
}

export function useCreateWhatsAppConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversation: Partial<WhatsAppConversation>) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .insert([conversation])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-conversations', data.calendar_id] 
      });
    },
  });
}

export function useUpdateConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      status 
    }: { 
      conversationId: string; 
      status: WhatsAppConversation['status'];
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .update({ status })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['whatsapp-conversations', data.calendar_id] 
      });
    },
  });
}
