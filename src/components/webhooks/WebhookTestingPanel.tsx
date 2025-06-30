
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TestTube, Play, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

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
    }, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const testDatabaseTrigger = async () => {
    try {
      setTesting(true);
      
      // Create a test booking to trigger the database trigger
      const testBooking = {
        calendar_id: calendarId,
        customer_name: 'Trigger Test Customer',
        customer_email: 'trigger-test@example.com',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        notes: 'Database trigger test booking'
      };
      
      const { data, error } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single();
      
      if (error) throw error;
      
      // Check if webhook event was created
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const { data: webhookEvents, error: webhookError } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('event_type', 'booking.created')
        .gte('created_at', new Date(Date.now() - 5000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (webhookError) throw webhookError;
      
      // Clean up test booking
      await supabase
        .from('bookings')
        .delete()
        .eq('id', data.id);
      
      if (webhookEvents && webhookEvents.length > 0) {
        addTestResult({
          success: true,
          message: 'Database trigger werkt correct',
          details: { booking_id: data.id, webhook_event_id: webhookEvents[0].id }
        });
        toast({
          title: "Trigger test succesvol",
          description: "Database trigger creëert correct webhook events",
        });
      } else {
        addTestResult({
          success: false,
          message: 'Database trigger werkt NIET - geen webhook event aangemaakt',
          details: { booking_id: data.id }
        });
        toast({
          title: "Trigger test gefaald",
          description: "Database trigger creëert geen webhook events",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Trigger test error:', error);
      addTestResult({
        success: false,
        message: `Trigger test gefaald: ${error}`,
      });
      toast({
        title: "Trigger test fout",
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
          source: 'test-panel',
          calendar_id: calendarId,
          test: true,
          timestamp: new Date().toISOString()
        }
      });
      
      if (error) throw error;
      
      addTestResult({
        success: true,
        message: 'Edge Function werkt correct',
        details: data
      });
      
      toast({
        title: "Edge Function test succesvol",
        description: `Processed: ${data?.processed || 0}, Successful: ${data?.successful || 0}`,
      });
      
    } catch (error) {
      console.error('Edge Function test error:', error);
      addTestResult({
        success: false,
        message: `Edge Function test gefaald: ${error}`,
      });
      toast({
        title: "Edge Function test gefaald",
        description: "Kon Edge Function niet testen",
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

  const runFullSystemTest = async () => {
    try {
      setTesting(true);
      
      toast({
        title: "Full system test gestart",
        description: "Testing database trigger → Edge Function → n8n webhook",
      });
      
      // Test 1: Database trigger
      await testDatabaseTrigger();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test 2: Edge Function processing
      await testEdgeFunctionProcessing();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addTestResult({
        success: true,
        message: 'Full system test voltooid - check individuele resultaten hierboven',
      });
      
      toast({
        title: "Full system test voltooid",
        description: "Check de test resultaten voor details",
      });
      
    } catch (error) {
      addTestResult({
        success: false,
        message: `Full system test gefaald: ${error}`,
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
          Webhook Testing Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Buttons */}
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
            onClick={runFullSystemTest}
            disabled={testing}
            variant="default"
            className="h-16 flex flex-col items-center justify-center md:col-span-2"
          >
            <TestTube className="w-5 h-5 mb-1" />
            {testing ? 'Testing...' : 'Full System Test'}
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
            <h4 className="font-medium">Test Results</h4>
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
                      <summary className="cursor-pointer text-gray-500">Details</summary>
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
