
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WebhookEndpoint, WebhookEvent } from '@/types/database';

export const useWebhooks = (calendarId?: string) => {
  const { toast } = useToast();
  const { t } = useTranslation('notifications');
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (calendarId) {
      fetchWebhookEndpoints();
      fetchWebhookEvents();
    }
  }, [calendarId]);

  const fetchWebhookEndpoints = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching webhook endpoints:', error);
        return;
      }

      setEndpoints((data || []) as WebhookEndpoint[]);
    } catch (error) {
      console.error('Error fetching webhook endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookEvents = async () => {
    if (!calendarId) return;

    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching webhook events:', error);
        return;
      }

      setEvents((data || []) as WebhookEvent[]);
    } catch (error) {
      console.error('Error fetching webhook events:', error);
    }
  };

  const createWebhookEndpoint = async (webhookUrl: string) => {
    if (!calendarId) return;

    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .insert({
          calendar_id: calendarId,
          webhook_url: webhookUrl,
          is_active: true
        });

      if (error) {
        toast({
          title: t('webhooks.errorTitle', "Error"),
          description: t('webhooks.createFailed', "Failed to create webhook endpoint"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('webhooks.successTitle', "Success"),
        description: t('webhooks.createSuccess', "Webhook endpoint created successfully"),
      });

      await fetchWebhookEndpoints();
    } catch (error) {
      console.error('Error creating webhook endpoint:', error);
      toast({
        title: t('webhooks.errorTitle', "Error"),
        description: t('webhooks.unexpectedError', "An unexpected error occurred"),
        variant: "destructive",
      });
    }
  };

  const updateWebhookEndpoint = async (id: string, updates: Partial<WebhookEndpoint>) => {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .update(updates)
        .eq('id', id);

      if (error) {
        toast({
          title: t('webhooks.errorTitle', "Error"),
          description: t('webhooks.updateFailed', "Failed to update webhook endpoint"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('webhooks.successTitle', "Success"),
        description: t('webhooks.updateSuccess', "Webhook endpoint updated successfully"),
      });

      await fetchWebhookEndpoints();
    } catch (error) {
      console.error('Error updating webhook endpoint:', error);
      toast({
        title: t('webhooks.errorTitle', "Error"),
        description: t('webhooks.unexpectedError', "An unexpected error occurred"),
        variant: "destructive",
      });
    }
  };

  const deleteWebhookEndpoint = async (id: string) => {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: t('webhooks.errorTitle', "Error"),
          description: t('webhooks.deleteFailed', "Failed to delete webhook endpoint"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('webhooks.successTitle', "Success"),
        description: t('webhooks.deleteSuccess', "Webhook endpoint deleted successfully"),
      });

      await fetchWebhookEndpoints();
    } catch (error) {
      console.error('Error deleting webhook endpoint:', error);
      toast({
        title: t('webhooks.errorTitle', "Error"),
        description: t('webhooks.unexpectedError', "An unexpected error occurred"),
        variant: "destructive",
      });
    }
  };

  const retryWebhookEvent = async (eventId: string) => {
    try {
      const response = await fetch('/api/webhook-retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      });

      if (response.ok) {
        toast({
          title: t('webhooks.successTitle', "Success"),
          description: t('webhooks.retrySuccess', "Webhook retry initiated"),
        });
        await fetchWebhookEvents();
      } else {
        toast({
          title: t('webhooks.errorTitle', "Error"),
          description: t('webhooks.retryFailed', "Failed to retry webhook"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error retrying webhook:', error);
      toast({
        title: t('webhooks.errorTitle', "Error"),
        description: t('webhooks.unexpectedError', "An unexpected error occurred"),
        variant: "destructive",
      });
    }
  };

  return {
    endpoints,
    events,
    loading,
    createWebhookEndpoint,
    updateWebhookEndpoint,
    deleteWebhookEndpoint,
    retryWebhookEvent,
    refetch: () => {
      fetchWebhookEndpoints();
      fetchWebhookEvents();
    }
  };
};
