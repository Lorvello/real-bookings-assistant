
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebhookEventPayload {
  id?: string;
  calendar_id?: string;
  event_type?: string;
  status?: string;
  attempts?: number;
  payload?: any;
  [key: string]: any;
}

interface RealtimePayload {
  new?: WebhookEventPayload;
  old?: WebhookEventPayload;
  eventType: string;
}

export function useWebhookProcessor(calendarId?: string) {
  const { toast } = useToast();

  useEffect(() => {
    if (!calendarId) return;

    console.log('🔗 Setting up webhook processor for calendar:', calendarId);

    // Listen for new webhook events and process them automatically
    const webhookChannel = supabase
      .channel(`webhook-processor-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        async (payload: RealtimePayload) => {
          console.log('📤 New webhook event detected:', payload);
          
          if (payload.new && payload.new.status === 'pending') {
            console.log('🚀 Automatically processing new webhook event');
            
            // Small delay to ensure database transaction is complete
            setTimeout(async () => {
              await processWebhookQueue();
            }, 1000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'webhook_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload: RealtimePayload) => {
          console.log('📨 Webhook event updated:', payload);
          
          // Show toast for successful deliveries
          if (payload.new?.status === 'sent' && payload.old?.status === 'pending') {
            toast({
              title: "Webhook verzonden",
              description: `${payload.new.event_type} succesvol verzonden naar n8n`,
            });
          }
          
          // Show toast for failures
          if (payload.new?.status === 'failed' && payload.old?.status !== 'failed') {
            toast({
              title: "Webhook gefaald",
              description: `${payload.new.event_type} kon niet worden verzonden`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Webhook processor subscription status for ${calendarId}:`, status);
      });

    return () => {
      console.log('🔌 Cleaning up webhook processor');
      supabase.removeChannel(webhookChannel);
    };
  }, [calendarId, toast]);

  const processWebhookQueue = async () => {
    try {
      console.log('🔄 Calling process-webhooks edge function...');
      
      const { data, error } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'webhook-processor',
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) {
        console.error('❌ Error calling process-webhooks:', error);
        throw error;
      }
      
      console.log('✅ Webhook processing response:', data);
      
      if (data?.successful > 0) {
        toast({
          title: "Webhooks verwerkt",
          description: `${data.successful} webhook(s) succesvol verzonden`,
        });
      }
      
      return data;
    } catch (error) {
      console.error('💥 Error processing webhook queue:', error);
      toast({
        title: "Webhook fout",
        description: "Er is een fout opgetreden bij het verwerken van webhooks",
        variant: "destructive",
      });
      throw error;
    }
  };

  const processBookingWebhook = async (webhookEvent: WebhookEventPayload) => {
    console.log('📨 Processing individual booking webhook:', webhookEvent);
    return processWebhookQueue();
  };

  return {
    processWebhookQueue,
    processBookingWebhook
  };
}
