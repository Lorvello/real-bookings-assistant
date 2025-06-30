
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { source, calendar_id, force, test } = await req.json()
    
    console.log(`🚀 Processing webhooks - Source: ${source}, Calendar: ${calendar_id}, Force: ${force}, Test: ${test}`)

    // Haal pending webhook events op
    let query = supabaseClient
      .from('webhook_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50)

    if (calendar_id && !force) {
      query = query.eq('calendar_id', calendar_id)
    }

    const { data: webhookEvents, error: webhookError } = await query

    if (webhookError) {
      console.error('❌ Error fetching webhook events:', webhookError)
      throw webhookError
    }

    if (!webhookEvents || webhookEvents.length === 0) {
      console.log('✅ No pending webhook events to process')
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          successful: 0,
          message: 'No pending webhooks' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📤 Processing ${webhookEvents.length} webhook events...`)

    let processedCount = 0
    let successfulCount = 0

    // Verwerk elke webhook event
    for (const webhookEvent of webhookEvents) {
      try {
        // Haal actieve webhook endpoints op voor deze calendar
        const { data: endpoints, error: endpointError } = await supabaseClient
          .from('webhook_endpoints')
          .select('*')
          .eq('calendar_id', webhookEvent.calendar_id)
          .eq('is_active', true)

        if (endpointError) {
          console.error('❌ Error fetching endpoints:', endpointError)
          continue
        }

        if (!endpoints || endpoints.length === 0) {
          console.log(`⚠️ No active endpoints for calendar ${webhookEvent.calendar_id}`)
          
          // Mark as failed - no endpoints
          await supabaseClient
            .from('webhook_events')
            .update({
              status: 'failed',
              attempts: (webhookEvent.attempts || 0) + 1,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', webhookEvent.id)
          
          processedCount++
          continue
        }

        // Verstuur naar elke actieve endpoint
        for (const endpoint of endpoints) {
          try {
            console.log(`📡 Sending webhook to: ${endpoint.webhook_url}`)
            
            const webhookPayload = {
              ...webhookEvent.payload,
              webhook_event_id: webhookEvent.id,
              delivered_at: new Date().toISOString(),
              source: 'brand-evolves-webhook'
            }

            const response = await fetch(endpoint.webhook_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Brand-Evolves-Webhook/1.0',
                'X-Webhook-Source': 'supabase-edge-function'
              },
              body: JSON.stringify(webhookPayload)
            })

            if (response.ok) {
              console.log(`✅ Webhook sent successfully to ${endpoint.webhook_url}`)
              
              // Mark as sent
              await supabaseClient
                .from('webhook_events')
                .update({
                  status: 'sent',
                  attempts: (webhookEvent.attempts || 0) + 1,
                  last_attempt_at: new Date().toISOString()
                })
                .eq('id', webhookEvent.id)
              
              successfulCount++
            } else {
              console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`)
              const responseText = await response.text()
              console.error(`Response: ${responseText}`)
              
              // Mark as failed
              await supabaseClient
                .from('webhook_events')
                .update({
                  status: 'failed',
                  attempts: (webhookEvent.attempts || 0) + 1,
                  last_attempt_at: new Date().toISOString()
                })
                .eq('id', webhookEvent.id)
            }
          } catch (fetchError) {
            console.error(`❌ Network error sending webhook:`, fetchError)
            
            // Mark as failed
            await supabaseClient
              .from('webhook_events')
              .update({
                status: 'failed',
                attempts: (webhookEvent.attempts || 0) + 1,
                last_attempt_at: new Date().toISOString()
              })
              .eq('id', webhookEvent.id)
          }
        }

        processedCount++

      } catch (error) {
        console.error(`❌ Error processing webhook ${webhookEvent.id}:`, error)
        processedCount++
      }
    }

    const result = {
      success: true,
      processed: processedCount,
      successful: successfulCount,
      failed: processedCount - successfulCount,
      source,
      timestamp: new Date().toISOString()
    }

    console.log(`🎉 Webhook processing complete:`, result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error in process-webhooks function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
