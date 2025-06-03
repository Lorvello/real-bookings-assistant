
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
    const { data: existingConnection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single()

    if (existingConnection) {
      console.log('[Create Cal.com User] Connection already exists')
      return new Response(JSON.stringify({ 
        success: true,
        cal_user_id: existingConnection.cal_user_id,
        message: 'Cal.com user already exists'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate unique Cal.com user ID
    const calUserId = `user_${user_id.replace(/-/g, '').substring(0, 16)}`
    
    console.log('[Create Cal.com User] Creating connection with ID:', calUserId)

    // Create calendar connection record
    const { error: connectionError } = await supabase
      .from('calendar_connections')
      .insert({
        user_id: user_id,
        cal_user_id: calUserId,
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
      cal_user_id: calUserId,
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
