
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

    console.log('🚀 Starting enhanced webhook processing...');

    // Parse request body to get trigger info
    const requestBody = await req.text();
    let triggerInfo = {};
    
    try {
      if (requestBody) {
        triggerInfo = JSON.parse(requestBody);
        console.log('📨 Trigger info:', triggerInfo);
      }
    } catch (e) {
      console.log('📨 No trigger info provided, processing all pending webhooks');
    }

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
      .limit(100)

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

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          processed: 0,
          successful: 0,
          failed: 0,
          message: 'No pending webhooks to process',
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const results = []
    const processedEvents = []

    for (const event of events) {
      try {
        console.log(`📤 Processing webhook ${event.id} for ${event.event_type}`);
        
        // Enhanced payload with metadata
        const webhookPayload = {
          event_type: event.event_type,
          webhook_id: event.id,
          timestamp: event.created_at,
          ...event.payload,
          metadata: {
            source: 'Brand Evolves Calendar',
            version: '1.0',
            webhook_url: event.webhook_endpoints.webhook_url,
            attempts: event.attempts + 1,
            trigger_source: event.payload?.trigger_source || 'unknown'
          }
        };

        console.log(`🎯 Sending to: ${event.webhook_endpoints.webhook_url}`);
        console.log(`📦 Payload preview:`, {
          event_type: webhookPayload.event_type,
          booking_id: webhookPayload.booking_id,
          customer_name: webhookPayload.customer_name
        });

        // Send webhook to n8n with enhanced headers and timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(event.webhook_endpoints.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Brand-Evolves-Webhook/1.0',
            'X-Webhook-Event': event.event_type,
            'X-Webhook-ID': event.id,
            'X-Webhook-Timestamp': event.created_at,
            'X-Webhook-Attempt': (event.attempts + 1).toString(),
            'X-Calendar-ID': event.calendar_id,
          },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const success = response.ok
        const attempts = event.attempts + 1
        const responseText = await response.text();

        console.log(`📡 Response status: ${response.status}`);
        console.log(`📄 Response preview: ${responseText.substring(0, 200)}...`);

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
                response_body: responseText.substring(0, 1000),
                delivery_time_ms: Date.now() - new Date(event.created_at).getTime()
              },
              status: 'sent'
            });

          processedEvents.push(event.id);

        } else {
          console.error(`❌ Webhook ${event.id} failed with status ${response.status}: ${responseText.substring(0, 500)}`);
          
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
                attempts: attempts,
                will_retry: newStatus === 'pending'
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
          response_preview: responseText.substring(0, 200),
          event_type: event.event_type
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
              error_type: error.name,
              attempts: attempts,
              will_retry: newStatus === 'pending'
            },
            status: 'sent'
          });

        results.push({
          event_id: event.id,
          success: false,
          error: error.message,
          attempts: attempts,
          event_type: event.event_type
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`🎯 Processing complete: ${results.length} events processed`);
    console.log(`✅ Successfully sent: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failedCount,
        results,
        trigger_info: triggerInfo,
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
