
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebhookEventPayload {
  id?: string;
  calendar_id?: string;
  event_type?: string;
  status?: string;
  attempts?: number;
  payload?: unknown;
  [key: string]: unknown;
}

interface RealtimePayload {
  new?: WebhookEventPayload;
  old?: WebhookEventPayload;
  eventType: string;
}

interface TestWebhookResponse {
  success: boolean;
  test_webhook_id: string;
  active_endpoints: number;
  message: string;
}

interface ManualProcessResponse {
  success: boolean;
  pending_webhooks: number;
  message: string;
}

export function useWebhookProcessor(calendarId?: string) {
  const { toast } = useToast();
  const { t } = useTranslation('notifications');

  const processWebhookQueue = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-webhooks', {
        body: {
          source: 'webhook-processor',
          calendar_id: calendarId,
        },
      });

      if (error) {
        console.error('Error calling process-webhooks:', error);
        throw error;
      }

      if (data?.successful > 0) {
        toast({
          title: t('webhookProcessor.processedTitle', "Webhooks verwerkt"),
          description: t('webhookProcessor.processedDescription', "{{count}} webhook(s) succesvol verzonden naar n8n", { count: data.successful }),
        });
      }

      return data;
    } catch (error) {
      console.error('Error processing webhook queue:', error);
      toast({
        title: t('webhookProcessor.errorTitle', "Webhook fout"),
        description: t('webhookProcessor.errorDescription', "Er is een fout opgetreden bij het verwerken van webhooks"),
        variant: "destructive",
      });
      throw error;
    }
  }, [calendarId, t, toast]);

  useEffect(() => {
    if (!calendarId) return;

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
          if (payload.new && payload.new.status === 'pending') {
            // Trigger webhook processing with small delay
            setTimeout(() => {
              void processWebhookQueue().catch(() => undefined);
            }, 2000);
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
          // Show toast for successful deliveries
          if (payload.new?.status === 'sent' && payload.old?.status === 'pending') {
            toast({
              title: t('webhookProcessor.sentTitle', "Webhook succesvol verzonden"),
              description: t('webhookProcessor.sentDescription', "{{eventType}} succesvol verzonden naar n8n", { eventType: payload.new.event_type }),
            });
          }

          // Show toast for failures
          if (payload.new?.status === 'failed' && payload.old?.status !== 'failed') {
            toast({
              title: t('webhookProcessor.failedTitle', "Webhook gefaald"),
              description: t('webhookProcessor.failedDescription', "{{eventType}} kon niet worden verzonden ({{attempts}} pogingen)", { eventType: payload.new.event_type, attempts: payload.new.attempts }),
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(webhookChannel);
    };
  }, [calendarId, processWebhookQueue, toast, t]);

  const testWebhookSystem = async () => {
    if (!calendarId) {
      throw new Error('Calendar ID is required for webhook testing');
    }

    try {
      const { data, error } = await supabase.rpc('test_webhook_system', {
        p_calendar_id: calendarId
      });
      
      if (error) throw error;
      
      const testResult = data as unknown as TestWebhookResponse;

      await processWebhookQueue();
      
      toast({
        title: t('webhookProcessor.testStartedTitle', "Webhook test gestart"),
        description: t('webhookProcessor.testStartedDescription', "Test webhook aangemaakt met {{count}} actieve endpoint(s)", { count: testResult.active_endpoints }),
      });

      return testResult;
    } catch (error) {
      console.error('💥 Error testing webhook system:', error);
      toast({
        title: t('webhookProcessor.testErrorTitle', "Webhook test fout"),
        description: t('webhookProcessor.testErrorDescription', "Kon webhook systeem niet testen"),
        variant: "destructive",
      });
      throw error;
    }
  };

  const manualProcessWebhooks = async () => {
    try {
      const data = await processWebhookQueue();
      const processResult: ManualProcessResponse = {
        success: data?.success === true,
        pending_webhooks: data?.processed ?? 0,
        message: data?.message ?? 'Processing completed',
      };
      
      toast({
        title: t('webhookProcessor.manualStartedTitle', "Handmatige verwerking gestart"),
        description: t('webhookProcessor.manualStartedDescription', "{{count}} webhook(s) worden verwerkt", { count: processResult.pending_webhooks }),
      });

      return processResult;
    } catch (error) {
      console.error('💥 Error in manual webhook processing:', error);
      toast({
        title: t('webhookProcessor.manualErrorTitle', "Handmatige verwerking fout"),
        description: t('webhookProcessor.manualErrorDescription', "Kon webhooks niet handmatig verwerken"),
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    processWebhookQueue,
    testWebhookSystem,
    manualProcessWebhooks
  };
}
