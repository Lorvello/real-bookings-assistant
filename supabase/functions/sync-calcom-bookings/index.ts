
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

    const { user_id } = await req.json()
    const targetUserId = user_id || user.user.id

    console.log('Starting Cal.com booking sync for user:', targetUserId)

    // Get active Cal.com connections
    const { data: connections, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('provider', 'calcom')
      .eq('is_active', true)

    if (connectionError) {
      throw new Error(`Failed to fetch Cal.com connections: ${connectionError.message}`)
    }

    if (!connections || connections.length === 0) {
      console.log('No active Cal.com connections found')
      return new Response(
        JSON.stringify({ message: 'No active Cal.com connections found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let totalSynced = 0

    for (const connection of connections) {
      console.log(`Syncing Cal.com bookings for connection: ${connection.id}`)

      try {
        // Get bookings from Cal.com API
        const bookingsResponse = await fetch('https://api.cal.com/v1/bookings', {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!bookingsResponse.ok) {
          console.error(`Cal.com API error for connection ${connection.id}:`, bookingsResponse.status)
          continue
        }

        const bookingsData = await bookingsResponse.json()
        const bookings = bookingsData.bookings || []

        console.log(`Found ${bookings.length} bookings for connection ${connection.id}`)

        // Process each booking
        for (const booking of bookings) {
          const startTime = new Date(booking.startTime).toISOString()
          const endTime = new Date(booking.endTime).toISOString()

          // Upsert calendar event
          const { error: eventError } = await supabase
            .from('calendar_events')
            .upsert({
              user_id: targetUserId,
              calendar_connection_id: connection.id,
              external_event_id: booking.id.toString(),
              title: booking.title || `Cal.com Booking`,
              event_summary: `${booking.title} - ${booking.attendees?.[0]?.email || 'Unknown'}`,
              start_time: startTime,
              end_time: endTime,
              is_busy: booking.status === 'ACCEPTED',
              event_status: booking.status?.toLowerCase() || 'confirmed',
              last_synced_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,external_event_id'
            })

          if (eventError) {
            console.error(`Error upserting Cal.com booking ${booking.id}:`, eventError)
          } else {
            totalSynced++
          }
        }

      } catch (error) {
        console.error(`Error syncing Cal.com connection ${connection.id}:`, error)
      }
    }

    console.log(`Cal.com sync completed. Total events synced: ${totalSynced}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced ${totalSynced} Cal.com bookings`,
        synced_count: totalSynced
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cal.com sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
