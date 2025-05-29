
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabase.auth.getUser(token)

    if (!user.user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Get user's calendar connections
    const { data: connections, error: connectionsError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('is_active', true)

    if (connectionsError) {
      return new Response(
        JSON.stringify({ error: connectionsError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const syncResults = []

    for (const connection of connections) {
      try {
        let events = []
        const now = new Date()
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        if (connection.provider === 'google') {
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneWeekFromNow.toISOString()}&singleEvents=true&orderBy=startTime`,
            {
              headers: { Authorization: `Bearer ${connection.access_token}` }
            }
          )
          const data = await response.json()
          
          if (data.items) {
            events = data.items.map((event: any) => ({
              external_event_id: event.id,
              title: event.summary || 'Busy',
              start_time: event.start.dateTime || event.start.date,
              end_time: event.end.dateTime || event.end.date,
              is_busy: event.transparency !== 'transparent'
            }))
          }
        } else if (connection.provider === 'microsoft') {
          const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${now.toISOString()}' and end/dateTime le '${oneWeekFromNow.toISOString()}'&$orderby=start/dateTime`,
            {
              headers: { Authorization: `Bearer ${connection.access_token}` }
            }
          )
          const data = await response.json()
          
          if (data.value) {
            events = data.value.map((event: any) => ({
              external_event_id: event.id,
              title: event.subject || 'Busy',
              start_time: event.start.dateTime,
              end_time: event.end.dateTime,
              is_busy: event.showAs !== 'free'
            }))
          }
        }

        // Clear old events for this connection
        await supabase
          .from('calendar_events')
          .delete()
          .eq('calendar_connection_id', connection.id)

        // Insert new events
        if (events.length > 0) {
          const eventsToInsert = events.map(event => ({
            user_id: user.user.id,
            calendar_connection_id: connection.id,
            external_event_id: event.external_event_id,
            title: event.title,
            start_time: event.start_time,
            end_time: event.end_time,
            is_busy: event.is_busy,
            last_synced_at: new Date().toISOString()
          }))

          const { error: insertError } = await supabase
            .from('calendar_events')
            .insert(eventsToInsert)

          if (insertError) {
            console.error('Error inserting events:', insertError)
          }
        }

        syncResults.push({
          provider: connection.provider,
          events_synced: events.length,
          success: true
        })

      } catch (error) {
        console.error(`Error syncing ${connection.provider}:`, error)
        syncResults.push({
          provider: connection.provider,
          events_synced: 0,
          success: false,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ syncResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
