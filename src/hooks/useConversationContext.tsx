
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ConversationContext, ConversationMemory } from '@/types/whatsapp';

export function useConversationContext(conversationId: string) {
  return useQuery({
    queryKey: ['conversation-context', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_context')
        .select('*')
        .eq('conversation_id', conversationId)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ConversationContext[];
    },
    enabled: !!conversationId,
  });
}

export function useConversationMemory(phoneNumber: string, calendarId: string) {
  return useQuery({
    queryKey: ['conversation-memory', phoneNumber, calendarId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversation_context', {
        p_phone_number: phoneNumber,
        p_calendar_id: calendarId,
      });

      if (error) throw error;
      return data as ConversationMemory;
    },
    enabled: !!(phoneNumber && calendarId),
  });
}

export function useCreateConversationContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (context: Omit<ConversationContext, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('conversation_context')
        .insert([context])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-context', data.conversation_id] 
      });
    },
  });
}

export function useUpdateConversationContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string;
    } & Partial<ConversationContext>) => {
      const { data, error } = await supabase
        .from('conversation_context')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['conversation-context', data.conversation_id] 
      });
    },
  });
}

export function useDeleteConversationContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversation_context')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-context'] });
    },
  });
}
