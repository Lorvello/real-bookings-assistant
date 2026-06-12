
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
    // Require an authenticated caller — the public anon key alone must not be able
    // to trigger platform-wide webhook delivery.
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { source, calendar_id, force, test } = await req.json()

    console.log(`🚀 Enhanced webhook processing - Source: ${source}, Calendar: ${calendar_id}, Force: ${force}, Test: ${test}`)

    // SECURITY: this is an owner-facing tool (webhook management UI). Scope every
    // run to the CALLER's own calendars. Without this, any authenticated user
    // could pass another tenant's calendar_id — or force:true (which previously
    // skipped the calendar filter) — to trigger delivery of OTHER businesses'
    // pending webhook events.
    const { data: userCals } = await supabaseClient
      .from('calendars')
      .select('id')
      .eq('user_id', user.id)
    const userCalendarIds = (userCals || []).map((c: { id: string }) => c.id)

    if (calendar_id && !userCalendarIds.includes(calendar_id)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Calendar not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Haal pending webhook events op met prioriteit voor nieuwe events
    let query = supabaseClient
      .from('webhook_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100) // Verhoogd van 50 naar 100 voor snellere batch processing

    if (calendar_id) {
      query = query.eq('calendar_id', calendar_id)
    } else {
      // No specific calendar (incl. force): still confined to the caller's own
      // calendars — never the whole platform.
      query = query.in('calendar_id', userCalendarIds.length > 0 ? userCalendarIds : ['00000000-0000-0000-0000-000000000000'])
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
    let failedCount = 0

    // Parallel processing voor snellere verwerking
    const webhookPromises = webhookEvents.map(async (webhookEvent) => {
      try {
        // Haal actieve webhook endpoints op voor deze calendar
        const { data: endpoints, error: endpointError } = await supabaseClient
          .from('webhook_endpoints')
          .select('*')
          .eq('calendar_id', webhookEvent.calendar_id)
          .eq('is_active', true)

        if (endpointError) {
          console.error('❌ Error fetching endpoints:', endpointError)
          throw endpointError
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
          
          return { success: false, reason: 'no_endpoints' }
        }

        // Verstuur naar elke actieve endpoint (parallel)
        const endpointPromises = endpoints.map(async (endpoint) => {
          try {
            console.log(`📡 Sending enhanced webhook to: ${endpoint.webhook_url}`)
            
            // Verrijkte webhook payload met meer context
            const enhancedPayload = {
              ...webhookEvent.payload,
              webhook_event_id: webhookEvent.id,
              delivered_at: new Date().toISOString(),
              source: 'brand-evolves-webhook-enhanced',
              delivery_attempt: (webhookEvent.attempts || 0) + 1,
              calendar_context: {
                webhook_url: endpoint.webhook_url,
                endpoint_id: endpoint.id
              }
            }

            const response = await fetch(endpoint.webhook_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Brand-Evolves-Webhook/2.0',
                'X-Webhook-Source': 'supabase-edge-function-enhanced',
                'X-Delivery-Attempt': String((webhookEvent.attempts || 0) + 1),
                'X-Event-Type': webhookEvent.event_type,
                'X-Calendar-ID': webhookEvent.calendar_id
              },
              body: JSON.stringify(enhancedPayload)
            })

            const responseText = await response.text()
            console.log(`📨 Response from ${endpoint.webhook_url}:`, response.status, responseText.substring(0, 100))

            if (response.ok) {
              console.log(`✅ Enhanced webhook sent successfully to ${endpoint.webhook_url}`)
              return { success: true, endpoint: endpoint.webhook_url }
            } else {
              console.error(`❌ Enhanced webhook failed: ${response.status} ${response.statusText}`)
              return { success: false, status: response.status, response: responseText }
            }
          } catch (fetchError) {
            console.error(`❌ Network error sending enhanced webhook:`, fetchError)
            return { success: false, error: fetchError.message }
          }
        })

        const endpointResults = await Promise.allSettled(endpointPromises)
        const successfulEndpoints = endpointResults.filter(result => 
          result.status === 'fulfilled' && result.value.success
        ).length

        if (successfulEndpoints > 0) {
          // Mark as sent if at least one endpoint succeeded
          await supabaseClient
            .from('webhook_events')
            .update({
              status: 'sent',
              attempts: (webhookEvent.attempts || 0) + 1,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', webhookEvent.id)
          
          return { success: true, endpoints_reached: successfulEndpoints }
        } else {
          // Mark as failed if all endpoints failed
          await supabaseClient
            .from('webhook_events')
            .update({
              status: 'failed',
              attempts: (webhookEvent.attempts || 0) + 1,
              last_attempt_at: new Date().toISOString()
            })
            .eq('id', webhookEvent.id)
          
          return { success: false, reason: 'all_endpoints_failed' }
        }

      } catch (error) {
        console.error(`❌ Error processing enhanced webhook ${webhookEvent.id}:`, error)
        
        // Mark as failed
        await supabaseClient
          .from('webhook_events')
          .update({
            status: 'failed',
            attempts: (webhookEvent.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', webhookEvent.id)
        
        return { success: false, error: error.message }
      }
    })

    // Wait for all webhook processing to complete
    const results = await Promise.allSettled(webhookPromises)
    
    // Count results
    results.forEach(result => {
      processedCount++
      if (result.status === 'fulfilled' && result.value.success) {
        successfulCount++
      } else {
        failedCount++
      }
    })

    const finalResult = {
      success: true,
      processed: processedCount,
      successful: successfulCount,
      failed: failedCount,
      source,
      enhanced: true,
      timestamp: new Date().toISOString(),
      batch_size: webhookEvents.length
    }

    console.log(`🎉 Enhanced webhook processing complete:`, finalResult)

    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Error in enhanced process-webhooks function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        enhanced: true,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
