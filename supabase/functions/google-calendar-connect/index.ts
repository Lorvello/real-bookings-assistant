
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

    const { code } = await req.json()

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Authorization code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[GoogleCalendarConnect] Exchanging code for tokens...')

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: '7344737510-1846vbrgkq4ac0e1ehrjg1dlg001o56.apps.googleusercontent.com',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://qzetadfdmsholqyxxfbh.supabase.co/auth/v1/callback'
      })
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('[GoogleCalendarConnect] Token exchange failed:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange code for tokens' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokens = await tokenResponse.json()
    console.log('[GoogleCalendarConnect] Tokens received successfully')

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()

    // Store calendar connection
    const { error: connectionError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: user.user.id,
        provider: 'google',
        provider_account_id: user.user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,provider'
      })

    if (connectionError) {
      console.error('[GoogleCalendarConnect] Failed to store connection:', connectionError)
      return new Response(
        JSON.stringify({ error: 'Failed to store calendar connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update setup progress
    await supabase
      .from('setup_progress')
      .upsert({
        user_id: user.user.id,
        calendar_linked: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    console.log('[GoogleCalendarConnect] Calendar connection stored successfully')

    // Trigger initial calendar sync
    try {
      await supabase.functions.invoke('sync-calendar-events', {
        body: { user_id: user.user.id }
      })
      console.log('[GoogleCalendarConnect] Initial sync triggered')
    } catch (syncError) {
      console.warn('[GoogleCalendarConnect] Initial sync failed:', syncError)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[GoogleCalendarConnect] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
