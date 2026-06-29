
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
    // Require an authenticated caller; event ownership is verified after fetch.
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

    // Get the specific webhook event. NOTE: webhook_events and webhook_endpoints have
    // NO direct FK (both only FK to calendars), so a PostgREST `webhook_endpoints!inner`
    // embed throws PGRST200 ("no relationship found") and made EVERY retry 404. Fetch the
    // event plainly, then resolve its active endpoint(s) by calendar_id (same pattern as
    // process-webhooks).
    const { data: event, error: fetchError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return new Response(
        JSON.stringify({ error: 'Webhook event not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the event belongs to a calendar owned by the caller
    const { data: ownedCalendar } = await authClient
      .from('calendars')
      .select('id')
      .eq('id', event.calendar_id)
      .eq('user_id', user.id)
      .single()
    if (!ownedCalendar) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resolve active endpoints for this event's calendar.
    const { data: endpoints } = await supabase
      .from('webhook_endpoints')
      .select('webhook_url, is_active')
      .eq('calendar_id', event.calendar_id)
      .eq('is_active', true)

    if (!endpoints || endpoints.length === 0) {
      // No active endpoint to deliver to: record a failed attempt so the row reflects
      // the retry, and tell the caller why.
      const attempts = (event.attempts || 0) + 1
      await supabase
        .from('webhook_events')
        .update({ status: 'failed', attempts, last_attempt_at: new Date().toISOString() })
        .eq('id', eventId)
      return new Response(
        JSON.stringify({ success: false, error: 'No active endpoint for this calendar', attempts }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Deliver to every active endpoint; success = at least one OK (mirrors process-webhooks).
      const results = await Promise.allSettled(endpoints.map((ep: { webhook_url: string }) =>
        fetch(ep.webhook_url, {
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
      ))

      // Prefer an OK endpoint's status; fall back to the first response, else 0.
      const okResult = results.find(r => r.status === 'fulfilled' && r.value.ok)
      const anyResult = results.find(r => r.status === 'fulfilled')
      const chosen = okResult ?? anyResult
      const response = {
        ok: !!okResult,
        status: (chosen && chosen.status === 'fulfilled') ? chosen.value.status : 0,
      }

      const success = response.ok
      const attempts = (event.attempts || 0) + 1

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
      const attempts = (event.attempts || 0) + 1
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          attempts,
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', eventId)

      return new Response(
        JSON.stringify({
          success: false,
          error: (error as Error)?.message,
          attempts
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
