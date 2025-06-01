
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

    const { code, state, user_id } = await req.json()

    console.log('Google Calendar OAuth token exchange:', { 
      code: code?.substring(0, 10) + '...', 
      state, 
      user_id,
      authenticated_user: user.user.id
    })

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the requesting user matches the authenticated user
    if (user_id !== user.user.id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OAuth credentials from environment
    const clientId = '7344737510-1846vbrgkq4ac0e1ehrjg1dlg001o56.apps.googleusercontent.com'
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    
    if (!clientSecret) {
      console.error('Missing Google OAuth client secret')
      return new Response(
        JSON.stringify({ error: 'OAuth credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use the correct redirect URI that matches Google Console setup
    const redirectUri = 'https://qzetadfdmsholqyxxfbh.supabase.co/auth/v1/callback'

    console.log('Using redirect URI for calendar OAuth:', redirectUri)

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    const tokens = await tokenResponse.json()
    console.log('Token response:', { 
      access_token: tokens.access_token ? 'present' : 'missing', 
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
      error: tokens.error || 'none'
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens)
      return new Response(
        JSON.stringify({ 
          error: tokens.error_description || 'Failed to exchange authorization code',
          details: tokens
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })

    if (!userResponse.ok) {
      console.error('Failed to get user info')
      return new Response(
        JSON.stringify({ error: 'Failed to get user info' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userInfo = await userResponse.json()
    console.log('Google user info:', { email: userInfo.email, id: userInfo.id })

    // Get primary calendar info
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })

    let calendarInfo = { id: 'primary', summary: 'Google Calendar' }
    if (calendarResponse.ok) {
      calendarInfo = await calendarResponse.json()
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()

    // Store or update calendar connection
    const { error: upsertError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: user_id,
        provider: 'google',
        provider_account_id: userInfo.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt,
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,provider'
      })

    if (upsertError) {
      console.error('Database upsert error:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save connection details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update setup progress
    await supabase
      .from('setup_progress')
      .upsert({
        user_id: user_id,
        calendar_linked: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    console.log('Successfully saved calendar connection')

    return new Response(
      JSON.stringify({ 
        success: true,
        calendar: {
          name: calendarInfo.summary,
          email: userInfo.email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Google Calendar OAuth exchange error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
