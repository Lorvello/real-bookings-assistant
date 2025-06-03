
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

    const { action, user_id, booking_data } = await req.json()

    if (!user_id) {
      return new Response('Missing user_id', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('[Cal.com Bookings] Processing action:', action, 'for user:', user_id)

    // Get Cal.com user info
    const { data: calUser, error: calUserError } = await supabase
      .from('cal_users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (calUserError || !calUser) {
      return new Response('Cal.com user not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    const calcomApiBase = 'https://cal-web-xxx.onrender.com/api/v2'
    const authHeader = `Bearer ${Deno.env.get('CALCOM_API_KEY')}`

    switch (action) {
      case 'create': {
        // Create booking via Cal.com API
        const createResponse = await fetch(`${calcomApiBase}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            ...booking_data,
            userId: calUser.cal_user_id
          }),
        })

        if (!createResponse.ok) {
          const errorText = await createResponse.text()
          console.error('[Cal.com Bookings] Create error:', errorText)
          throw new Error('Failed to create booking')
        }

        const booking = await createResponse.json()
        
        // Store in our database
        const { error: dbError } = await supabase
          .from('cal_bookings')
          .insert({
            user_id: user_id,
            cal_booking_id: booking.id.toString(),
            cal_event_type_id: booking.eventTypeId?.toString() || '',
            title: booking.title,
            description: booking.description,
            start_time: new Date(booking.startTime).toISOString(),
            end_time: new Date(booking.endTime).toISOString(),
            status: booking.status || 'confirmed',
            attendee_name: booking.attendees?.[0]?.name,
            attendee_email: booking.attendees?.[0]?.email,
            attendee_timezone: booking.attendees?.[0]?.timeZone,
          })

        if (dbError) {
          console.error('[Cal.com Bookings] Database error:', dbError)
        }

        return new Response(JSON.stringify({ 
          success: true, 
          booking: booking 
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update': {
        const { booking_id, updates } = booking_data
        
        const updateResponse = await fetch(`${calcomApiBase}/bookings/${booking_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(updates),
        })

        if (!updateResponse.ok) {
          throw new Error('Failed to update booking')
        }

        const updatedBooking = await updateResponse.json()
        
        // Update in our database
        const { error: dbError } = await supabase
          .from('cal_bookings')
          .update({
            title: updatedBooking.title,
            start_time: new Date(updatedBooking.startTime).toISOString(),
            end_time: new Date(updatedBooking.endTime).toISOString(),
            status: updatedBooking.status,
            updated_at: new Date().toISOString()
          })
          .eq('cal_booking_id', booking_id)
          .eq('user_id', user_id)

        if (dbError) {
          console.error('[Cal.com Bookings] Update database error:', dbError)
        }

        return new Response(JSON.stringify({ 
          success: true, 
          booking: updatedBooking 
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cancel': {
        const { booking_id } = booking_data
        
        const cancelResponse = await fetch(`${calcomApiBase}/bookings/${booking_id}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
        })

        if (!cancelResponse.ok) {
          throw new Error('Failed to cancel booking')
        }

        // Update in our database
        const { error: dbError } = await supabase
          .from('cal_bookings')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('cal_booking_id', booking_id)
          .eq('user_id', user_id)

        if (dbError) {
          console.error('[Cal.com Bookings] Cancel database error:', dbError)
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Booking cancelled' 
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'list': {
        const listResponse = await fetch(`${calcomApiBase}/bookings?userId=${calUser.cal_user_id}`, {
          headers: {
            'Authorization': authHeader,
          },
        })

        if (!listResponse.ok) {
          throw new Error('Failed to fetch bookings')
        }

        const bookings = await listResponse.json()

        return new Response(JSON.stringify({ 
          success: true, 
          bookings: bookings 
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response('Invalid action', { 
          status: 400, 
          headers: corsHeaders 
        })
    }

  } catch (error) {
    console.error('[Cal.com Bookings] Error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
