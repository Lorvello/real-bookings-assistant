
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useWebhookProcessor(calendarId?: string) {
  const { toast } = useToast();

  useEffect(() => {
    if (!calendarId) return;

    console.log('🔗 Setting up webhook processor for calendar:', calendarId);

    // Listen for webhook processing notifications
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
        async (payload) => {
          console.log('📤 New webhook event detected:', payload);
          
          if (payload.new.event_type?.startsWith('booking.')) {
            // Process booking webhooks immediately
            await processBookingWebhook(payload.new);
          }
        }
      )
      .subscribe();

    // Listen for PostgreSQL notifications
    const notificationChannel = supabase
      .channel('webhook-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'webhook_events'
      }, (payload) => {
        if (payload.new?.calendar_id === calendarId && payload.new?.status === 'pending') {
          console.log('🚀 Processing webhook event immediately');
          processWebhookQueue();
        }
      })
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up webhook processor');
      supabase.removeChannel(webhookChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [calendarId, toast]);

  const processBookingWebhook = async (webhookEvent: any) => {
    try {
      console.log('📨 Processing booking webhook:', webhookEvent);
      
      // Get webhook endpoints for this calendar
      const { data: endpoints, error: endpointsError } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('calendar_id', webhookEvent.calendar_id)
        .eq('is_active', true);

      if (endpointsError) {
        console.error('Error fetching webhook endpoints:', endpointsError);
        return;
      }

      if (!endpoints || endpoints.length === 0) {
        console.log('No active webhook endpoints found');
        return;
      }

      // Send webhook to each endpoint
      for (const endpoint of endpoints) {
        try {
          console.log('🎯 Sending webhook to:', endpoint.webhook_url);
          
          const response = await fetch(endpoint.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Brand-Evolves-Webhook/1.0',
            },
            body: JSON.stringify({
              ...webhookEvent.payload,
              webhook_id: webhookEvent.id,
              timestamp: webhookEvent.created_at
            })
          });

          if (response.ok) {
            console.log('✅ Webhook delivered successfully');
            
            // Update webhook status to sent
            await supabase
              .from('webhook_events')
              .update({
                status: 'sent',
                attempts: webhookEvent.attempts + 1,
                last_attempt_at: new Date().toISOString()
              })
              .eq('id', webhookEvent.id);

            toast({
              title: "Webhook verzonden",
              description: `Booking webhook succesvol verzonden naar n8n`,
            });
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          console.error('❌ Webhook delivery failed:', error);
          
          // Update webhook status to failed
          await supabase
            .from('webhook_events')
            .update({
              status: 'failed',
              attempts: webhookEvent.attempts + 1,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', webhookEvent.id);

          toast({
            title: "Webhook fout",
            description: `Kon webhook niet verzenden: ${error}`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error processing booking webhook:', error);
    }
  };

  const processWebhookQueue = async () => {
    try {
      console.log('🔄 Processing webhook queue...');
      
      const { error } = await supabase.rpc('process_webhook_queue');
      
      if (error) {
        console.error('Error processing webhook queue:', error);
      } else {
        console.log('✅ Webhook queue processed successfully');
      }
    } catch (error) {
      console.error('Error calling process_webhook_queue:', error);
    }
  };

  return {
    processWebhookQueue,
    processBookingWebhook
  };
}
