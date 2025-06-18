
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

    // Fetch pending webhook events
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
        // Send webhook to n8n
        const response = await fetch(event.webhook_endpoints.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CalendarApp-Webhook/1.0',
          },
          body: JSON.stringify({
            event_type: event.event_type,
            timestamp: event.created_at,
            data: event.payload
          })
        })

        const success = response.ok
        const attempts = event.attempts + 1

        // Update webhook event status
        await supabase
          .from('webhook_events')
          .update({
            status: success ? 'sent' : 'failed',
            attempts: attempts,
            last_attempt_at: new Date().toISOString()
          })
          .eq('id', event.id)

        results.push({
          event_id: event.id,
          success,
          status: response.status,
          attempts
        })

        console.log(`Webhook ${event.id}: ${success ? 'sent' : 'failed'} (${response.status})`)

      } catch (error) {
        console.error(`Error sending webhook ${event.id}:`, error)
        
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

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in webhook processor:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
