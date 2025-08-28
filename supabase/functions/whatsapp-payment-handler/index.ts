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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { 
      conversationId, 
      serviceTypeId, 
      paymentType = 'full',
      installmentPlan = null 
    } = await req.json()

    console.log('Processing WhatsApp payment for:', { conversationId, serviceTypeId, paymentType })

    // Get conversation and service details
    const { data: conversation, error: convError } = await supabaseClient
      .from('whatsapp_conversations')
      .select('calendar_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      throw new Error('Conversation not found')
    }

    const { data: serviceType, error: serviceError } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('id', serviceTypeId)
      .eq('calendar_id', conversation.calendar_id)
      .single()

    if (serviceError || !serviceType) {
      throw new Error('Service type not found')
    }

    // Calculate payment amount
    let amountCents = Math.round((serviceType.price || 0) * 100)
    
    if (paymentType === 'installment' && installmentPlan) {
      // For installments, calculate first payment amount
      const firstPayment = installmentPlan.payments?.[0]
      if (firstPayment) {
        amountCents = Math.round((firstPayment.amount || 0) * 100)
      }
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Use appropriate Stripe price ID (test vs live)
    const isTestMode = true // Could be determined by calendar settings
    const stripePriceId = isTestMode ? serviceType.stripe_test_price_id : serviceType.stripe_live_price_id

    if (!stripePriceId) {
      throw new Error('No Stripe price configured for this service')
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin') || 'https://your-domain.com'}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin') || 'https://your-domain.com'}/booking-cancelled`,
      metadata: {
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        payment_type: paymentType,
        calendar_id: conversation.calendar_id,
      },
    })

    // Create payment session record
    const { data: paymentSession, error: paymentError } = await supabaseClient
      .from('whatsapp_payment_sessions')
      .insert([{
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        calendar_id: conversation.calendar_id,
        amount_cents: amountCents,
        payment_type: paymentType,
        installment_plan: installmentPlan,
        stripe_session_id: session.id,
        payment_url: session.url,
      }])
      .select('*')
      .single()

    if (paymentError) {
      console.error('Error creating payment session:', paymentError)
      throw paymentError
    }

    console.log('Payment session created:', paymentSession.id)

    return new Response(
      JSON.stringify({
        success: true,
        paymentUrl: session.url,
        sessionId: session.id,
        paymentSessionId: paymentSession.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in whatsapp-payment-handler:', error)
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