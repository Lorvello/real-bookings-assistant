import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { calculateApplicationFee } from '../_shared/feeCalculator.ts';
import { validateStripeMode, getStripeSecretKey } from '../_shared/stripeValidation.ts';
import { validatePhoneServerSide } from '../_shared/phoneValidation.ts';

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

    // SEQP1R10 (fixes P1-9-PHONE2, third write path flagged as a follow-up by R9):
    // customerData.phone was written verbatim to bookings.customer_phone with ZERO
    // validation of any kind (not even the light sanitization create-booking at least
    // had before this same round). This endpoint IS authenticated (professional/
    // enterprise subscription tier required, checked above), but auth alone does not
    // guarantee the phone value is well-formed or unambiguous: it is still whatever the
    // calling client (the WhatsApp agent's payment-flow UI) put in the request body.
    // Validate and normalize to E.164 here, failing the request (400) before any Stripe
    // session or booking row is created, rather than writing an ambiguous or bare-local
    // number that would later break at the WhatsApp reminder send boundary.
    //
    // validatePhoneServerSide treats an empty/missing phone as valid-but-optional (correct
    // for create-booking, where the field genuinely is optional), but THIS endpoint's own
    // InstallmentPaymentRequest interface declares customerData.phone as a required string:
    // an installment booking always originates from an active WhatsApp conversation, so a
    // phone number should always be present. A code-review pass on this same round caught
    // that without an explicit presence check here, an omitted phone would silently pass
    // through as customer_phone: null instead of being rejected, contradicting the
    // interface's own "required" contract. Enforce that explicitly.
    if (!customerData?.phone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Phone number is required for installment bookings',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    const phoneResult = validatePhoneServerSide(customerData.phone);
    if (!phoneResult.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: phoneResult.error || 'Invalid phone number',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    const normalizedCustomerPhone = phoneResult.value as string;

    // SECURITY: pin the Stripe mode to the server's STRIPE_MODE, never trust the
    // client's test_mode (mirrors create-booking-payment). Defaulted to LIVE before,
    // which meant our own test flows could touch real money. The client param is
    // ignored; the server is the single source of truth.
    const serverIsTest = validateStripeMode().mode === 'test';
    const stripeKey = getStripeSecretKey(serverIsTest ? 'test' : 'live');
    if (!stripeKey) {
      throw new Error(`Stripe ${serverIsTest ? 'test' : 'live'} secret key not configured`);
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
      .eq('environment', serverIsTest ? 'test' : 'live')
      .eq('account_status', 'active')
      .single();

    if (!stripeAccount) {
      throw new Error('Stripe account not configured');
    }

    // Platform fee config for this calendar (defaults mirror create-booking-payment).
    const { data: paymentSettings } = await supabaseClient
      .from('payment_settings')
      .select('platform_fee_percentage, payout_option')
      .eq('calendar_id', conversation.calendar_id)
      .maybeSingle();
    const platformFeePercentage = paymentSettings?.platform_fee_percentage ?? 1.9;
    const payoutOption = (paymentSettings?.payout_option as 'standard' | 'instant') ?? 'standard';

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

    // Platform application fee on the first installment (was 0 — the platform earned
    // nothing on every installment booking). application_fee_amount on a direct charge
    // routes the fee to the platform account; same calculator as the web/WhatsApp flows.
    const feeCalculation = calculateApplicationFee({
      amountCents: firstPayment.amount_cents,
      paymentMethod: 'card',
      payoutOption,
      platformFeePercentage: platformFeePercentage / 100,
    });

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
      payment_intent_data: {
        application_fee_amount: feeCalculation.applicationFeeCents,
      },
      success_url: `${req.headers.get('origin')}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/booking-cancelled`,
      customer_email: customerData.email,
      metadata: {
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        payment_type: 'installment',
        installment_number: '1',
        total_installments: installments.length.toString(),
        platform_fee_percentage: platformFeePercentage.toString(),
        application_fee_cents: feeCalculation.applicationFeeCents.toString(),
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
        customer_phone: normalizedCustomerPhone,
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

    // Create WhatsApp payment session.
    // NOTE: whatsapp_payment_sessions only has these columns (see migration
    // 20250828223936): conversation_id, service_type_id, calendar_id, amount_cents,
    // currency, payment_type, installment_plan (jsonb), stripe_payment_intent_id,
    // stripe_session_id, payment_status, payment_url, expires_at. The previous insert
    // referenced stripe_session_url / customer_name / customer_phone / customer_email
    // / metadata (none of which exist), so every installment booking threw 42703 at
    // this insert (500 + orphaned Stripe session + orphaned pending booking). The
    // booking linkage now lives on installment_payments.booking_id (inserted below);
    // the schedule and customer data live on the booking row itself.
    const { data: paymentSession, error: sessionError } = await supabaseClient
      .from('whatsapp_payment_sessions')
      .insert({
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        calendar_id: conversation.calendar_id,
        payment_type: 'installment',
        installment_plan: installmentPlan,
        stripe_session_id: session.id,
        payment_url: session.url || '',
        amount_cents: firstPayment.amount_cents,
        currency: 'eur',
        payment_status: 'pending',
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
      error: (error as Error)?.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});