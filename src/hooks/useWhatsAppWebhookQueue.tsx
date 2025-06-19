
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppWebhookQueue, WhatsAppIncomingMessage } from '@/types/whatsapp';

export function useWhatsAppWebhookQueue() {
  return useQuery({
    queryKey: ['whatsapp-webhook-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_webhook_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data as unknown) as WhatsAppWebhookQueue[];
    },
  });
}

export function useUnprocessedWebhooks() {
  return useQuery({
    queryKey: ['whatsapp-webhook-queue', 'unprocessed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_webhook_queue')
        .select('*')
        .eq('processed', false)
        .lt('retry_count', 3)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as unknown) as WhatsAppWebhookQueue[];
    },
  });
}

export function useAddWebhookToQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (webhook: {
      webhook_type: 'message' | 'status' | 'contact_update';
      payload: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('whatsapp_webhook_queue')
        .insert([webhook])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-webhook-queue'] });
    },
  });
}

export function useProcessWebhookQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_whatsapp_webhook_queue');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-webhook-queue'] });
    },
  });
}

export function useProcessWhatsAppMessage() {
  return useMutation({
    mutationFn: async ({
      phoneNumber,
      messageId,
      messageContent,
      calendarId
    }: {
      phoneNumber: string;
      messageId: string;
      messageContent: string;
      calendarId: string;
    }) => {
      const { data, error } = await supabase.rpc('process_whatsapp_message', {
        p_phone_number: phoneNumber,
        p_message_id: messageId,
        p_message_content: messageContent,
        p_calendar_id: calendarId,
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useMarkWebhookProcessed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      webhookId, 
      success, 
      error 
    }: { 
      webhookId: string; 
      success: boolean; 
      error?: string;
    }) => {
      if (success) {
        const { data, error: updateError } = await supabase
          .from('whatsapp_webhook_queue')
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString(), 
            error: null 
          })
          .eq('id', webhookId)
          .select()
          .single();

        if (updateError) throw updateError;
        return data;
      } else {
        // Get current retry count first, then increment it
        const { data: currentData, error: fetchError } = await supabase
          .from('whatsapp_webhook_queue')
          .select('retry_count')
          .eq('id', webhookId)
          .single();

        if (fetchError) throw fetchError;

        const { data, error: updateError } = await supabase
          .from('whatsapp_webhook_queue')
          .update({ 
            retry_count: (currentData.retry_count || 0) + 1, 
            error 
          })
          .eq('id', webhookId)
          .select()
          .single();

        if (updateError) throw updateError;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-webhook-queue'] });
    },
  });
}
