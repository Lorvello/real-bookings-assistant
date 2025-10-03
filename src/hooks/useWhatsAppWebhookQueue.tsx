
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppWebhookQueueItem {
  id: string;
  webhook_type: 'message' | 'status' | 'contact_update';
  payload: Record<string, any>;
  processed: boolean;
  processed_at?: string;
  error?: string;
  retry_count: number;
  created_at: string;
}

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
      return data as WhatsAppWebhookQueueItem[];
    },
    staleTime: 60000, // Data fresh for 1 minute
    refetchInterval: 60000, // Refresh every 60 seconds (reduced from 30s)
  });
}

export function useUnprocessedWebhooks() {
  return useQuery({
    queryKey: ['whatsapp-webhook-queue-unprocessed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_webhook_queue')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as WhatsAppWebhookQueueItem[];
    },
    staleTime: 30000, // Data fresh for 30 seconds
    refetchInterval: 30000, // Refresh every 30 seconds (reduced from 10s)
  });
}

export function useProcessWebhookQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('process_whatsapp_webhook_queue');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-webhook-queue'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-webhook-queue-unprocessed'] });
      toast({
        title: "Webhook queue verwerkt",
        description: "Alle webhooks in de queue zijn verwerkt",
      });
    },
    onError: (error) => {
      console.error('Error processing webhook queue:', error);
      toast({
        title: "Fout bij verwerken queue",
        description: "Er is een fout opgetreden bij het verwerken van de webhook queue",
        variant: "destructive",
      });
    },
  });
}

export function useWebhookStatus(calendarId?: string) {
  const { data: webhookEvents } = useQuery({
    queryKey: ['webhook-events', calendarId],
    queryFn: async () => {
      if (!calendarId) return [];

      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const retryFailedWebhooks = async () => {
    try {
      const { error } = await supabase.rpc('process_webhook_queue');
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['webhook-events', calendarId] });
      toast({
        title: "Webhooks opnieuw geprobeerd",
        description: "Gefaalde webhooks worden opnieuw verwerkt",
      });
    } catch (error) {
      console.error('Error retrying webhooks:', error);
      toast({
        title: "Fout bij opnieuw proberen",
        description: "Kan webhooks niet opnieuw verwerken",
        variant: "destructive",
      });
    }
  };

  const failedEvents = webhookEvents?.filter(event => event.status === 'failed') || [];
  const pendingEvents = webhookEvents?.filter(event => event.status === 'pending') || [];
  const hasFailures = failedEvents.length > 0;

  return {
    webhookEvents: webhookEvents || [],
    failedEvents,
    pendingEvents,
    hasFailures,
    loading: !webhookEvents,
    retryFailedWebhooks,
  };
}
