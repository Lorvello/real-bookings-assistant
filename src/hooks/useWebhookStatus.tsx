
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WebhookEvent {
  id: string;
  calendar_id: string;
  event_type: string;
  status: string; // Changed from union type to string to match database
  attempts: number;
  created_at: string;
  last_attempt_at?: string;
}

export const useWebhookStatus = (calendarId?: string) => {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!calendarId) return;

    const fetchWebhookEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('webhook_events')
          .select('*')
          .eq('calendar_id', calendarId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error('Error fetching webhook events:', error);
        toast({
          title: "Fout bij laden webhook status",
          description: "Kon webhook events niet laden",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWebhookEvents();

    // Subscribe to webhook retry notifications
    const channel = supabase
      .channel('webhook-retries')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'webhook_events',
        filter: `calendar_id=eq.${calendarId}`
      }, (payload) => {
        console.log('Webhook event updated:', payload);
        fetchWebhookEvents(); // Refresh the list
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calendarId, toast]);

  const retryFailedWebhooks = async () => {
    try {
      const { error } = await supabase.rpc('process_webhook_queue');
      if (error) throw error;

      toast({
        title: "Webhook retry gestart",
        description: "Gefaalde webhooks worden opnieuw geprobeerd",
      });
    } catch (error) {
      console.error('Error retrying webhooks:', error);
      toast({
        title: "Fout bij webhook retry",
        description: "Kon webhooks niet opnieuw proberen",
        variant: "destructive",
      });
    }
  };

  const failedEvents = events.filter(e => e.status === 'failed');
  const pendingEvents = events.filter(e => e.status === 'pending');

  return {
    events,
    loading,
    failedEvents,
    pendingEvents,
    retryFailedWebhooks,
    hasFailures: failedEvents.length > 0
  };
};
