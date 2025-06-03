
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

    const webhookData = await req.json()
    console.log('Cal.com webhook received:', webhookData.triggerEvent)

    const { triggerEvent, payload } = webhookData

    if (!payload || !payload.booking) {
      console.log('No booking data in webhook payload')
      return new Response('OK', { headers: corsHeaders })
    }

    const booking = payload.booking
    const bookingId = booking.id.toString()

    // Find the user by Cal.com account ID
    const { data: connections, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('user_id, id')
      .eq('provider', 'calcom')
      .eq('provider_account_id', booking.user?.id?.toString() || '')
      .eq('is_active', true)

    if (connectionError || !connections || connections.length === 0) {
      console.log('No matching Cal.com connection found for webhook')
      return new Response('OK', { headers: corsHeaders })
    }

    const connection = connections[0]
    const userId = connection.user_id
    const connectionId = connection.id

    console.log(`Processing Cal.com webhook for user: ${userId}, event: ${triggerEvent}`)

    const startTime = new Date(booking.startTime).toISOString()
    const endTime = new Date(booking.endTime).toISOString()

    if (triggerEvent === 'BOOKING_CREATED' || triggerEvent === 'BOOKING_RESCHEDULED') {
      // Create or update calendar event
      const { error: eventError } = await supabase
        .from('calendar_events')
        .upsert({
          user_id: userId,
          calendar_connection_id: connectionId,
          external_event_id: bookingId,
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
        console.error('Error upserting Cal.com booking from webhook:', eventError)
      } else {
        console.log(`Successfully processed ${triggerEvent} for booking ${bookingId}`)
      }

    } else if (triggerEvent === 'BOOKING_CANCELLED') {
      // Remove or mark as cancelled
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', userId)
        .eq('external_event_id', bookingId)

      if (deleteError) {
        console.error('Error deleting cancelled Cal.com booking:', deleteError)
      } else {
        console.log(`Successfully removed cancelled booking ${bookingId}`)
      }
    }

    return new Response('OK', { headers: corsHeaders })

  } catch (error) {
    console.error('Cal.com webhook error:', error)
    return new Response('Error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
