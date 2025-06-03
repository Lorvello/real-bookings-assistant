
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

    const { code, state, user_id } = await req.json()

    if (!code || !user_id) {
      return new Response('Missing required parameters', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('[Cal.com OAuth] Processing OAuth callback for user:', user_id)

    // Get Cal.com OAuth config
    const { data: oauthConfig, error: configError } = await supabase
      .from('oauth_providers')
      .select('*')
      .eq('provider', 'calcom')
      .eq('is_active', true)
      .single()

    if (configError || !oauthConfig) {
      console.error('[Cal.com OAuth] Config error:', configError)
      return new Response('Cal.com OAuth not configured', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(oauthConfig.token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: oauthConfig.client_id,
        client_secret: oauthConfig.client_secret || '',
        code: code,
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/calcom-oauth`
      }),
    })

    if (!tokenResponse.ok) {
      console.error('[Cal.com OAuth] Token exchange failed:', await tokenResponse.text())
      return new Response('Token exchange failed', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Get Cal.com user info
    const userResponse = await fetch('https://cal-web-xxx.onrender.com/api/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!userResponse.ok) {
      console.error('[Cal.com OAuth] User info failed:', await userResponse.text())
      return new Response('Failed to get user info', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    const calUser = await userResponse.json()

    // Store Cal.com user mapping
    const { error: userError } = await supabase
      .from('cal_users')
      .upsert({
        user_id: user_id,
        cal_user_id: calUser.id.toString(),
        cal_username: calUser.username,
        cal_email: calUser.email,
        updated_at: new Date().toISOString()
      })

    if (userError) {
      console.error('[Cal.com OAuth] User mapping error:', userError)
      return new Response('Failed to store user mapping', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Create calendar connection
    const { error: connectionError } = await supabase
      .from('calendar_connections')
      .upsert({
        user_id: user_id,
        provider: 'calcom',
        provider_account_id: calUser.id.toString(),
        access_token: accessToken,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_in ? 
          new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        cal_user_id: calUser.id.toString(),
        api_endpoint: 'https://cal-web-xxx.onrender.com/api/v2',
        connected_at: new Date().toISOString(),
        is_active: true
      })

    if (connectionError) {
      console.error('[Cal.com OAuth] Connection error:', connectionError)
      return new Response('Failed to store connection', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Update setup progress
    const { error: progressError } = await supabase
      .from('setup_progress')
      .upsert({
        user_id: user_id,
        cal_oauth_completed: true,
        cal_user_created: true,
        calendar_linked: true,
        updated_at: new Date().toISOString()
      })

    if (progressError) {
      console.error('[Cal.com OAuth] Setup progress error:', progressError)
    }

    console.log('[Cal.com OAuth] Successfully completed OAuth for user:', user_id)

    return new Response(JSON.stringify({ 
      success: true,
      cal_user_id: calUser.id,
      message: 'Cal.com OAuth completed successfully'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Cal.com OAuth] Unexpected error:', error)
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    })
  }
})
