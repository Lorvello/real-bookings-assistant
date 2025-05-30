
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
      console.log('[sync-calendar-events] Unauthorized - no user found')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    console.log(`[sync-calendar-events] Starting sync for user: ${user.user.id}`)

    // Get user's active calendar connections
    const { data: connections, error: connectionsError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('is_active', true)
      .neq('provider_account_id', 'pending')

    if (connectionsError) {
      console.error('[sync-calendar-events] Error fetching connections:', connectionsError)
      return new Response(
        JSON.stringify({ error: connectionsError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[sync-calendar-events] Found ${connections.length} active connections`)

    if (connections.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active calendar connections found',
          syncResults: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const syncResults = []

    for (const connection of connections) {
      console.log(`[sync-calendar-events] Syncing ${connection.provider} calendar`)
      
      try {
        let events = []
        const now = new Date()
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        if (connection.provider === 'google') {
          console.log('[sync-calendar-events] Fetching Google Calendar events')
          
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${oneWeekFromNow.toISOString()}&singleEvents=true&orderBy=startTime`,
            {
              headers: { 
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': 'application/json'
              }
            }
          )

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`[sync-calendar-events] Google API error:`, response.status, errorText)
            throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`)
          }
          
          const data = await response.json()
          console.log(`[sync-calendar-events] Google API returned ${data.items?.length || 0} events`)
          
          if (data.items) {
            events = data.items.map((event: any) => ({
              external_event_id: event.id,
              title: event.summary || 'Bezet',
              start_time: event.start.dateTime || event.start.date,
              end_time: event.end.dateTime || event.end.date,
              is_busy: event.transparency !== 'transparent'
            }))
          }
        } else if (connection.provider === 'microsoft') {
          console.log('[sync-calendar-events] Fetching Microsoft Calendar events')
          
          const response = await fetch(
            `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${now.toISOString()}' and end/dateTime le '${oneWeekFromNow.toISOString()}'&$orderby=start/dateTime`,
            {
              headers: { 
                'Authorization': `Bearer ${connection.access_token}`,
                'Content-Type': 'application/json'
              }
            }
          )

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`[sync-calendar-events] Microsoft API error:`, response.status, errorText)
            throw new Error(`Microsoft Calendar API error: ${response.status} - ${errorText}`)
          }
          
          const data = await response.json()
          console.log(`[sync-calendar-events] Microsoft API returned ${data.value?.length || 0} events`)
          
          if (data.value) {
            events = data.value.map((event: any) => ({
              external_event_id: event.id,
              title: event.subject || 'Bezet',
              start_time: event.start.dateTime,
              end_time: event.end.dateTime,
              is_busy: event.showAs !== 'free'
            }))
          }
        }

        console.log(`[sync-calendar-events] Processing ${events.length} events for ${connection.provider}`)

        // Clear old events for this connection
        const { error: deleteError } = await supabase
          .from('calendar_events')
          .delete()
          .eq('calendar_connection_id', connection.id)

        if (deleteError) {
          console.error('[sync-calendar-events] Error deleting old events:', deleteError)
        } else {
          console.log(`[sync-calendar-events] Cleared old events for connection ${connection.id}`)
        }

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
            console.error('[sync-calendar-events] Error inserting events:', insertError)
            throw insertError
          } else {
            console.log(`[sync-calendar-events] Successfully inserted ${events.length} events`)
          }
        }

        syncResults.push({
          provider: connection.provider,
          events_synced: events.length,
          success: true,
          connection_id: connection.id
        })

      } catch (error) {
        console.error(`[sync-calendar-events] Error syncing ${connection.provider}:`, error)
        syncResults.push({
          provider: connection.provider,
          events_synced: 0,
          success: false,
          error: error.message,
          connection_id: connection.id
        })
      }
    }

    console.log(`[sync-calendar-events] Sync completed. Results:`, syncResults)

    return new Response(
      JSON.stringify({ 
        success: true, 
        syncResults,
        message: `Synced ${syncResults.reduce((total, result) => total + result.events_synced, 0)} events from ${syncResults.length} connections`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[sync-calendar-events] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
