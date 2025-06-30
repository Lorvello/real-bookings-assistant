
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWhatsAppRealtimeUpdates(calendarId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!calendarId) return;

    console.log('🔄 Setting up WhatsApp real-time updates for calendar:', calendarId);

    // Luister naar nieuwe webhooks in de queue
    const webhookQueueChannel = supabase
      .channel(`whatsapp-webhook-queue-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_webhook_queue'
        },
        (payload) => {
          console.log('📨 Webhook queue update:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-webhook-queue'] });
        }
      )
      .subscribe();

    // Luister naar nieuwe berichten
    const messagesChannel = supabase
      .channel(`whatsapp-messages-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('💬 New WhatsApp message:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-analytics'] });
        }
      )
      .subscribe();

    // Luister naar nieuwe conversaties
    const conversationsChannel = supabase
      .channel(`whatsapp-conversations-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations'
        },
        (payload) => {
          console.log('🗣️ Conversation update:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-analytics'] });
        }
      )
      .subscribe();

    // Luister naar booking intents
    const intentsChannel = supabase
      .channel(`booking-intents-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_intents'
        },
        (payload) => {
          console.log('🎯 Booking intent update:', payload);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-analytics'] });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up WhatsApp real-time subscriptions');
      supabase.removeChannel(webhookQueueChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(intentsChannel);
    };
  }, [queryClient, calendarId]);
}
