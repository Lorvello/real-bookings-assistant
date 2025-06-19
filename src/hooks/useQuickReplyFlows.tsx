
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QuickReplyFlow, FlowMatchResult } from '@/types/whatsapp';

export function useQuickReplyFlows(calendarId: string) {
  return useQuery({
    queryKey: ['quick-reply-flows', calendarId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_reply_flows')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('is_active', true)
        .order('flow_name');

      if (error) throw error;
      return data as QuickReplyFlow[];
    },
    enabled: !!calendarId,
  });
}

export function useQuickReplyFlow(flowId: string) {
  return useQuery({
    queryKey: ['quick-reply-flow', flowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quick_reply_flows')
        .select('*')
        .eq('id', flowId)
        .single();

      if (error) throw error;
      return data as QuickReplyFlow;
    },
    enabled: !!flowId,
  });
}

export function useCreateQuickReplyFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flow: Omit<QuickReplyFlow, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('quick_reply_flows')
        .insert([flow])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['quick-reply-flows', data.calendar_id] 
      });
    },
  });
}

export function useUpdateQuickReplyFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string;
    } & Partial<QuickReplyFlow>) => {
      const { data, error } = await supabase
        .from('quick_reply_flows')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['quick-reply-flows', data.calendar_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['quick-reply-flow', data.id] 
      });
    },
  });
}

export function useDeleteQuickReplyFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_reply_flows')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-reply-flows'] });
    },
  });
}

export function useMatchQuickReplyFlow() {
  return useMutation({
    mutationFn: async ({
      calendarId,
      messageText
    }: {
      calendarId: string;
      messageText: string;
    }) => {
      const { data, error } = await supabase.rpc('match_quick_reply_flow', {
        p_calendar_id: calendarId,
        p_message_text: messageText,
      });

      if (error) throw error;
      return data as FlowMatchResult;
    },
  });
}
