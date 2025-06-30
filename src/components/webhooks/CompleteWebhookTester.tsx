
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, CheckCircle, AlertTriangle, Clock, Zap } from 'lucide-react';

interface CompleteWebhookTesterProps {
  calendarId: string;
}

interface TestStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: any;
}

export function CompleteWebhookTester({ calendarId }: CompleteWebhookTesterProps) {
  const [testing, setTesting] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const { toast } = useToast();

  const updateStep = (stepId: string, updates: Partial<TestStep>) => {
    setTestSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const runCompleteTest = async () => {
    setTesting(true);
    
    const steps: TestStep[] = [
      { id: 'setup', name: 'Test Setup', status: 'pending' },
      { id: 'booking', name: 'Create Test Booking', status: 'pending' },
      { id: 'trigger', name: 'Database Trigger', status: 'pending' },
      { id: 'webhook', name: 'Webhook Event Created', status: 'pending' },
      { id: 'processing', name: 'Edge Function Processing', status: 'pending' },
      { id: 'delivery', name: 'n8n Webhook Delivery', status: 'pending' },
      { id: 'cleanup', name: 'Test Cleanup', status: 'pending' }
    ];
    
    setTestSteps(steps);

    try {
      // Step 1: Setup
      updateStep('setup', { status: 'running' });
      
      // Check webhook endpoints
      const { data: endpoints, error: endpointError } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('is_active', true);

      if (endpointError) throw endpointError;

      if (!endpoints || endpoints.length === 0) {
        updateStep('setup', { 
          status: 'error', 
          message: 'Geen actieve webhook endpoints gevonden' 
        });
        toast({
          title: "Setup Error",
          description: "Er zijn geen actieve webhook endpoints geconfigureerd",
          variant: "destructive",
        });
        return;
      }

      updateStep('setup', { 
        status: 'success', 
        message: `${endpoints.length} actieve endpoint(s) gevonden`,
        details: { endpoints: endpoints.map(e => e.webhook_url) }
      });

      // Step 2: Create test booking
      updateStep('booking', { status: 'running' });
      
      const testBooking = {
        calendar_id: calendarId,
        customer_name: 'Complete Flow Test',
        customer_email: 'webhook-test@brandevolves.app',
        customer_phone: '+31612345999',
        start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        service_name: 'Complete Webhook Test Service',
        notes: 'END-TO-END webhook test booking'
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(testBooking)
        .select()
        .single();

      if (bookingError) throw bookingError;

      updateStep('booking', { 
        status: 'success', 
        message: 'Test booking succesvol aangemaakt',
        details: { booking_id: booking.id }
      });

      // Step 3: Wait for and verify trigger
      updateStep('trigger', { status: 'running' });
      
      // Wait 3 seconds for trigger to fire
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if webhook event was created
      const { data: webhookEvents, error: webhookError } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('event_type', 'booking.created')
        .gte('created_at', new Date(Date.now() - 10000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (webhookError) throw webhookError;

      if (!webhookEvents || webhookEvents.length === 0) {
        updateStep('trigger', { 
          status: 'error', 
          message: 'Database trigger werkt NIET - geen webhook event aangemaakt' 
        });
        throw new Error('Database trigger failed - no webhook event created');
      }

      const webhookEvent = webhookEvents[0];
      const payload = webhookEvent.payload as any;
      const triggerSource = payload?.trigger_source || 'unknown';

      updateStep('trigger', { 
        status: 'success', 
        message: 'Database trigger werkt perfect!',
        details: {
          webhook_event_id: webhookEvent.id,
          trigger_source: triggerSource,
          payload_preview: {
            event_type: payload?.event_type,
            booking_id: payload?.booking_id,
            customer_name: payload?.customer_name
          }
        }
      });

      updateStep('webhook', { 
        status: 'success', 
        message: 'Webhook event succesvol aangemaakt',
        details: { 
          event_id: webhookEvent.id,
          status: webhookEvent.status,
          attempts: webhookEvent.attempts
        }
      });

      // Step 4: Process webhooks
      updateStep('processing', { status: 'running' });

      const { data: processResult, error: processError } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'complete-flow-test',
          calendar_id: calendarId,
          timestamp: new Date().toISOString()
        }
      });

      if (processError) throw processError;

      updateStep('processing', { 
        status: 'success', 
        message: `Edge Function verwerkt: ${processResult?.processed || 0} webhooks`,
        details: {
          processed: processResult?.processed || 0,
          successful: processResult?.successful || 0,
          failed: processResult?.failed || 0
        }
      });

      // Step 5: Verify delivery
      updateStep('delivery', { status: 'running' });
      
      // Wait a bit more for webhook delivery
      await new Promise(resolve => setTimeout(resolve, 5000));

      const { data: finalStatus, error: statusError } = await supabase
        .from('webhook_events')
        .select('status, attempts, last_attempt_at')
        .eq('id', webhookEvent.id)
        .single();

      if (statusError) throw statusError;

      const deliverySuccess = finalStatus.status === 'sent';

      updateStep('delivery', { 
        status: deliverySuccess ? 'success' : 'error',
        message: deliverySuccess 
          ? 'Webhook succesvol afgeleverd aan n8n!' 
          : `Webhook delivery failed - Status: ${finalStatus.status}`,
        details: {
          final_status: finalStatus.status,
          attempts: finalStatus.attempts,
          last_attempt: finalStatus.last_attempt_at
        }
      });

      // Step 6: Cleanup
      updateStep('cleanup', { status: 'running' });

      await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      updateStep('cleanup', { 
        status: 'success', 
        message: 'Test booking opgeruimd' 
      });

      // Final results
      const overallSuccess = deliverySuccess;
      
      toast({
        title: overallSuccess ? "🎉 Complete Flow Test SUCCESVOL!" : "⚠️ Flow Test Voltooid",
        description: overallSuccess 
          ? "Volledige webhook pipeline werkt perfect van database naar n8n!"
          : "Test voltooid - controleer details voor eventuele problemen",
        variant: overallSuccess ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Complete flow test error:', error);
      
      // Update current running step as error
      const runningStep = testSteps.find(s => s.status === 'running');
      if (runningStep) {
        updateStep(runningStep.id, { 
          status: 'error', 
          message: `Error: ${error}` 
        });
      }
      
      toast({
        title: "Complete Flow Test Failed",
        description: `Test gefaald: ${error}`,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const getStepIcon = (step: TestStep) => {
    switch (step.status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Zap className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepBadge = (step: TestStep) => {
    switch (step.status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Complete Webhook Flow Tester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <Button
            onClick={runCompleteTest}
            disabled={testing}
            size="lg"
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {testing ? 'Test loopt...' : 'Start Complete Flow Test'}
          </Button>
        </div>

        {testSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Voortgang:</h4>
            {testSteps.map((step) => (
              <div
                key={step.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start gap-3 flex-1">
                  {getStepIcon(step)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{step.name}</span>
                      {getStepBadge(step)}
                    </div>
                    {step.message && (
                      <p className="text-sm text-gray-600">{step.message}</p>
                    )}
                    {step.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Details
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(step.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
