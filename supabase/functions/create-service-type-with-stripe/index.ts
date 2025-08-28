import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: userData } = await supabaseClient.auth.getUser(token)
    const user = userData.user

    if (!user) {
      throw new Error('User not authenticated')
    }

    const { serviceData, isTestMode = true } = await req.json()
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    console.log('Creating Stripe price for service:', serviceData.name)

    // Create Stripe Price
    const priceData: any = {
      currency: 'eur',
      unit_amount: Math.round((serviceData.price || 0) * 100), // Convert to cents
      product_data: {
        name: serviceData.name,
        description: serviceData.description || `${serviceData.name} - ${serviceData.duration} minuten`,
        metadata: {
          service_duration: serviceData.duration.toString(),
          calendar_id: serviceData.calendar_id || '',
        },
      },
    }

    const price = await stripe.prices.create(priceData)
    console.log('Stripe price created:', price.id)

    // Update service data with Stripe price ID
    const updatedServiceData = {
      ...serviceData,
      user_id: user.id,
      [isTestMode ? 'stripe_test_price_id' : 'stripe_live_price_id']: price.id,
    }

    // Create service type in database
    const { data: serviceType, error } = await supabaseClient
      .from('service_types')
      .insert([updatedServiceData])
      .select('*')
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Service type created successfully:', serviceType.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        serviceType,
        stripePriceId: price.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in create-service-type-with-stripe:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})