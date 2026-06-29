import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { validateStripeMode } from "../_shared/stripeValidation.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[CREATE-ACCOUNT-SESSION] No authorization header')
      return new Response(
        JSON.stringify({ success: false, code: 'NO_AUTH' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      console.log('[CREATE-ACCOUNT-SESSION] Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({ success: false, code: 'AUTH_FAILED' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const { components, account_id } = await req.json()

    // SECURITY (F-V05): pin the Stripe mode to the server's STRIPE_MODE, never the
    // client body. This fn previously read `test_mode` from the request body, so an
    // authed user could send test_mode:false in a TEST deployment and make the fn
    // instantiate a LIVE Stripe client + mint a LIVE embedded account session into
    // their tax settings. Same mode-bypass class as F-V01 (stripe-connect-*).
    // validateStripeMode() defaults to test when STRIPE_MODE is unset.
    const test_mode = validateStripeMode().mode === 'test'

    // Get correct Stripe secret key based on the server-pinned mode
    const stripeSecretKey = test_mode
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST')
      : Deno.env.get('STRIPE_SECRET_KEY_LIVE')
    
    if (!stripeSecretKey) {
      console.log(`[CREATE-ACCOUNT-SESSION] Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`)
      return new Response(
        JSON.stringify({ success: false, code: 'MISSING_STRIPE_SECRET' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    // Get platform account for tenant isolation
    const platformAccount = await stripe.accounts.retrieve()
    const platformAccountId = platformAccount.id
    const environment = test_mode ? 'test' : 'live'

    // Get user data to find account owner
    const { data: userData } = await supabase
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single()

    const accountOwnerId = userData?.account_owner_id || user.id

    console.log(`[CREATE-ACCOUNT-SESSION] Looking for account - Owner: ${accountOwnerId}, Environment: ${environment}, Platform: ${platformAccountId}`)

    // Get connected account ID if not provided
    let connectedAccountId = null
    if (account_id) {
      // SECURITY: a caller-supplied account_id must belong to the caller's own
      // account (same account_owner_id / environment / platform). Without this
      // check, any authenticated user could pass another tenant's acct_... id and
      // receive an embedded account session into their Stripe tax settings
      // (view/edit registrations, export tax transactions) — cross-tenant control.
      const { data: ownedAccount } = await supabase
        .from('business_stripe_accounts')
        .select('stripe_account_id')
        .eq('stripe_account_id', account_id)
        .eq('account_owner_id', accountOwnerId)
        .eq('environment', environment)
        .eq('platform_account_id', platformAccountId)
        .maybeSingle()

      if (!ownedAccount) {
        console.log('[CREATE-ACCOUNT-SESSION] Supplied account_id not owned by caller')
        return new Response(
          JSON.stringify({ success: false, code: 'ACCOUNT_NOT_OWNED' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }
      connectedAccountId = account_id
    }
    if (!connectedAccountId) {
      // Primary lookup: business_stripe_accounts with proper tenant isolation
      const { data: stripeAccount } = await supabase
        .from('business_stripe_accounts')
        .select('stripe_account_id, connected_account_id')
        .eq('account_owner_id', accountOwnerId)
        .eq('environment', environment)
        .eq('platform_account_id', platformAccountId)
        .eq('onboarding_completed', true)
        .eq('charges_enabled', true)
        .single()

      if (stripeAccount?.stripe_account_id) {
        connectedAccountId = stripeAccount.stripe_account_id
        console.log(`[CREATE-ACCOUNT-SESSION] Found account via business_stripe_accounts: ${connectedAccountId}`)
      } else {
        // Fallback: Check calendar_settings for legacy stripe_connect_account_id
        const { data: calendars } = await supabase
          .from('calendars')
          .select(`
            id,
            calendar_settings!inner(stripe_connect_account_id)
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)

        const legacyAccountId = calendars?.[0]?.calendar_settings?.stripe_connect_account_id
        if (legacyAccountId) {
          connectedAccountId = legacyAccountId
          console.log(`[CREATE-ACCOUNT-SESSION] Found legacy account via calendar_settings: ${connectedAccountId}`)
        } else {
          console.log('[CREATE-ACCOUNT-SESSION] No Stripe account found')
          return new Response(
            JSON.stringify({ success: false, code: 'NO_ACCOUNT' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }
      }
    }

    console.log(`[CREATE-ACCOUNT-SESSION] Creating session for account: ${connectedAccountId}`)

    // Supported embedded components for tax functionality
    const supportedComponents = {
      tax_settings: {
        enabled: true,
        features: {
          edit_settings: true,
        }
      },
      tax_registrations: {
        enabled: true,
        features: {
          view_registrations: true,
          register_new: true,
        }
      },
      tax_threshold_monitoring: {
        enabled: true,
        features: {
          view_thresholds: true,
          track_progress: true,
        }
      },
      export_tax_transactions: {
        enabled: true,
        features: {
          generate_report: true,
          download_report: true,
        }
      }
    }

    // Filter requested components to only supported ones
    const requestedComponents = Array.isArray(components) 
      ? components.filter(comp => supportedComponents[comp])
      : Object.keys(supportedComponents)

    console.log(`[CREATE-ACCOUNT-SESSION] Requested components: ${requestedComponents.join(', ')}`)

    // Create account session with tax components
    const accountSession = await stripe.accountSessions.create({
      account: connectedAccountId,
      components: requestedComponents.reduce((acc, comp) => {
        acc[comp] = supportedComponents[comp]
        return acc
      }, {} as any)
    })

    console.log(`[CREATE-ACCOUNT-SESSION] Session created successfully - ${accountSession.client_secret}`)

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: accountSession.client_secret,
        account_id: connectedAccountId,
        components: requestedComponents,
        expires_at: accountSession.expires_at,
        session_id: accountSession.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[CREATE-ACCOUNT-SESSION] Error:', error.message)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: 'SERVER_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})