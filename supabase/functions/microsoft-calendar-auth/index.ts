
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

    const { action, code, state } = await req.json()

    if (action === 'init') {
      const { data: provider } = await supabase
        .from('oauth_providers')
        .select('*')
        .eq('provider', 'microsoft')
        .single()

      if (!provider || !provider.client_id) {
        return new Response(
          JSON.stringify({ error: 'Microsoft OAuth not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const authUrl = new URL(provider.auth_url)
      authUrl.searchParams.set('client_id', provider.client_id)
      authUrl.searchParams.set('redirect_uri', `${Deno.env.get('SUPABASE_URL')}/functions/v1/microsoft-calendar-auth`)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', provider.scope)
      authUrl.searchParams.set('state', user.user.id)

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'callback' && code) {
      const { data: provider } = await supabase
        .from('oauth_providers')
        .select('*')
        .eq('provider', 'microsoft')
        .single()

      const tokenResponse = await fetch(provider.token_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: provider.client_id!,
          client_secret: provider.client_secret!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/microsoft-calendar-auth`
        })
      })

      const tokens = await tokenResponse.json()

      if (tokens.error) {
        return new Response(
          JSON.stringify({ error: tokens.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user info from Microsoft Graph
      const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      })
      const userInfo = await userInfoResponse.json()

      // Save connection to database
      const { data: connection, error } = await supabase
        .from('calendar_connections')
        .upsert({
          user_id: user.user.id,
          provider: 'microsoft',
          provider_account_id: userInfo.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          is_active: true
        })
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          connection,
          user_info: {
            email: userInfo.mail || userInfo.userPrincipalName,
            name: userInfo.displayName
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
