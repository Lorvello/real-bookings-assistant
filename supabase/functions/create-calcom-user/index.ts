
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

    const { user_id, email, full_name, business_name } = await req.json()

    if (!user_id || !email) {
      return new Response('Missing required parameters', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    console.log('[Create Cal.com User] Starting for user:', user_id)

    // Check if Cal.com user already exists
    const { data: existingCalUser } = await supabase
      .from('cal_users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (existingCalUser) {
      console.log('[Create Cal.com User] User already exists:', existingCalUser.cal_user_id)
      return new Response(JSON.stringify({ 
        success: true,
        cal_user_id: existingCalUser.cal_user_id,
        message: 'Cal.com user already exists'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create Cal.com user via API
    const calcomApiUrl = 'https://cal-web-xxx.onrender.com/api/v2/users'
    
    const createUserResponse = await fetch(calcomApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('CALCOM_API_KEY')}`, // We'll need this secret
      },
      body: JSON.stringify({
        email: email,
        username: email.split('@')[0], // Use email prefix as username
        name: full_name || business_name || 'User',
        timeZone: 'Europe/Amsterdam'
      }),
    })

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text()
      console.error('[Create Cal.com User] API error:', errorText)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to create Cal.com user',
        details: errorText
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const calUser = await createUserResponse.json()
    console.log('[Create Cal.com User] Created Cal.com user:', calUser.id)

    // Store Cal.com user mapping
    const { error: userError } = await supabase
      .from('cal_users')
      .insert({
        user_id: user_id,
        cal_user_id: calUser.id.toString(),
        cal_username: calUser.username,
        cal_email: calUser.email,
      })

    if (userError) {
      console.error('[Create Cal.com User] Database error:', userError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to store user mapping'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create calendar connection with API tokens
    const { error: connectionError } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: user_id,
        provider: 'calcom',
        provider_account_id: calUser.id.toString(),
        cal_user_id: calUser.id.toString(),
        api_endpoint: 'https://cal-web-xxx.onrender.com/api/v2',
        connected_at: new Date().toISOString(),
        is_active: true
      })

    if (connectionError) {
      console.error('[Create Cal.com User] Connection error:', connectionError)
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to create connection'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update setup progress
    const { error: progressError } = await supabase
      .from('setup_progress')
      .upsert({
        user_id: user_id,
        cal_user_created: true,
        calendar_linked: true,
        updated_at: new Date().toISOString()
      })

    if (progressError) {
      console.error('[Create Cal.com User] Progress error:', progressError)
    }

    console.log('[Create Cal.com User] Successfully completed for user:', user_id)

    return new Response(JSON.stringify({ 
      success: true,
      cal_user_id: calUser.id,
      message: 'Cal.com user created successfully'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Create Cal.com User] Unexpected error:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
