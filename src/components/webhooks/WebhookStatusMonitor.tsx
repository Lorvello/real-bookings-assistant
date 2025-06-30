
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface WebhookStatusMonitorProps {
  calendarId: string;
}

interface WebhookEvent {
  id: string;
  event_type: string;
  status: string;
  attempts: number;
  created_at: string;
  last_attempt_at?: string;
  payload: any;
}

export function WebhookStatusMonitor({ calendarId }: WebhookStatusMonitorProps) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWebhookData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`webhook-monitor-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        () => {
          fetchWebhookData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calendarId]);

  const fetchWebhookData = async () => {
    try {
      // Fetch recent webhook events
      const { data: eventsData, error: eventsError } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      // Fetch webhook endpoints
      const { data: endpointsData, error: endpointsError } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('calendar_id', calendarId);

      if (endpointsError) throw endpointsError;

      setEvents(eventsData || []);
      setEndpoints(endpointsData || []);
    } catch (error) {
      console.error('Error fetching webhook data:', error);
      toast({
        title: "Fout bij laden webhook data",
        description: "Kon webhook informatie niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const retryFailedWebhooks = async () => {
    try {
      const { error } = await supabase.rpc('process_webhook_queue');
      
      if (error) throw error;
      
      toast({
        title: "Webhooks opnieuw verwerkt",
        description: "Gefaalde webhooks worden opnieuw geprobeerd",
      });
      
      fetchWebhookData();
    } catch (error) {
      console.error('Error retrying webhooks:', error);
      toast({
        title: "Fout bij opnieuw proberen",
        description: "Kon webhooks niet opnieuw verwerken",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (event: WebhookEvent) => {
    switch (event.status) {
      case 'sent':
        return (
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verzonden
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Gefaald
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            In behandeling
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {event.status}
          </Badge>
        );
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('created')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (eventType.includes('confirmed')) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (eventType.includes('cancelled')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (eventType.includes('updated')) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/90 border-gray-700 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const failedEvents = events.filter(e => e.status === 'failed');
  const pendingEvents = events.filter(e => e.status === 'pending');
  const sentEvents = events.filter(e => e.status === 'sent');

  return (
    <Card className="bg-gray-800/90 border-gray-700 shadow-xl">
      <CardHeader className="border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <ExternalLink className="w-5 h-5 text-blue-400" />
            Webhook Status Monitor
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWebhookData}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Vernieuwen
            </Button>
            
            {failedEvents.length > 0 && (
              <Button
                onClick={retryFailedWebhooks}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Opnieuw proberen ({failedEvents.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Status Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-300">Verzonden</p>
                <p className="text-2xl font-bold text-white">{sentEvents.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-300">In behandeling</p>
                <p className="text-2xl font-bold text-white">{pendingEvents.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-300">Gefaald</p>
                <p className="text-2xl font-bold text-white">{failedEvents.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Active Endpoints */}
        <div className="mb-6">
          <h4 className="font-medium text-white mb-3">Actieve Webhook Endpoints</h4>
          {endpoints.length > 0 ? (
            <div className="space-y-2">
              {endpoints.map((endpoint) => (
                <div
                  key={endpoint.id}
                  className="bg-gray-700/30 rounded-lg p-3 border border-gray-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-mono">{endpoint.webhook_url}</p>
                      <p className="text-xs text-gray-400">
                        Aangemaakt: {format(new Date(endpoint.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                      </p>
                    </div>
                    <Badge className={endpoint.is_active ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
                      {endpoint.is_active ? 'Actief' : 'Inactief'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Geen webhook endpoints geconfigureerd</p>
          )}
        </div>

        {/* Recent Events */}
        <div>
          <h4 className="font-medium text-white mb-3">Recente Webhook Events</h4>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-gray-700/30 rounded-lg p-4 border border-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                      {getStatusBadge(event)}
                      {event.attempts > 1 && (
                        <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                          {event.attempts} pogingen
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(event.created_at), 'dd MMM HH:mm', { locale: nl })}
                    </span>
                  </div>
                  
                  {event.payload?.customer_name && (
                    <div className="text-sm text-gray-300">
                      <span className="font-medium">{event.payload.customer_name}</span>
                      {event.payload.service_name && (
                        <span className="text-gray-400"> • {event.payload.service_name}</span>
                      )}
                      {event.payload.start_time && (
                        <span className="text-gray-400"> • {format(new Date(event.payload.start_time), 'dd MMM HH:mm', { locale: nl })}</span>
                      )}
                    </div>
                  )}
                  
                  {event.last_attempt_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Laatste poging: {format(new Date(event.last_attempt_at), 'dd MMM HH:mm', { locale: nl })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">
              Nog geen webhook events. Events verschijnen hier wanneer er bookings worden gemaakt.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
