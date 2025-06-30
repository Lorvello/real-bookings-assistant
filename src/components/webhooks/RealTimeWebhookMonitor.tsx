
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, Clock, CheckCircle, AlertTriangle, Zap, Eye, Pause, Play } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface WebhookEvent {
  id: string;
  event_type: string;
  status: string;
  attempts: number;
  created_at: string;
  last_attempt_at?: string;
  payload: any;
  calendar_id: string;
}

interface RealTimeWebhookMonitorProps {
  calendarId: string;
}

export function RealTimeWebhookMonitor({ calendarId }: RealTimeWebhookMonitorProps) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    lastProcessed: null as string | null
  });
  const { toast } = useToast();

  useEffect(() => {
    if (!calendarId) return;

    // Laad initiële data
    fetchRecentEvents();

    if (!isMonitoring) return;

    console.log('🔴 Starting real-time webhook monitoring for calendar:', calendarId);

    // Real-time subscription voor webhook events
    const webhookChannel = supabase
      .channel(`realtime-webhooks-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('🔔 NEW webhook event:', payload.new);
          const newEvent = payload.new as WebhookEvent;
          
          setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
          updateStats();
          
          toast({
            title: "Nieuwe webhook event",
            description: `${newEvent.event_type} - ${newEvent.status}`,
          });
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
        (payload) => {
          console.log('🔄 UPDATED webhook event:', payload.new);
          const updatedEvent = payload.new as WebhookEvent;
          
          setEvents(prev => prev.map(event => 
            event.id === updatedEvent.id ? updatedEvent : event
          ));
          updateStats();
          
          if (updatedEvent.status === 'sent') {
            toast({
              title: "Webhook verzonden",
              description: `${updatedEvent.event_type} succesvol naar n8n`,
            });
          } else if (updatedEvent.status === 'failed') {
            toast({
              title: "Webhook gefaald",
              description: `${updatedEvent.event_type} kon niet worden verzonden`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Real-time webhook subscription status:', status);
      });

    // Listen for new bookings (which trigger webhooks)
    const bookingChannel = supabase
      .channel(`realtime-bookings-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
          filter: `calendar_id=eq.${calendarId}`,
        },
        (payload) => {
          console.log('📅 NEW booking created:', payload.new);
          toast({
            title: "Nieuwe booking",
            description: `Booking aangemaakt - webhook wordt getriggerd`,
          });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up real-time webhook monitoring');
      supabase.removeChannel(webhookChannel);
      supabase.removeChannel(bookingChannel);
    };
  }, [calendarId, isMonitoring, toast]);

  const fetchRecentEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setEvents(data || []);
      updateStatsFromData(data || []);
    } catch (error) {
      console.error('Error fetching webhook events:', error);
      toast({
        title: "Fout bij laden",
        description: "Kon webhook events niet laden",
        variant: "destructive",
      });
    }
  };

  const updateStats = () => {
    // Update stats from current events
    updateStatsFromData(events);
  };

  const updateStatsFromData = (eventData: WebhookEvent[]) => {
    const total = eventData.length;
    const pending = eventData.filter(e => e.status === 'pending').length;
    const sent = eventData.filter(e => e.status === 'sent').length;
    const failed = eventData.filter(e => e.status === 'failed').length;
    const lastProcessed = eventData.find(e => e.status === 'sent')?.last_attempt_at || null;

    setStats({ total, pending, sent, failed, lastProcessed });
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      fetchRecentEvents();
    }
  };

  const getStatusBadge = (event: WebhookEvent) => {
    switch (event.status) {
      case 'sent':
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
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
        return <Badge variant="outline">{event.status}</Badge>;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('created')) return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    if (eventType.includes('confirmed')) return 'bg-green-500/20 text-green-700 border-green-500/30';
    if (eventType.includes('cancelled')) return 'bg-red-500/20 text-red-700 border-red-500/30';
    if (eventType.includes('updated')) return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className={`w-5 h-5 ${isMonitoring ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            Real-Time Webhook Monitor
            {isMonitoring && <Badge variant="default" className="bg-green-500">LIVE</Badge>}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMonitoring}
              className={isMonitoring ? 'text-red-600' : 'text-green-600'}
            >
              {isMonitoring ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pauzeren
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Starten
                </>
              )}
            </Button>
            
            <Button variant="outline" size="sm" onClick={fetchRecentEvents}>
              <Eye className="w-4 h-4 mr-2" />
              Vernieuwen
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Live Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Totaal</p>
                <p className="text-xl font-bold text-blue-800">{stats.total}</p>
              </div>
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-xl font-bold text-yellow-800">{stats.pending}</p>
              </div>
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Verzonden</p>
                <p className="text-xl font-bold text-green-800">{stats.sent}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Gefaald</p>
                <p className="text-xl font-bold text-red-800">{stats.failed}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        {/* Last Processed Info */}
        {stats.lastProcessed && (
          <div className="bg-gray-50 border rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-600">
              <Zap className="w-4 h-4 inline mr-1" />
              Laatste verwerking: {format(new Date(stats.lastProcessed), 'dd MMM HH:mm:ss', { locale: nl })}
            </p>
          </div>
        )}

        {/* Real-time Event Stream */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Activity className={`w-4 h-4 ${isMonitoring ? 'text-green-500' : 'text-gray-400'}`} />
            Live Event Stream
            {isMonitoring && <span className="text-sm text-green-600">(Real-time)</span>}
          </h4>
          
          {events.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                      {getStatusBadge(event)}
                      {event.attempts > 1 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          {event.attempts} pogingen
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {format(new Date(event.created_at), 'HH:mm:ss', { locale: nl })}
                    </span>
                  </div>
                  
                  {event.payload?.customer_name && (
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{event.payload.customer_name}</span>
                      {event.payload.service_name && (
                        <span className="text-gray-500"> • {event.payload.service_name}</span>
                      )}
                      {event.payload.start_time && (
                        <span className="text-gray-500"> • {format(new Date(event.payload.start_time), 'dd MMM HH:mm', { locale: nl })}</span>
                      )}
                    </div>
                  )}
                  
                  {event.last_attempt_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Laatste poging: {format(new Date(event.last_attempt_at), 'HH:mm:ss', { locale: nl })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Geen webhook events gevonden</p>
              <p className="text-sm">Events verschijnen hier automatisch wanneer er bookings worden gemaakt</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
