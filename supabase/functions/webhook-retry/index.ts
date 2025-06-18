
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
    const { eventId } = await req.json()

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'Event ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the specific webhook event with endpoint
    const { data: event, error: fetchError } = await supabase
      .from('webhook_events')
      .select(`
        *,
        webhook_endpoints!inner(webhook_url, is_active)
      `)
      .eq('id', eventId)
      .eq('webhook_endpoints.is_active', true)
      .single()

    if (fetchError || !event) {
      return new Response(
        JSON.stringify({ error: 'Webhook event not found or endpoint inactive' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

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
          data: event.payload,
          retry: true
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
        .eq('id', eventId)

      return new Response(
        JSON.stringify({ 
          success,
          status: response.status,
          attempts
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (error) {
      console.error(`Error retrying webhook ${eventId}:`, error)
      
      // Update failed attempt
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          attempts: event.attempts + 1,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', eventId)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          attempts: event.attempts + 1
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error in webhook retry:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
