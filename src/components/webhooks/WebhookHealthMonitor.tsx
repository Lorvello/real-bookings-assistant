
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Zap, Clock } from 'lucide-react';
import { useWebhookAutoProcessor } from '@/hooks/useWebhookAutoProcessor';

interface WebhookHealthMonitorProps {
  calendarId: string;
}

interface WebhookHealth {
  total_endpoints: number;
  active_endpoints: number;
  pending_events: number;
  failed_events: number;
  recent_successes: number;
  last_success_at?: string;
  avg_processing_time?: number;
}

export function WebhookHealthMonitor({ calendarId }: WebhookHealthMonitorProps) {
  const [health, setHealth] = useState<WebhookHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  
  // Enable auto-processor for this calendar
  const { lastProcessTime } = useWebhookAutoProcessor({ 
    calendarId, 
    enabled: true 
  });

  useEffect(() => {
    fetchHealthMetrics();
    
    // Set up real-time monitoring
    const channel = supabase
      .channel(`webhook-health-${calendarId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_events',
          filter: `calendar_id=eq.${calendarId}`,
        },
        () => {
          fetchHealthMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'webhook_endpoints',
          filter: `calendar_id=eq.${calendarId}`,
        },
        () => {
          fetchHealthMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calendarId]);

  const fetchHealthMetrics = async () => {
    try {
      // Get endpoints count
      const { data: endpoints, error: endpointsError } = await supabase
        .from('webhook_endpoints')
        .select('is_active')
        .eq('calendar_id', calendarId);

      if (endpointsError) throw endpointsError;

      // Get webhook events metrics
      const { data: events, error: eventsError } = await supabase
        .from('webhook_events')
        .select('status, created_at, last_attempt_at')
        .eq('calendar_id', calendarId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      const totalEndpoints = endpoints?.length || 0;
      const activeEndpoints = endpoints?.filter(e => e.is_active)?.length || 0;
      const pendingEvents = events?.filter(e => e.status === 'pending')?.length || 0;
      const failedEvents = events?.filter(e => e.status === 'failed')?.length || 0;
      const recentSuccesses = events?.filter(e => e.status === 'sent')?.length || 0;
      const lastSuccess = events?.find(e => e.status === 'sent');

      setHealth({
        total_endpoints: totalEndpoints,
        active_endpoints: activeEndpoints,
        pending_events: pendingEvents,
        failed_events: failedEvents,
        recent_successes: recentSuccesses,
        last_success_at: lastSuccess?.last_attempt_at || lastSuccess?.created_at,
      });
    } catch (error) {
      console.error('Error fetching webhook health:', error);
      toast({
        title: "Fout bij laden webhook status",
        description: "Kon webhook health metrics niet laden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const forceProcessWebhooks = async () => {
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'manual-health-monitor',
          calendar_id: calendarId,
          force: true,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Webhook processing gestart",
        description: `${data?.processed || 0} webhook(s) worden verwerkt`,
      });
      
      // Refresh metrics after a short delay
      setTimeout(fetchHealthMetrics, 2000);
    } catch (error) {
      console.error('Error processing webhooks:', error);
      toast({
        title: "Fout bij webhook processing",
        description: "Kon webhooks niet handmatig verwerken",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const testEndToEnd = async () => {
    try {
      setProcessing(true);
      
      // Create a test booking to trigger the full webhook flow
      const testBooking = {
        calendar_id: calendarId,
        customer_name: 'Test Webhook Customer',
        customer_email: 'test@webhook.test',
        start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        end_time: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 1.5 hours from now
        status: 'confirmed',
        notes: 'End-to-end webhook test booking'
      };
      
      const { data, error } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: "End-to-end test gestart",
        description: "Test booking aangemaakt - webhook zou automatisch getriggerd moeten worden",
      });
      
      // Clean up test booking after a delay
      setTimeout(async () => {
        await supabase
          .from('bookings')
          .delete()
          .eq('id', data.id);
        
        fetchHealthMetrics();
      }, 10000);
      
    } catch (error) {
      console.error('Error in end-to-end test:', error);
      toast({
        title: "End-to-end test gefaald",
        description: "Kon test booking niet aanmaken",
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

  const getHealthStatus = () => {
    if (!health) return { status: 'unknown', color: 'gray' };
    
    if (health.failed_events > 0) return { status: 'unhealthy', color: 'red' };
    if (health.pending_events > 5) return { status: 'degraded', color: 'yellow' };
    if (health.active_endpoints === 0) return { status: 'no-endpoints', color: 'orange' };
    if (health.recent_successes > 0) return { status: 'healthy', color: 'green' };
    
    return { status: 'idle', color: 'blue' };
  };

  const healthStatus = getHealthStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Webhook Health Monitor
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={healthStatus.color === 'green' ? 'default' : 'destructive'}>
              {healthStatus.status}
            </Badge>
            <Button onClick={fetchHealthMetrics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Health Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Endpoints</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {health?.active_endpoints}/{health?.total_endpoints}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-800">{health?.pending_events}</p>
                </div>
                {(health?.pending_events || 0) > 0 && <Clock className="w-8 h-8 text-yellow-500" />}
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Failed</p>
                  <p className="text-2xl font-bold text-red-800">{health?.failed_events}</p>
                </div>
                {(health?.failed_events || 0) > 0 && <AlertTriangle className="w-8 h-8 text-red-500" />}
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Recent Success</p>
                  <p className="text-2xl font-bold text-green-800">{health?.recent_successes}</p>
                </div>
                {(health?.recent_successes || 0) > 0 && <CheckCircle className="w-8 h-8 text-green-500" />}
              </div>
            </div>
          </div>

          {/* Last Success Info */}
          {health?.last_success_at && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Laatste succesvolle webhook: {new Date(health.last_success_at).toLocaleString('nl-NL')}
              </p>
            </div>
          )}

          {/* Auto-processor Status */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">Auto-processor Status</p>
                <p className="text-sm text-blue-700">
                  Actief - controleert elke 10 seconden op nieuwe webhooks
                </p>
                {lastProcessTime > 0 && (
                  <p className="text-xs text-blue-600">
                    Laatste check: {new Date(lastProcessTime).toLocaleString('nl-NL')}
                  </p>
                )}
              </div>
              <Badge variant="default">Auto Active</Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={forceProcessWebhooks}
              disabled={processing}
              variant="default"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              {processing ? 'Processing...' : 'Force Process All'}
            </Button>
            
            <Button
              onClick={testEndToEnd}
              disabled={processing}
              variant="outline"
              size="sm"
            >
              <Activity className="w-4 h-4 mr-2" />
              {processing ? 'Testing...' : 'End-to-End Test'}
            </Button>
          </div>

          {/* Status Messages */}
          {healthStatus.status === 'unhealthy' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-red-800 font-medium">
                  Er zijn gefaalde webhooks die aandacht nodig hebben
                </p>
              </div>
            </div>
          )}
          
          {healthStatus.status === 'no-endpoints' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <p className="text-orange-800 font-medium">
                  Geen actieve webhook endpoints geconfigureerd
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
