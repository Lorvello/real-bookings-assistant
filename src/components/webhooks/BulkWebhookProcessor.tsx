import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, CheckCircle, AlertTriangle, Clock, Zap, RefreshCw } from 'lucide-react';

interface BulkWebhookProcessorProps {
  calendarId: string;
}

export function BulkWebhookProcessor({ calendarId }: BulkWebhookProcessorProps) {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{
    totalBookings: number;
    webhooksCreated: number;
    webhooksSent: number;
    pendingWebhooks: number;
  } | null>(null);
  const { toast } = useToast();

  const processAllBookings = async () => {
    setProcessing(true);
    setResults(null);

    try {
      console.log('🚀 Starting bulk webhook processing for all bookings...');

      // First, get all bookings for this calendar
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      console.log(`📊 Found ${allBookings?.length || 0} total bookings`);

      // Check which bookings already have webhook events
      const { data: existingWebhooks, error: webhookError } = await supabase
        .from('webhook_events')
        .select('id, payload')
        .eq('calendar_id', calendarId);

      if (webhookError) throw webhookError;

      // Extract booking IDs that already have webhooks
      const existingBookingIds = new Set(
        existingWebhooks?.map(w => {
          // Safely access booking_id from payload
          const payload = w.payload as any;
          return payload?.booking_id;
        }).filter(Boolean) || []
      );

      console.log(`📋 Found ${existingWebhooks?.length || 0} existing webhook events`);

      // Find bookings without webhook events
      const bookingsWithoutWebhooks = allBookings?.filter(
        booking => !existingBookingIds.has(booking.id)
      ) || [];

      console.log(`🔍 Found ${bookingsWithoutWebhooks.length} bookings without webhooks`);

      let webhooksCreated = 0;

      // Create webhook events for bookings that don't have them
      for (const booking of bookingsWithoutWebhooks) {
        try {
          const webhookPayload = {
            event_type: 'booking.created',
            booking_id: booking.id,
            calendar_id: booking.calendar_id,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            customer_phone: booking.customer_phone,
            service_name: booking.service_name,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: booking.status,
            notes: booking.notes,
            timestamp: new Date().toISOString(),
            trigger_source: 'bulk_processor'
          };

          const { error: insertError } = await supabase
            .from('webhook_events')
            .insert({
              calendar_id: booking.calendar_id,
              event_type: 'booking.created',
              payload: webhookPayload,
              status: 'pending'
            });

          if (insertError) {
            console.error(`❌ Failed to create webhook for booking ${booking.id}:`, insertError);
          } else {
            webhooksCreated++;
            console.log(`✅ Created webhook for booking ${booking.id}`);
          }
        } catch (error) {
          console.error(`💥 Error processing booking ${booking.id}:`, error);
        }
      }

      // Now process all pending webhooks
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'bulk-processor',
          calendar_id: calendarId,
          timestamp: new Date().toISOString(),
          force_process: true
        }
      });

      if (processError) {
        console.error('❌ Error processing webhooks:', processError);
        throw processError;
      }

      console.log('✅ Bulk processing complete:', processResult);

      // Get final status
      const { data: finalPendingWebhooks, error: finalError } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('status', 'pending');

      if (finalError) throw finalError;

      const results = {
        totalBookings: allBookings?.length || 0,
        webhooksCreated,
        webhooksSent: processResult?.successful || 0,
        pendingWebhooks: finalPendingWebhooks?.length || 0
      };

      setResults(results);

      toast({
        title: "Bulk processing voltooid!",
        description: `Alle ${results.totalBookings} bookings verwerkt. ${results.webhooksSent} webhooks succesvol verzonden.`,
      });

    } catch (error) {
      console.error('💥 Bulk processing error:', error);
      toast({
        title: "Bulk processing gefaald",
        description: `Fout: ${error}`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
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

        setResults({
          ...results,
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
          Bulk Webhook Processor
          <Badge className="bg-blue-100 text-blue-800">ALLE BOOKINGS</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          Verwerkt alle bookings in de database en stuurt ze naar n8n via webhooks.
        </div>

        <div className="flex gap-3">
          <Button
            onClick={processAllBookings}
            disabled={processing}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {processing ? 'Verwerking bezig...' : 'Verwerk Alle Bookings'}
          </Button>

          {results && results.pendingWebhooks > 0 && (
            <Button
              onClick={processPendingWebhooks}
              variant="outline"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Verwerk Pending ({results.pendingWebhooks})
            </Button>
          )}
        </div>

        {results && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{results.totalBookings}</div>
              <div className="text-sm text-gray-600">Totaal Bookings</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{results.webhooksCreated}</div>
              <div className="text-sm text-gray-600">Webhooks Aangemaakt</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{results.webhooksSent}</div>
              <div className="text-sm text-gray-600">Succesvol Verzonden</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{results.pendingWebhooks}</div>
              <div className="text-sm text-gray-600">Nog Pending</div>
            </div>
          </div>
        )}

        {results && results.pendingWebhooks === 0 && results.webhooksSent > 0 && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              Alle bookings zijn succesvol naar n8n gestuurd!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
