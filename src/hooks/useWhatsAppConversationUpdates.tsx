
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useWhatsAppConversationUpdates(calendarId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  useEffect(() => {
    if (!calendarId) return;

    console.log('🔄 Setting up WhatsApp conversation real-time updates for calendar:', calendarId);

    // Listen to conversation updates
    const conversationsChannel = supabase
      .channel(`whatsapp-conversations-updates-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('📱 WhatsApp conversation updated:', payload);
          
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations-list', calendarId] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-overview'] });
          
          // Show toast for newly linked conversations
          if (payload.old.calendar_id === null && payload.new.calendar_id) {
          toast({
            title: t('whatsappConversationUpdates.linkedTitle', "Conversation Linked"),
            description: t('whatsappConversationUpdates.linkedDescription', "A WhatsApp conversation was automatically linked to an appointment"),
          });
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 WhatsApp conversations subscription status for ${calendarId}:`, status);
      });

    // Listen to webhook events for conversation linking
    const webhookChannel = supabase
      .channel(`webhook-events-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          if (payload.new.event_type === 'whatsapp.conversation.linked') {
            console.log('🔗 Conversation linked via webhook:', payload);
            
            // Refresh WhatsApp data
            queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
            queryClient.invalidateQueries({ queryKey: ['whatsapp-contact-overview'] });
            
            toast({
              title: t('whatsappConversationUpdates.autoLinkTitle', "Automatic Linking"),
              description: t('whatsappConversationUpdates.autoLinkDescription', "WhatsApp conversation linked to new appointment"),
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up WhatsApp conversation subscriptions');
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(webhookChannel);
    };
  }, [calendarId, queryClient, toast, t]);
}
