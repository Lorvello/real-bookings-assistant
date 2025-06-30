
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, CheckCircle, Play, Bug } from 'lucide-react';

interface WebhookDebuggerProps {
  calendarId: string;
}

export function WebhookDebugger({ calendarId }: WebhookDebuggerProps) {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDebugData();
    
    // Set up real-time subscription for webhook events
    const channel = supabase
      .channel(`webhook-debug-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        () => {
          console.log('🔄 Webhook event changed, refreshing debug data');
          fetchDebugData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calendarId]);

  const fetchDebugData = async () => {
    try {
      setLoading(true);
      
      // Fetch webhook endpoints
      const { data: endpointsData, error: endpointsError } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('calendar_id', calendarId);

      if (endpointsError) throw endpointsError;

      // Fetch recent webhook events
      const { data: eventsData, error: eventsError } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      setEndpoints(endpointsData || []);
      setRecentEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching debug data:', error);
      toast({
        title: "Error",
        description: "Could not fetch webhook debug data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async (endpointUrl: string) => {
    try {
      setProcessing(true);
      
      const testPayload = {
        event_type: 'booking.test',
        booking_id: 'test-booking-id',
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        service_name: 'Test Service',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        test: true,
        timestamp: new Date().toISOString(),
        metadata: {
          source: 'webhook-debugger',
          test: true
        }
      };

      console.log('🧪 Testing webhook:', endpointUrl);
      console.log('📦 Test payload:', testPayload);

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Brand-Evolves-Webhook/1.0',
          'X-Webhook-Event': 'booking.test',
          'X-Webhook-Test': 'true',
        },
        body: JSON.stringify(testPayload)
      });

      console.log('📡 Test response status:', response.status);
      const responseText = await response.text();
      console.log('📄 Test response body:', responseText);

      if (response.ok) {
        toast({
          title: "Test succesvol",
          description: `Webhook test succesvol verzonden (Status: ${response.status})`,
        });
      } else {
        toast({
          title: "Test gefaald",
          description: `HTTP ${response.status}: ${response.statusText}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: "Test fout",
        description: `Kon webhook niet testen: ${error}`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const manualTrigger = async () => {
    try {
      setProcessing(true);
      
      console.log('🚀 Manually triggering webhook processing...');
      
      const { data, error } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'manual-trigger',
          calendar_id: calendarId,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) throw error;
      
      console.log('✅ Manual trigger response:', data);
      
      toast({
        title: "Webhook processing gestart",
        description: `${data?.processed || 0} webhook events verwerkt`,
      });
      
      fetchDebugData();
    } catch (error) {
      console.error('Manual trigger error:', error);
      toast({
        title: "Fout",
        description: "Kon webhook processing niet starten",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingEvents = recentEvents.filter(e => e.status === 'pending');
  const failedEvents = recentEvents.filter(e => e.status === 'failed');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Webhook Debug Info
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={manualTrigger} 
                variant="default" 
                size="sm"
                disabled={processing}
              >
                <Play className="w-4 h-4 mr-2" />
                {processing ? 'Processing...' : 'Manual Trigger'}
              </Button>
              <Button onClick={fetchDebugData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Totaal Events</p>
                    <p className="text-2xl font-bold text-blue-800">{recentEvents.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800">{pendingEvents.length}</p>
                  </div>
                  {pendingEvents.length > 0 && <AlertTriangle className="w-8 h-8 text-yellow-500" />}
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">Failed</p>
                    <p className="text-2xl font-bold text-red-800">{failedEvents.length}</p>
                  </div>
                  {failedEvents.length > 0 && <AlertTriangle className="w-8 h-8 text-red-500" />}
                </div>
              </div>
            </div>

            {/* Configured Endpoints */}
            <div>
              <h4 className="font-medium mb-3">Configured Endpoints</h4>
              {endpoints.length > 0 ? (
                <div className="space-y-3">
                  {endpoints.map((endpoint) => (
                    <div key={endpoint.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-mono text-sm break-all">{endpoint.webhook_url}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(endpoint.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <Badge variant={endpoint.is_active ? "default" : "secondary"}>
                          {endpoint.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          onClick={() => testWebhook(endpoint.webhook_url)}
                          size="sm"
                          variant="outline"
                          disabled={processing}
                        >
                          {processing ? 'Testing...' : 'Test'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No webhook endpoints configured</p>
              )}
            </div>

            {/* Recent Events */}
            <div>
              <h4 className="font-medium mb-3">Recent Webhook Events</h4>
              {recentEvents.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{event.event_type}</Badge>
                          <Badge variant={
                            event.status === 'sent' ? 'default' : 
                            event.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {event.status}
                          </Badge>
                          {event.attempts > 1 && (
                            <Badge variant="outline">
                              {event.attempts} attempts
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                          {event.status === 'sent' && <CheckCircle className="w-4 h-4 text-green-500 mt-1" />}
                          {event.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-500 mt-1" />}
                        </div>
                      </div>
                      
                      {event.payload?.customer_name && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">{event.payload.customer_name}</span>
                          {event.payload.service_name && (
                            <span className="text-gray-500"> • {event.payload.service_name}</span>
                          )}
                        </div>
                      )}
                      
                      {event.last_attempt_at && (
                        <p className="text-xs text-gray-500">
                          Last attempt: {new Date(event.last_attempt_at).toLocaleString()}
                        </p>
                      )}
                      
                      {event.payload && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">View payload</summary>
                          <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No webhook events found. Events will appear here when bookings are created.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
