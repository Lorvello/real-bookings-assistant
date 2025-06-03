
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

    console.log('Cal.com OAuth token exchange:', { code: code?.substring(0, 10) + '...', state, user_id })

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Missing code or state parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Cal.com OAuth credentials from environment
    const clientId = Deno.env.get('CALCOM_CLIENT_ID')
    const clientSecret = Deno.env.get('CALCOM_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      console.error('Missing Cal.com OAuth credentials')
      return new Response(
        JSON.stringify({ error: 'Cal.com OAuth credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calcom-oauth`

    console.log('Using redirect URI for Cal.com OAuth:', redirectUri)

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.cal.com/v1/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    const tokens = await tokenResponse.json()
    console.log('Cal.com token response:', { 
      access_token: tokens.access_token ? 'present' : 'missing', 
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
      error: tokens.error || 'none'
    })

    if (!tokenResponse.ok) {
      console.error('Cal.com token exchange failed:', tokens)
      return new Response(
        JSON.stringify({ error: tokens.error_description || 'Failed to exchange authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile from Cal.com
    const userResponse = await fetch('https://api.cal.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })

    if (!userResponse.ok) {
      console.error('Failed to get Cal.com user info')
      return new Response(
        JSON.stringify({ error: 'Failed to get Cal.com user info' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userInfo = await userResponse.json()
    console.log('Cal.com user info:', { email: userInfo.email, id: userInfo.id })

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()

    // Update the pending connection in database
    const { error: updateError } = await supabase
      .from('calendar_connections')
      .update({
        provider_account_id: userInfo.id.toString(),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', state)
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Database update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save connection details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully updated Cal.com calendar connection')

    return new Response(
      JSON.stringify({ 
        success: true,
        calendar: {
          name: `Cal.com (${userInfo.email})`,
          email: userInfo.email
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cal.com OAuth exchange error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
