
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('🚀 Starting webhook processing...');

    // Fetch pending webhook events with detailed booking information
    const { data: events, error: fetchError } = await supabase
      .from('webhook_events')
      .select(`
        *,
        webhook_endpoints!inner(webhook_url, is_active)
      `)
      .eq('status', 'pending')
      .eq('webhook_endpoints.is_active', true)
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error('❌ Error fetching webhook events:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch webhook events', details: fetchError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`📊 Found ${events?.length || 0} pending webhook events`);

    const results = []
    const processedEvents = []

    for (const event of events || []) {
      try {
        console.log(`📤 Processing webhook ${event.id} for ${event.event_type}`);
        
        // Enhanced payload with all booking details
        const webhookPayload = {
          event_type: event.event_type,
          webhook_id: event.id,
          timestamp: event.created_at,
          ...event.payload,
          metadata: {
            source: 'Brand Evolves Calendar',
            version: '1.0',
            webhook_url: event.webhook_endpoints.webhook_url,
            attempts: event.attempts + 1
          }
        };

        console.log(`🎯 Sending to: ${event.webhook_endpoints.webhook_url}`);
        console.log(`📦 Payload:`, JSON.stringify(webhookPayload, null, 2));

        // Send webhook to n8n with timeout and retry logic
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(event.webhook_endpoints.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Brand-Evolves-Webhook/1.0',
            'X-Webhook-Event': event.event_type,
            'X-Webhook-ID': event.id,
            'X-Webhook-Timestamp': event.created_at,
          },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const success = response.ok
        const attempts = event.attempts + 1
        const responseText = await response.text();

        console.log(`📡 Response status: ${response.status}`);
        console.log(`📄 Response body: ${responseText}`);

        if (success) {
          console.log(`✅ Webhook ${event.id} delivered successfully`);
          
          // Update webhook event status to sent
          const { error: updateError } = await supabase
            .from('webhook_events')
            .update({
              status: 'sent',
              attempts: attempts,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', event.id);

          if (updateError) {
            console.error(`❌ Error updating webhook status:`, updateError);
          }

          // Log successful delivery
          await supabase
            .from('webhook_events')
            .insert({
              calendar_id: event.calendar_id,
              event_type: 'webhook.delivered',
              payload: {
                webhook_url: event.webhook_endpoints.webhook_url,
                original_event: event.event_type,
                booking_id: event.payload?.booking_id,
                delivered_at: new Date().toISOString(),
                response_status: response.status,
                response_body: responseText.substring(0, 1000) // Limit response body length
              },
              status: 'sent'
            });

          processedEvents.push(event.id);

        } else {
          console.error(`❌ Webhook ${event.id} failed with status ${response.status}: ${responseText}`);
          
          const newStatus = attempts >= 3 ? 'failed' : 'pending';
          
          await supabase
            .from('webhook_events')
            .update({
              status: newStatus,
              attempts: attempts,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', event.id);

          // Log failure
          await supabase
            .from('webhook_events')
            .insert({
              calendar_id: event.calendar_id,
              event_type: 'webhook.failed',
              payload: {
                webhook_url: event.webhook_endpoints.webhook_url,
                original_event: event.event_type,
                booking_id: event.payload?.booking_id,
                failed_at: new Date().toISOString(),
                error_status: response.status,
                error_message: responseText.substring(0, 500),
                attempts: attempts
              },
              status: 'sent'
            });
        }

        results.push({
          event_id: event.id,
          success,
          status: response.status,
          attempts,
          webhook_url: event.webhook_endpoints.webhook_url,
          response_preview: responseText.substring(0, 200)
        });

      } catch (error) {
        console.error(`💥 Error sending webhook ${event.id}:`, error);
        
        const attempts = event.attempts + 1;
        const newStatus = attempts >= 3 ? 'failed' : 'pending';
        
        // Update failed attempt
        await supabase
          .from('webhook_events')
          .update({
            status: newStatus,
            attempts: attempts,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', event.id);

        // Log error
        await supabase
          .from('webhook_events')
          .insert({
            calendar_id: event.calendar_id,
            event_type: 'webhook.error',
            payload: {
              webhook_url: event.webhook_endpoints?.webhook_url || 'unknown',
              original_event: event.event_type,
              booking_id: event.payload?.booking_id,
              error_at: new Date().toISOString(),
              error_message: error.message,
              attempts: attempts
            },
            status: 'sent'
          });

        results.push({
          event_id: event.id,
          success: false,
          error: error.message,
          attempts: attempts
        });
      }
    }

    console.log(`🎯 Processed ${results.length} webhook events`);
    console.log(`✅ Successfully sent: ${results.filter(r => r.success).length}`);
    console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);

    // Notify real-time listeners about processing completion
    if (processedEvents.length > 0) {
      console.log('📢 Notifying real-time listeners...');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Critical error in webhook processor:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
