
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Play } from 'lucide-react';
import { BulkProcessingResults } from '../types/webhookTypes';

interface BulkProcessorProps {
  calendarId: string;
  onResultsUpdate: (results: BulkProcessingResults) => void;
}

export function BulkProcessor({ calendarId, onResultsUpdate }: BulkProcessorProps) {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const processAllBookings = async () => {
    setProcessing(true);

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
          // Enhanced webhook payload with ALL booking table columns
          const webhookPayload = {
            event_type: 'booking.created',
            booking_id: booking.id,
            calendar_id: booking.calendar_id,
            service_type_id: booking.service_type_id,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            customer_phone: booking.customer_phone,
            service_name: booking.service_name,
            start_time: booking.start_time,
            end_time: booking.end_time,
            status: booking.status,
            notes: booking.notes,
            internal_notes: booking.internal_notes,
            total_price: booking.total_price,
            confirmation_token: booking.confirmation_token,
            confirmed_at: booking.confirmed_at,
            cancelled_at: booking.cancelled_at,
            cancellation_reason: booking.cancellation_reason,
            booking_duration: booking.booking_duration,
            business_name: booking.business_name,
            calender_name: booking.calender_name,
            session_id: booking.session_id,
            created_at: booking.created_at,
            updated_at: booking.updated_at,
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

      onResultsUpdate(results);

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

  return (
    <Button
      onClick={processAllBookings}
      disabled={processing}
      size="lg"
      className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
    >
      <Play className="w-4 h-4 mr-2" />
      {processing ? 'Verwerking bezig...' : 'Verwerk Alle Bookings'}
    </Button>
  );
}
