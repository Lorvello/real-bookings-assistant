import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WHATSAPP-PAYMENT-HANDLER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep("Function started");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { conversationId, serviceTypeId, paymentType = 'full', installmentPlan, testMode = false } = await req.json();
    logStep("Request parsed", { conversationId, serviceTypeId, paymentType, installmentPlan, testMode });

    // Initialize Stripe with appropriate key based on mode
    const stripeKey = testMode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeKey) {
      throw new Error(`Stripe ${testMode ? 'test' : 'live'} secret key not configured`);
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe initialized", { mode: testMode ? 'test' : 'live' });

    const isTestMode = testMode;

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

    // Calculate payment amount based on type
    let amount = serviceType.price * 100 // Convert to cents
    if (paymentType === 'installment' && installmentPlan) {
      const plan = serviceType.installment_plans?.find((p: any) => p.id === installmentPlan.id)
      if (plan) {
        amount = plan.amount_per_payment * 100
      }
    }

    // Use the appropriate Stripe price ID based on test mode
    const stripePriceId = isTestMode ? serviceType.stripe_price_id_test : serviceType.stripe_price_id_live;
    
    if (!stripePriceId) {
      throw new Error(`No Stripe price ID found for ${isTestMode ? 'test' : 'live'} mode`);
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin') || 'https://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin') || 'https://localhost:3000'}/payment-cancelled`,
      metadata: {
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        payment_type: paymentType,
        test_mode: isTestMode.toString(),
      },
    })

    // Store payment session in Supabase
    const { data: paymentSession, error: sessionError } = await supabaseClient
      .from('whatsapp_payment_sessions')
      .insert({
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        stripe_session_id: session.id,
        payment_url: session.url,
        amount_cents: amount,
        payment_type: paymentType,
        installment_plan_id: installmentPlan?.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        test_mode: isTestMode
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error storing payment session:', sessionError)
      throw new Error('Failed to store payment session')
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: session.url,
        session_id: session.id,
        payment_session_id: paymentSession.id,
        test_mode: isTestMode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in whatsapp-payment-handler:', error)
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