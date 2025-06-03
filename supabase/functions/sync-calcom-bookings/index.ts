
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

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response('Missing user_id', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('[Cal.com Sync] Starting sync for user:', user_id)

    // Get user's Cal.com connection
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('provider', 'calcom')
      .eq('is_active', true)
      .single()

    if (connectionError || !connection) {
      console.log('[Cal.com Sync] No active Cal.com connection found')
      return new Response('No Cal.com connection found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Get bookings from Cal.com API
    const bookingsResponse = await fetch(`${connection.api_endpoint}/bookings`, {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!bookingsResponse.ok) {
      console.error('[Cal.com Sync] Bookings fetch failed:', await bookingsResponse.text())
      return new Response('Failed to fetch bookings', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    const bookingsData = await bookingsResponse.json()
    const bookings = bookingsData.bookings || []

    console.log('[Cal.com Sync] Found', bookings.length, 'bookings')

    let syncedCount = 0
    let eventsCount = 0

    for (const booking of bookings) {
      try {
        // Store in cal_bookings table
        const { error: bookingError } = await supabase
          .from('cal_bookings')
          .upsert({
            user_id: user_id,
            cal_booking_id: booking.id.toString(),
            cal_event_type_id: booking.eventType?.id?.toString() || '',
            title: booking.title || booking.eventType?.title || 'Cal.com Booking',
            description: booking.description,
            start_time: new Date(booking.startTime).toISOString(),
            end_time: new Date(booking.endTime).toISOString(),
            status: booking.status?.toLowerCase() || 'confirmed',
            attendee_name: booking.attendees?.[0]?.name,
            attendee_email: booking.attendees?.[0]?.email,
            attendee_timezone: booking.attendees?.[0]?.timeZone,
            last_synced_at: new Date().toISOString()
          })

        if (bookingError) {
          console.error('[Cal.com Sync] Booking upsert error:', bookingError)
          continue
        }

        // Also store in calendar_events for compatibility
        const { error: eventError } = await supabase
          .from('calendar_events')
          .upsert({
            user_id: user_id,
            calendar_connection_id: connection.id,
            external_event_id: `calcom-${booking.id}`,
            title: booking.title || booking.eventType?.title || 'Cal.com Booking',
            event_summary: `${booking.title || booking.eventType?.title} - ${booking.attendees?.[0]?.email}`,
            start_time: new Date(booking.startTime).toISOString(),
            end_time: new Date(booking.endTime).toISOString(),
            is_busy: booking.status === 'ACCEPTED',
            event_status: booking.status?.toLowerCase() || 'confirmed',
            cal_booking_id: booking.id.toString(),
            cal_event_type_id: booking.eventType?.id?.toString(),
            attendee_email: booking.attendees?.[0]?.email,
            attendee_name: booking.attendees?.[0]?.name,
            last_synced_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,external_event_id'
          })

        if (eventError) {
          console.error('[Cal.com Sync] Event upsert error:', eventError)
        } else {
          eventsCount++
        }

        syncedCount++
      } catch (error) {
        console.error('[Cal.com Sync] Error processing booking:', booking.id, error)
      }
    }

    console.log('[Cal.com Sync] Completed sync:', {
      user_id,
      bookings_synced: syncedCount,
      events_synced: eventsCount
    })

    return new Response(JSON.stringify({ 
      success: true,
      bookings_synced: syncedCount,
      events_synced: eventsCount,
      message: 'Cal.com bookings synced successfully'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Cal.com Sync] Unexpected error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
