
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface WebhookDebuggerProps {
  calendarId: string;
}

export function WebhookDebugger({ calendarId }: WebhookDebuggerProps) {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDebugData();
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
        .limit(10);

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
      const testPayload = {
        event_type: 'booking.test',
        booking_id: 'test-booking-id',
        customer_name: 'Test Customer',
        test: true,
        timestamp: new Date().toISOString()
      };

      console.log('🧪 Testing webhook:', endpointUrl);
      console.log('📦 Test payload:', testPayload);

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Brand-Evolves-Webhook/1.0',
        },
        body: JSON.stringify(testPayload)
      });

      console.log('📡 Test response status:', response.status);

      if (response.ok) {
        toast({
          title: "Test succesvol",
          description: "Webhook test succesvol verzonden",
        });
      } else {
        const responseText = await response.text();
        console.error('Test failed:', response.status, responseText);
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
    }
  };

  const manualTrigger = async () => {
    try {
      // Manually trigger webhook processing
      const { error } = await supabase.rpc('process_webhook_queue');
      
      if (error) throw error;
      
      toast({
        title: "Webhook queue gestart",
        description: "Webhook processing handmatig gestart",
      });
      
      fetchDebugData();
    } catch (error) {
      console.error('Manual trigger error:', error);
      toast({
        title: "Fout",
        description: "Kon webhook queue niet starten",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Webhook Debug Info
            <Button onClick={fetchDebugData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Configured Endpoints</h4>
              {endpoints.length > 0 ? (
                <div className="space-y-2">
                  {endpoints.map((endpoint) => (
                    <div key={endpoint.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-mono text-sm">{endpoint.webhook_url}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(endpoint.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={endpoint.is_active ? "default" : "secondary"}>
                          {endpoint.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          onClick={() => testWebhook(endpoint.webhook_url)}
                          size="sm"
                          variant="outline"
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No webhook endpoints configured</p>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2">Recent Webhook Events</h4>
              {recentEvents.length > 0 ? (
                <div className="space-y-2">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{event.event_type}</Badge>
                          <Badge variant={
                            event.status === 'sent' ? 'default' : 
                            event.status === 'failed' ? 'destructive' : 'secondary'
                          }>
                            {event.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(event.created_at).toLocaleString()}
                        </p>
                        {event.last_attempt_at && (
                          <p className="text-xs text-gray-500">
                            Last attempt: {new Date(event.last_attempt_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Attempts: {event.attempts}</p>
                        {event.status === 'sent' && <CheckCircle className="w-4 h-4 text-green-500 mt-1" />}
                        {event.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-500 mt-1" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent webhook events</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={manualTrigger} variant="outline">
                Manual Trigger
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
