
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

    console.log('[RefreshTokens] Starting token refresh check...')

    // Find connections that expire within the next hour
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    const { data: expiring, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('provider', 'google')
      .eq('is_active', true)
      .not('refresh_token', 'is', null)
      .lt('expires_at', oneHourFromNow)

    if (fetchError) {
      console.error('[RefreshTokens] Error fetching connections:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!expiring || expiring.length === 0) {
      console.log('[RefreshTokens] No tokens need refreshing')
      return new Response(
        JSON.stringify({ message: 'No tokens need refreshing', refreshed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[RefreshTokens] Found ${expiring.length} connections to refresh`)

    let refreshedCount = 0

    for (const connection of expiring) {
      try {
        console.log(`[RefreshTokens] Refreshing tokens for user ${connection.user_id}`)

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: '7344737510-1846vbrgkq4ac0e1ehrjg1dlg001o56.apps.googleusercontent.com',
            client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
            refresh_token: connection.refresh_token,
            grant_type: 'refresh_token'
          })
        })

        if (!refreshResponse.ok) {
          const error = await refreshResponse.text()
          console.error(`[RefreshTokens] Failed to refresh token for user ${connection.user_id}:`, error)
          continue
        }

        const newTokens = await refreshResponse.json()
        const newExpiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString()

        // Update the connection with new tokens
        const { error: updateError } = await supabase
          .from('calendar_connections')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || connection.refresh_token, // Keep old refresh token if not provided
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id)

        if (updateError) {
          console.error(`[RefreshTokens] Failed to update tokens for user ${connection.user_id}:`, updateError)
        } else {
          console.log(`[RefreshTokens] Successfully refreshed tokens for user ${connection.user_id}`)
          refreshedCount++
        }

      } catch (error) {
        console.error(`[RefreshTokens] Error refreshing token for user ${connection.user_id}:`, error)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Refreshed ${refreshedCount} of ${expiring.length} connections`,
        refreshed: refreshedCount,
        total: expiring.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[RefreshTokens] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
