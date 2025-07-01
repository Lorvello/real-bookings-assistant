
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Zap } from 'lucide-react';

// Import refactored components
import { BulkProcessor } from './components/BulkProcessor';
import { BookingRepair } from './components/BookingRepair';
import { WebhookResender } from './components/WebhookResender';
import { ProcessingResults } from './components/ProcessingResults';
import { BulkWebhookProcessorProps, BulkProcessingResults } from './types/webhookTypes';

export function BulkWebhookProcessor({ calendarId }: BulkWebhookProcessorProps) {
  const [results, setResults] = useState<BulkProcessingResults | null>(null);
  const { toast } = useToast();

  const updateResults = (newResults: Partial<BulkProcessingResults>) => {
    setResults(prev => prev ? { ...prev, ...newResults } : newResults as BulkProcessingResults);
  };

  const processPendingWebhooks = async () => {
    try {
      console.log('🔄 Processing pending webhooks...');

      const { data: processResult, error: processError } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'manual-pending-processor',
          calendar_id: calendarId,
          timestamp: new Date().toISOString()
        }
      });

      if (processError) throw processError;

      console.log('✅ Pending webhooks processed:', processResult);

      toast({
        title: "Pending webhooks verwerkt",
        description: `${processResult?.successful || 0} webhook(s) succesvol verzonden`,
      });

      // Refresh results
      if (results) {
        const { data: updatedPendingWebhooks } = await supabase
          .from('webhook_events')
          .select('id')
          .eq('calendar_id', calendarId)
          .eq('status', 'pending');

        updateResults({
          pendingWebhooks: updatedPendingWebhooks?.length || 0
        });
      }

    } catch (error) {
      console.error('💥 Error processing pending webhooks:', error);
      toast({
        title: "Fout bij verwerken",
        description: `Kon pending webhooks niet verwerken: ${error}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Enhanced Bulk Webhook Processor
          <Badge className="bg-blue-100 text-blue-800">ALLE BOOKING DATA</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          Verwerkt alle bookings inclusief session_id lookup en complete booking data naar n8n.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BulkProcessor calendarId={calendarId} onResultsUpdate={updateResults} />
          <BookingRepair calendarId={calendarId} onResultsUpdate={updateResults} />
          <WebhookResender calendarId={calendarId} />
        </div>

        {results && results.pendingWebhooks > 0 && (
          <Button
            onClick={processPendingWebhooks}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Verwerk Pending ({results.pendingWebhooks})
          </Button>
        )}

        {results && <ProcessingResults results={results} />}
      </CardContent>
    </Card>
  );
}
