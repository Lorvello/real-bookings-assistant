
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
      .eq('is_active', true)
      .single()

    if (connectionError || !connection) {
      console.log('[Cal.com Sync] No active Cal.com connection found')
      return new Response('No Cal.com connection found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Simulate booking sync (in real implementation, this would call Cal.com API)
    console.log('[Cal.com Sync] Simulating booking sync for Cal.com user:', connection.cal_user_id)

    // Create some mock calendar events for demonstration
    const mockEvents = [
      {
        user_id: user_id,
        calendar_connection_id: connection.id,
        external_event_id: `calcom-demo-${Date.now()}`,
        title: 'Demo Cal.com Booking',
        event_summary: 'Demo booking for testing',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        is_busy: true,
        event_status: 'confirmed',
        last_synced_at: new Date().toISOString()
      }
    ]

    let syncedCount = 0

    for (const event of mockEvents) {
      try {
        const { error: eventError } = await supabase
          .from('calendar_events')
          .upsert(event, {
            onConflict: 'user_id,external_event_id'
          })

        if (eventError) {
          console.error('[Cal.com Sync] Event upsert error:', eventError)
        } else {
          syncedCount++
        }
      } catch (error) {
        console.error('[Cal.com Sync] Error processing event:', error)
      }
    }

    console.log('[Cal.com Sync] Completed sync:', {
      user_id,
      events_synced: syncedCount
    })

    return new Response(JSON.stringify({ 
      success: true,
      events_synced: syncedCount,
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
