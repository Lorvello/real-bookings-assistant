
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface OrphanedConversation {
  conversation_id: string;
  contact_phone: string;
  contact_name: string;
  message_count: number;
  last_activity: string;
}

export function useOrphanedConversations() {
  return useQuery({
    queryKey: ['orphaned-whatsapp-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_orphaned_whatsapp_conversations');
      
      if (error) throw error;
      
      return data as OrphanedConversation[] || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLinkExistingConversations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('link_existing_whatsapp_conversations');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orphaned-whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-overview'] });
    },
  });
}
