import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstallmentPaymentRequest {
  conversationId: string;
  serviceTypeId: string;
  appointmentDate: string;
  installmentPlan: any;
  customerData: {
    name: string;
    phone: string;
    email?: string;
  };
  test_mode?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Validate subscription tier first
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error('Invalid authentication');
    }

    // Check user's subscription tier
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    // Only allow professional and enterprise users to use installments
    if (!userProfile.subscription_tier || !['professional', 'enterprise'].includes(userProfile.subscription_tier)) {
      throw new Error('Installment payments require Professional plan or higher');
    }

    const {
      conversationId,
      serviceTypeId,
      appointmentDate,
      installmentPlan,
      customerData,
      test_mode = false,
    }: InstallmentPaymentRequest = await req.json();

    // Pick the Stripe key for the requested mode (mirrors create-booking-payment).
    // NEVER live money in our own testing — callers pass test_mode for sandbox.
    const stripeKey = test_mode
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST')
      : Deno.env.get('STRIPE_SECRET_KEY_LIVE');
    if (!stripeKey) {
      throw new Error(`Stripe ${test_mode ? 'test' : 'live'} secret key not configured`);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Get conversation and service type data
    const { data: conversation, error: convError } = await supabaseClient
      .from('whatsapp_conversations')
      .select(`
        *,
        calendar:calendars(*)
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    // SECURITY: the conversation's calendar must belong to the authenticated user
    // (or their team account). Without this, any professional/enterprise user could
    // create bookings + payment sessions on ANOTHER tenant's calendar / connected
    // Stripe account by passing a foreign conversationId (IDOR / cross-tenant write).
    const calendarOwnerId = conversation.calendar?.user_id;
    if (!calendarOwnerId) {
      throw new Error('Calendar not found for conversation');
    }
    if (calendarOwnerId !== userData.user.id) {
      const { data: owners } = await supabaseClient
        .from('users')
        .select('id, account_owner_id')
        .in('id', [calendarOwnerId, userData.user.id]);
      const acct = (id: string) => {
        const r = owners?.find((o: any) => o.id === id);
        return r?.account_owner_id || id;
      };
      if (acct(calendarOwnerId) !== acct(userData.user.id)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied: calendar not owned by caller' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: serviceType, error: serviceError } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('id', serviceTypeId)
      .single();

    if (serviceError || !serviceType) {
      throw new Error('Service type not found');
    }

    // SECURITY: the service type must belong to the same calendar as the
    // conversation, so a caller can't graft a foreign/mismatched service (and its
    // price) onto this calendar's booking.
    if (serviceType.calendar_id !== conversation.calendar_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service type does not belong to this calendar' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the connected Stripe account for this calendar IN THE REQUESTED MODE.
    // Without the environment filter a live account could be charged with the test
    // key (or vice versa) -> installments broke for live businesses.
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id')
      .eq('calendar_id', conversation.calendar_id)
      .eq('environment', test_mode ? 'test' : 'live')
      .eq('account_status', 'active')
      .single();

    if (!stripeAccount) {
      throw new Error('Stripe account not configured');
    }

    const servicePrice = serviceType.price || 0;
    const servicePriceCents = Math.round(servicePrice * 100);

    // Calculate installment schedule
    const calculateInstallments = () => {
      const installments = [];
      
      if (installmentPlan.type === 'preset') {
        if (installmentPlan.preset === 'fixed_deposit') {
          const depositAmount = installmentPlan.fixed_deposit_amount || 50;
          const depositCents = Math.round(depositAmount * 100);
          const remainderCents = servicePriceCents - depositCents;
          
          installments.push({
            amount_cents: depositCents,
            timing: 'now',
            payment_method: 'online'
          });
          
          installments.push({
            amount_cents: remainderCents,
            timing: 'appointment',
            payment_method: 'cash'
          });
        } else {
          // Handle percentage-based presets (50_50, 25_25_50). These always sum to
          // 100%, so compute each from its percentage but make the LAST installment
          // the exact remainder. Rounding each independently would drift: e.g. 50%
          // of €99.99 = Math.round(4999.5) = 5000, twice = €100.00 — a 1-cent
          // overcharge vs the €99.99 service price. Remainder-on-last guarantees the
          // installments sum to servicePriceCents exactly.
          const presetDeposits = installmentPlan.deposits || [];
          let allocatedCents = 0;
          presetDeposits.forEach((deposit: any, index: number) => {
            const isLast = index === presetDeposits.length - 1;
            const amountCents = isLast
              ? servicePriceCents - allocatedCents
              : Math.round((servicePriceCents * (deposit.percentage || 0)) / 100);
            allocatedCents += amountCents;
            installments.push({
              amount_cents: amountCents,
              timing: deposit.timing,
              payment_method: deposit.timing === 'now' ? 'online' : 'cash'
            });
          });
        }
      } else {
        // Custom plan
        installmentPlan.deposits?.forEach((deposit: any) => {
          const amountCents = deposit.amount ? 
            Math.round(deposit.amount * 100) : 
            Math.round((servicePriceCents * (deposit.percentage || 0)) / 100);
          
          installments.push({
            amount_cents: amountCents,
            timing: deposit.timing,
            payment_method: deposit.timing === 'now' ? 'online' : 'cash'
          });
        });
      }
      
      return installments;
    };

    const installments = calculateInstallments();
    const firstPayment = installments.find(i => i.timing === 'now');
    
    if (!firstPayment) {
      throw new Error('No immediate payment required');
    }

    // Create Stripe checkout session for first payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `${serviceType.name} - First Payment`,
            description: `Installment payment 1 of ${installments.length}`,
          },
          unit_amount: firstPayment.amount_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/booking-cancelled`,
      customer_email: customerData.email,
      metadata: {
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        payment_type: 'installment',
        installment_number: '1',
        total_installments: installments.length.toString(),
      }
    }, {
      stripeAccount: stripeAccount.stripe_account_id
    });

    // Create booking record
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        calendar_id: conversation.calendar_id,
        service_type_id: serviceTypeId,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        start_time: appointmentDate,
        end_time: new Date(new Date(appointmentDate).getTime() + (serviceType.duration * 60000)).toISOString(),
        status: 'pending',
        payment_status: 'partial',
        total_price: servicePrice,
        payment_required: true,
        notes: 'Installment payment booking'
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw new Error('Failed to create booking');
    }

    // Create WhatsApp payment session
    const { data: paymentSession, error: sessionError } = await supabaseClient
      .from('whatsapp_payment_sessions')
      .insert({
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        payment_type: 'installment',
        installment_plan: installmentPlan,
        stripe_session_id: session.id,
        stripe_session_url: session.url || '',
        amount_cents: firstPayment.amount_cents,
        currency: 'eur',
        customer_name: customerData.name,
        customer_phone: customerData.phone,
        customer_email: customerData.email,
        payment_status: 'pending',
        metadata: {
          booking_id: booking.id,
          total_service_price: servicePriceCents,
          installment_schedule: installments
        }
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error('Failed to create payment session');
    }

    // Create installment payment records
    for (let i = 0; i < installments.length; i++) {
      const installment = installments[i];
      let dueDate;
      
      if (installment.timing === 'appointment') {
        dueDate = appointmentDate;
      } else if (installment.timing === 'now') {
        dueDate = new Date().toISOString();
      }
      
      await supabaseClient
        .from('installment_payments')
        .insert({
          booking_id: booking.id,
          whatsapp_session_id: paymentSession.id,
          installment_number: i + 1,
          total_installments: installments.length,
          amount_cents: installment.amount_cents,
          currency: 'eur',
          due_date: dueDate,
          payment_timing: installment.timing,
          payment_method: installment.payment_method,
          status: i === 0 ? 'pending' : 'pending',
          stripe_payment_intent_id: i === 0 ? session.payment_intent as string : null
        });
    }

    return new Response(JSON.stringify({
      success: true,
      payment_url: session.url,
      session_id: session.id,
      booking_id: booking.id,
      installment_schedule: installments,
      total_installments: installments.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error creating installment payment:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});