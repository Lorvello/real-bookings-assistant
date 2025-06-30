import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TestTube, Play, Zap, CheckCircle, AlertTriangle, Rocket } from 'lucide-react';

interface WebhookTestingPanelProps {
  calendarId: string;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export function WebhookTestingPanel({ calendarId }: WebhookTestingPanelProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [customPayload, setCustomPayload] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const { toast } = useToast();

  const addTestResult = (result: Omit<TestResult, 'timestamp'>) => {
    setTestResults(prev => [{
      ...result,
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, 9)]);
  };

  const testDatabaseTrigger = async () => {
    try {
      setTesting(true);
      
      const testBooking = {
        calendar_id: calendarId,
        customer_name: 'Enhanced Trigger Test Customer',
        customer_email: 'enhanced-trigger-test@example.com',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Enhanced database trigger test booking'
      };
      
      const { data, error } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single();
      
      if (error) throw error;
      
      // Wait longer for webhook event creation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { data: webhookEvents, error: webhookError } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('event_type', 'booking.created')
        .gte('created_at', new Date(Date.now() - 10000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (webhookError) throw webhookError;
      
      // Clean up test booking
      await supabase
        .from('bookings')
        .delete()
        .eq('id', data.id);
      
      if (webhookEvents && webhookEvents.length > 0) {
        // Safely access payload properties with proper type casting
        const payload = webhookEvents[0].payload as any;
        const triggerSource = payload?.trigger_source || 'unknown';
        
        addTestResult({
          success: true,
          message: 'Enhanced database trigger werkt perfect',
          details: { 
            booking_id: data.id, 
            webhook_event_id: webhookEvents[0].id,
            payload_size: JSON.stringify(webhookEvents[0].payload).length,
            trigger_source: triggerSource
          }
        });
        toast({
          title: "Enhanced trigger test succesvol",
          description: "Database trigger creëert correct webhook events met verrijkte payload",
        });
      } else {
        addTestResult({
          success: false,
          message: 'Enhanced database trigger werkt NIET - geen webhook event aangemaakt',
          details: { booking_id: data.id }
        });
        toast({
          title: "Enhanced trigger test gefaald",
          description: "Database trigger creëert geen webhook events",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Enhanced trigger test error:', error);
      addTestResult({
        success: false,
        message: `Enhanced trigger test gefaald: ${error}`,
      });
      toast({
        title: "Enhanced trigger test fout",
        description: "Kon database trigger niet testen",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const testEdgeFunctionProcessing = async () => {
    try {
      setTesting(true);
      
      const { data, error } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'enhanced-test-panel',
          calendar_id: calendarId,
          test: true,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) throw error;
      
      addTestResult({
        success: true,
        message: 'Enhanced Edge Function werkt perfect',
        details: {
          ...data,
          performance: {
            batch_size: data?.batch_size || 0,
            processing_time: 'optimized'
          }
        }
      });
      
      toast({
        title: "Enhanced Edge Function test succesvol",
        description: `Processed: ${data?.processed || 0}, Successful: ${data?.successful || 0}, Failed: ${data?.failed || 0}`,
      });
      
    } catch (error) {
      console.error('Enhanced Edge Function test error:', error);
      addTestResult({
        success: false,
        message: `Enhanced Edge Function test gefaald: ${error}`,
      });
      toast({
        title: "Enhanced Edge Function test gefaald",
        description: "Kon Edge Function niet testen",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const testEndToEndFlow = async () => {
    try {
      setTesting(true);
      
      toast({
        title: "End-to-end test gestart",
        description: "Testing complete flow: Database → Trigger → Edge Function → n8n",
      });
      
      // Step 1: Create test booking (should trigger webhook)
      const testBooking = {
        calendar_id: calendarId,
        customer_name: 'E2E Test Customer',
        customer_email: 'e2e-test@example.com',
        customer_phone: '+31612345678',
        start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        service_name: 'E2E Test Service',
        notes: 'End-to-end webhook test'
      };
      
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single();
      
      if (bookingError) throw bookingError;
      
      // Step 2: Wait for webhook creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Check webhook was created
      const { data: webhookEvent, error: webhookError } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('event_type', 'booking.created')
        .gte('created_at', new Date(Date.now() - 5000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (webhookError) throw webhookError;
      
      if (!webhookEvent || webhookEvent.length === 0) {
        throw new Error('Webhook event not created by trigger');
      }
      
      // Step 4: Process webhooks via Edge Function
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'e2e-test',
          calendar_id: calendarId,
          timestamp: new Date().toISOString()
        }
      });
      
      if (processError) throw processError;
      
      // Step 5: Wait and check final status
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { data: finalWebhookStatus, error: statusError } = await supabase
        .from('webhook_events')
        .select('status, attempts, last_attempt_at')
        .eq('id', webhookEvent[0].id)
        .single();
      
      if (statusError) throw statusError;
      
      // Clean up test booking
      await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);
      
      const success = finalWebhookStatus.status === 'sent';
      
      addTestResult({
        success,
        message: success ? 'End-to-end test SUCCESVOL! Complete pipeline werkt perfect.' : 'End-to-end test gefaald - webhook niet verzonden',
        details: {
          booking_id: booking.id,
          webhook_event_id: webhookEvent[0].id,
          final_status: finalWebhookStatus.status,
          attempts: finalWebhookStatus.attempts,
          process_result: processResult,
          test_type: 'end_to_end',
          flow_steps: ['booking_created', 'webhook_triggered', 'edge_function_processed', 'webhook_delivered']
        }
      });
      
      if (success) {
        toast({
          title: "🎉 End-to-end test SUCCESVOL!",
          description: "Complete webhook pipeline werkt perfect van database naar n8n",
        });
      } else {
        toast({
          title: "End-to-end test gefaald",
          description: `Webhook status: ${finalWebhookStatus.status}`,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('End-to-end test error:', error);
      addTestResult({
        success: false,
        message: `End-to-end test gefaald: ${error}`,
      });
      toast({
        title: "End-to-end test fout",
        description: `${error}`,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const processAllPendingWebhooks = async () => {
    try {
      setTesting(true);
      
      // Check pending count first
      const { data: pendingCount, error: countError } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('status', 'pending')
        .eq('calendar_id', calendarId);
      
      if (countError) throw countError;
      
      if (!pendingCount || pendingCount.length === 0) {
        toast({
          title: "Geen pending webhooks",
          description: "Er zijn geen webhooks in behandeling",
        });
        addTestResult({
          success: true,
          message: 'Geen pending webhooks gevonden om te verwerken',
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'manual-process-all',
          calendar_id: calendarId,
          force: true,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) throw error;
      
      addTestResult({
        success: true,
        message: `Alle pending webhooks verwerkt: ${data?.successful || 0} succesvol`,
        details: data
      });
      
      toast({
        title: "Pending webhooks verwerkt",
        description: `${data?.successful || 0} webhooks succesvol verzonden naar n8n`,
      });
      
    } catch (error) {
      console.error('Process all pending error:', error);
      addTestResult({
        success: false,
        message: `Fout bij verwerken pending webhooks: ${error}`,
      });
      toast({
        title: "Fout bij verwerken",
        description: "Kon pending webhooks niet verwerken",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const testCustomWebhook = async () => {
    if (!customUrl) {
      toast({
        title: "URL vereist",
        description: "Voer een webhook URL in om te testen",
        variant: "destructive",
      });
      return;
    }

    try {
      setTesting(true);
      
      let payload;
      if (customPayload) {
        try {
          payload = JSON.parse(customPayload);
        } catch (e) {
          throw new Error('Invalid JSON payload');
        }
      } else {
        payload = {
          event_type: 'test.custom',
          test: true,
          timestamp: new Date().toISOString(),
          calendar_id: calendarId,
          source: 'webhook-testing-panel'
        };
      }
      
      const response = await fetch(customUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Brand-Evolves-Webhook-Test/1.0',
          'X-Webhook-Test': 'true',
        },
        body: JSON.stringify(payload)
      });
      
      const responseText = await response.text();
      
      addTestResult({
        success: response.ok,
        message: `Custom webhook test - Status: ${response.status}`,
        details: { 
          status: response.status,
          response: responseText.substring(0, 200),
          url: customUrl
        }
      });
      
      if (response.ok) {
        toast({
          title: "Custom webhook test succesvol",
          description: `Status: ${response.status}`,
        });
      } else {
        toast({
          title: "Custom webhook test gefaald",
          description: `HTTP ${response.status}: ${response.statusText}`,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Custom webhook test error:', error);
      addTestResult({
        success: false,
        message: `Custom webhook test gefaald: ${error}`,
      });
      toast({
        title: "Custom webhook test fout",
        description: `${error}`,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Enhanced Webhook Testing Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={testDatabaseTrigger}
            disabled={testing}
            variant="outline"
            className="h-16 flex flex-col items-center justify-center"
          >
            <Play className="w-5 h-5 mb-1" />
            Test Database Trigger
          </Button>
          
          <Button
            onClick={testEdgeFunctionProcessing}
            disabled={testing}
            variant="outline"
            className="h-16 flex flex-col items-center justify-center"
          >
            <Zap className="w-5 h-5 mb-1" />
            Test Edge Function
          </Button>
          
          <Button
            onClick={processAllPendingWebhooks}
            disabled={testing}
            variant="secondary"
            className="h-16 flex flex-col items-center justify-center"
          >
            <Rocket className="w-5 h-5 mb-1" />
            Process All Pending
          </Button>
          
          <Button
            onClick={testEndToEndFlow}
            disabled={testing}
            variant="default"
            className="h-16 flex flex-col items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <TestTube className="w-5 h-5 mb-1" />
            {testing ? 'Testing...' : 'End-to-End Test'}
          </Button>
        </div>

        {/* Custom Webhook Test */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium">Custom Webhook Test</h4>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="webhook-payload">Custom Payload (optional JSON)</Label>
            <Textarea
              id="webhook-payload"
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder='{"custom": "payload"}'
              rows={4}
            />
          </div>
          
          <Button
            onClick={testCustomWebhook}
            disabled={testing || !customUrl}
            variant="outline"
          >
            <Play className="w-4 h-4 mr-2" />
            Test Custom Webhook
          </Button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Enhanced Test Results</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString('nl-NL')}
                    </span>
                  </div>
                  
                  <p className="text-sm mb-2">{result.message}</p>
                  
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500">Enhanced Details</summary>
                      <pre className="mt-1 p-2 bg-gray-50 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
