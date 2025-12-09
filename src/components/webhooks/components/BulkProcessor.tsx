
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
      console.log('🚀 Starting enhanced bulk webhook processing with complete booking data...');

      // Stap 1: Link bestaande WhatsApp conversations
      console.log('🔗 Linking existing WhatsApp conversations...');
      const { error: linkError } = await supabase.rpc('link_existing_whatsapp_conversations');
      if (linkError) {
        console.error('Warning: Could not link existing conversations:', linkError);
      }

      // Stap 2: Haal alle bookings op met complete data
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          service_types (
            id, name, description, duration, price, color,
            preparation_time, cleanup_time, max_attendees
          ),
          calendars!inner (
            id, name, slug, user_id,
            users!inner (
              business_name
            )
          )
        `)
        .eq('calendar_id', calendarId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      console.log(`📊 Found ${allBookings?.length || 0} total bookings with complete data`);

      // Stap 3: Check bestaande webhook events
      const { data: existingWebhooks } = await supabase
        .from('webhook_events')
        .select('id, payload')
        .eq('calendar_id', calendarId);

      const existingBookingIds = new Set(
        existingWebhooks?.map(w => {
          const payload = w.payload as any;
          return payload?.booking_id;
        }).filter(Boolean) || []
      );

      // Stap 4: Find bookings without webhooks OR regenerate all for complete data
      const bookingsToProcess = allBookings || [];
      console.log(`🔍 Processing all ${bookingsToProcess.length} bookings with enhanced session_id lookup`);

      let webhooksCreated = 0;

      // Stap 5: Create enhanced webhook events for all bookings
      for (const booking of bookingsToProcess) {
        try {
          // Enhanced session_id lookup via multiple strategies
          let sessionId = null;
          
          // Strategy 1: Via booking_intents - get conversation id
          if (booking.customer_phone) {
            const { data: intentData } = await supabase
              .from('booking_intents')
              .select(`
                id,
                conversation_id
              `)
              .eq('booking_id', booking.id)
              .single();

            if (intentData?.conversation_id) {
              sessionId = `conv_${intentData.conversation_id}`;
              console.log(`✅ Found conversation via booking_intent for booking ${booking.id}: ${sessionId}`);
            }
          }

          // Strategy 2: Direct phone lookup if no session_id found
          if (!sessionId && booking.customer_phone) {
            // Get contact IDs for phone lookup
            const { data: contactIds } = await supabase
              .from('whatsapp_contacts')
              .select('id')
              .eq('phone_number', booking.customer_phone);

            if (contactIds && contactIds.length > 0) {
              const contactIdList = contactIds.map(c => c.id);
              
              const { data: conversationData } = await supabase
                .from('whatsapp_conversations')
                .select('id')
                .eq('calendar_id', calendarId)
                .in('contact_id', contactIdList)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              if (conversationData?.id) {
                sessionId = `conv_${conversationData.id}`;
                console.log(`✅ Found conversation via phone lookup for booking ${booking.id}: ${sessionId}`);
              }
            }
          }

          // Strategy 3: Create session_id if still missing
          if (!sessionId && booking.customer_phone) {
            // Create or get WhatsApp contact
            const { data: contact, error: contactError } = await supabase
              .from('whatsapp_contacts')
              .upsert(
                { 
                  phone_number: booking.customer_phone,
                  display_name: booking.customer_name 
                },
                { onConflict: 'phone_number' }
              )
              .select('id')
              .single();

            if (!contactError && contact) {
              // Create or update conversation
              const { data: newConv, error: convError } = await supabase
                .from('whatsapp_conversations')
                .upsert(
                  {
                    contact_id: contact.id,
                    calendar_id: calendarId,
                    status: 'active'
                  },
                  { onConflict: 'calendar_id,contact_id' }
                )
                .select('id')
                .single();

              if (!convError && newConv) {
                sessionId = `conv_${newConv.id}`;
                console.log(`✅ Created new conversation for booking ${booking.id}: ${sessionId}`);
              }
            }
          }

          // Enhanced webhook payload met ALLE booking kolommen + session_id
          const webhookPayload = {
            event_type: 'booking.created',
            booking_id: booking.id,
            calendar_id: booking.calendar_id,
            calendar_slug: booking.calendars?.slug,
            calendar_name: booking.calendars?.name,
            business_name: booking.calendars?.users?.business_name || booking.business_name,
            service_type_id: booking.service_type_id,
            customer_name: booking.customer_name,
            customer_email: booking.customer_email,
            customer_phone: booking.customer_phone,
            service_name: booking.service_name || booking.service_types?.name,
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
            calender_name: booking.calender_name,
            session_id: sessionId,
            created_at: booking.created_at,
            updated_at: booking.updated_at,
            // Service type details
            service_type_data: booking.service_types ? {
              service_type_id: booking.service_types.id,
              service_type_name: booking.service_types.name,
              service_type_description: booking.service_types.description,
              service_type_duration: booking.service_types.duration,
              service_type_price: booking.service_types.price,
              service_type_color: booking.service_types.color,
              service_type_preparation_time: booking.service_types.preparation_time,
              service_type_cleanup_time: booking.service_types.cleanup_time,
              service_type_max_attendees: booking.service_types.max_attendees
            } : null,
            timestamp: new Date().toISOString(),
            trigger_source: 'bulk_processor_enhanced',
            session_id_strategy: sessionId ? 'found_or_created' : 'not_available',
            complete_booking_data: true
          };

          // Delete existing webhook for this booking to avoid duplicates
          await supabase
            .from('webhook_events')
            .delete()
            .eq('calendar_id', calendarId)
            .like('payload->booking_id', `"${booking.id}"`);

          // Insert new enhanced webhook event
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
            console.log(`✅ Created enhanced webhook for booking ${booking.id} with session_id: ${sessionId || 'none'}`);
          }
        } catch (error) {
          console.error(`💥 Error processing booking ${booking.id}:`, error);
        }
      }

      // Stap 6: Process alle pending webhooks met enhanced processor
      console.log('📤 Processing all webhook events with enhanced data...');
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-webhooks', {
        body: { 
          source: 'bulk-processor-enhanced',
          calendar_id: calendarId,
          timestamp: new Date().toISOString(),
          force_process: true,
          enhanced_data: true
        }
      });

      if (processError) {
        console.error('❌ Error processing webhooks:', processError);
        throw processError;
      }

      console.log('✅ Enhanced bulk processing complete:', processResult);

      // Stap 7: Get final status
      const { data: finalPendingWebhooks } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('status', 'pending');

      const results = {
        totalBookings: allBookings?.length || 0,
        webhooksCreated,
        webhooksSent: processResult?.successful || 0,
        pendingWebhooks: finalPendingWebhooks?.length || 0
      };

      onResultsUpdate(results);

      toast({
        title: "Enhanced bulk processing voltooid!",
        description: `Alle ${results.totalBookings} bookings verwerkt met complete data en session_id lookup. ${results.webhooksSent} webhooks succesvol verzonden.`,
      });

    } catch (error) {
      console.error('💥 Enhanced bulk processing error:', error);
      toast({
        title: "Enhanced bulk processing gefaald",
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
      {processing ? 'Enhanced Processing...' : 'Enhanced Bulk Process'}
    </Button>
  );
}
