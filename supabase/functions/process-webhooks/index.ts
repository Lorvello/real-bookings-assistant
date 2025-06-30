
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

    console.log('🚀 Processing webhook queue...');

    // Fetch pending webhook events with detailed booking information
    const { data: events, error: fetchError } = await supabase
      .from('webhook_events')
      .select(`
        *,
        webhook_endpoints!inner(webhook_url, is_active)
      `)
      .eq('status', 'pending')
      .eq('webhook_endpoints.is_active', true)
      .limit(10)

    if (fetchError) {
      console.error('Error fetching webhook events:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch webhook events' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const results = []

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
            webhook_url: event.webhook_endpoints.webhook_url
          }
        };

        // Send webhook to n8n
        const response = await fetch(event.webhook_endpoints.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Brand-Evolves-Webhook/1.0',
            'X-Webhook-Event': event.event_type,
            'X-Webhook-ID': event.id,
          },
          body: JSON.stringify(webhookPayload)
        })

        const success = response.ok
        const attempts = event.attempts + 1

        if (success) {
          console.log(`✅ Webhook ${event.id} delivered successfully`);
          
          // Update webhook event status to sent
          await supabase
            .from('webhook_events')
            .update({
              status: 'sent',
              attempts: attempts,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', event.id)

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
                response_status: response.status
              },
              status: 'sent'
            })

        } else {
          console.error(`❌ Webhook ${event.id} failed with status ${response.status}`);
          
          await supabase
            .from('webhook_events')
            .update({
              status: 'failed',
              attempts: attempts,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', event.id)
        }

        results.push({
          event_id: event.id,
          success,
          status: response.status,
          attempts,
          webhook_url: event.webhook_endpoints.webhook_url
        })

      } catch (error) {
        console.error(`💥 Error sending webhook ${event.id}:`, error)
        
        // Update failed attempt
        await supabase
          .from('webhook_events')
          .update({
            status: 'failed',
            attempts: event.attempts + 1,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', event.id)

        results.push({
          event_id: event.id,
          success: false,
          error: error.message,
          attempts: event.attempts + 1
        })
      }
    }

    console.log(`🎯 Processed ${results.length} webhook events`);

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Error in webhook processor:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
