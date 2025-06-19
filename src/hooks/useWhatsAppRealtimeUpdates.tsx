
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWhatsAppRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Luister naar nieuwe webhooks in de queue
    const webhookQueueChannel = supabase
      .channel('whatsapp-webhook-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_webhook_queue'
        },
        (payload) => {
          console.log('Webhook queue update:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-webhook-queue'] });
        }
      )
      .subscribe();

    // Luister naar nieuwe berichten
    const messagesChannel = supabase
      .channel('whatsapp-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('New WhatsApp message:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    // Luister naar nieuwe conversaties
    const conversationsChannel = supabase
      .channel('whatsapp-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations'
        },
        (payload) => {
          console.log('Conversation update:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(webhookQueueChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [queryClient]);
}
