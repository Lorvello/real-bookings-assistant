
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

  useEffect(() => {
    if (!calendarId) return;

    console.log('🔗 Setting up enhanced webhook processor for calendar:', calendarId);

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
            console.log('🚀 Auto-processing new webhook event:', payload.new.event_type);
            
            // Trigger webhook processing with small delay
            setTimeout(async () => {
              await processWebhookQueue();
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
          console.log('📨 Webhook event updated:', payload);
          
          // Show toast for successful deliveries
          if (payload.new?.status === 'sent' && payload.old?.status === 'pending') {
            toast({
              title: "Webhook succesvol verzonden",
              description: `${payload.new.event_type} succesvol verzonden naar n8n`,
            });
          }
          
          // Show toast for failures
          if (payload.new?.status === 'failed' && payload.old?.status !== 'failed') {
            toast({
              title: "Webhook gefaald",
              description: `${payload.new.event_type} kon niet worden verzonden (${payload.new.attempts} pogingen)`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Enhanced webhook processor subscription status for ${calendarId}:`, status);
      });

    return () => {
      console.log('🔌 Cleaning up enhanced webhook processor');
      supabase.removeChannel(webhookChannel);
    };
  }, [calendarId, toast]);

  const processWebhookQueue = async () => {
    try {
      console.log('🔄 Calling enhanced process-webhooks edge function...');
      
      const { data, error } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'webhook-processor',
          calendar_id: calendarId,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) {
        console.error('❌ Error calling process-webhooks:', error);
        throw error;
      }
      
      console.log('✅ Enhanced webhook processing response:', data);
      
      if (data?.successful > 0) {
        toast({
          title: "Webhooks verwerkt",
          description: `${data.successful} webhook(s) succesvol verzonden naar n8n`,
        });
      }
      
      return data;
    } catch (error) {
      console.error('💥 Error processing enhanced webhook queue:', error);
      toast({
        title: "Webhook fout",
        description: "Er is een fout opgetreden bij het verwerken van webhooks",
        variant: "destructive",
      });
      throw error;
    }
  };

  const testWebhookSystem = async () => {
    if (!calendarId) {
      throw new Error('Calendar ID is required for webhook testing');
    }

    try {
      console.log('🧪 Testing webhook system for calendar:', calendarId);
      
      const { data, error } = await supabase.rpc('test_webhook_system', {
        p_calendar_id: calendarId
      });
      
      if (error) throw error;
      
      console.log('✅ Webhook system test result:', data);
      
      const testResult = data as TestWebhookResponse;
      
      toast({
        title: "Webhook test gestart",
        description: `Test webhook aangemaakt met ${testResult.active_endpoints} actieve endpoint(s)`,
      });
      
      return testResult;
    } catch (error) {
      console.error('💥 Error testing webhook system:', error);
      toast({
        title: "Webhook test fout",
        description: "Kon webhook systeem niet testen",
        variant: "destructive",
      });
      throw error;
    }
  };

  const manualProcessWebhooks = async () => {
    try {
      console.log('🔧 Manual webhook processing for calendar:', calendarId);
      
      const { data, error } = await supabase.rpc('manual_process_webhooks', {
        p_calendar_id: calendarId
      });
      
      if (error) throw error;
      
      console.log('✅ Manual processing result:', data);
      
      const processResult = data as ManualProcessResponse;
      
      toast({
        title: "Handmatige verwerking gestart",
        description: `${processResult.pending_webhooks} webhook(s) worden verwerkt`,
      });
      
      // Trigger actual processing
      setTimeout(() => processWebhookQueue(), 1000);
      
      return processResult;
    } catch (error) {
      console.error('💥 Error in manual webhook processing:', error);
      toast({
        title: "Handmatige verwerking fout",
        description: "Kon webhooks niet handmatig verwerken",
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
