import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    const { components, account_id } = await req.json()

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    // Get connected account ID if not provided
    let connectedAccountId = account_id
    if (!connectedAccountId) {
      // Get user's calendar and associated Stripe account
      const { data: calendars } = await supabase
        .from('calendars')
        .select(`
          id,
          business_stripe_accounts!inner(connected_account_id)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)

      if (!calendars?.[0]?.business_stripe_accounts?.connected_account_id) {
        throw new Error('No connected Stripe account found')
      }
      
      connectedAccountId = calendars[0].business_stripe_accounts.connected_account_id
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
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})