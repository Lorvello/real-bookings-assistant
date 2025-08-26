import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentRequest {
  booking_id: string;
  amount_cents: number;
  currency?: string;
  customer_email?: string;
  customer_name?: string;
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

    const {
      booking_id,
      amount_cents,
      currency = 'eur',
      customer_email,
      customer_name
    }: CreatePaymentRequest = await req.json();

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        calendars!inner(
          id,
          name,
          business_stripe_accounts!inner(
            stripe_account_id,
            charges_enabled
          )
        ),
        service_types(name, price)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found');
    }

    const stripeAccount = booking.calendars.business_stripe_accounts[0];
    if (!stripeAccount?.charges_enabled) {
      throw new Error('Payment processing not enabled for this business');
    }

    // Get payment settings
    const { data: paymentSettings } = await supabaseClient
      .from('payment_settings')
      .select('platform_fee_percentage')
      .eq('calendar_id', booking.calendar_id)
      .single();

    const platformFeePercentage = paymentSettings?.platform_fee_percentage || 2.50;
    const platformFeeCents = Math.round(amount_cents * (platformFeePercentage / 100));

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: currency,
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },
      metadata: {
        booking_id: booking_id,
        calendar_id: booking.calendar_id,
        service_name: booking.service_types?.name || 'Service',
      },
      description: `Payment for ${booking.service_types?.name || 'Service'} - ${booking.calendars.name}`,
      receipt_email: customer_email,
    });

    // Store payment record
    await supabaseClient
      .from('booking_payments')
      .insert({
        booking_id: booking_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_account_id: stripeAccount.stripe_account_id,
        amount_cents: amount_cents,
        currency: currency,
        platform_fee_cents: platformFeeCents,
        status: 'pending',
        customer_email: customer_email,
        customer_name: customer_name,
      });

    // Update booking status
    await supabaseClient
      .from('bookings')
      .update({
        payment_status: 'pending',
        payment_required: true,
        total_amount_cents: amount_cents,
        payment_currency: currency,
        payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .eq('id', booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent: {
          id: paymentIntent.id,
          amount: amount_cents,
          currency: currency,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
        },
        payment_url: `https://checkout.stripe.com/pay/${paymentIntent.client_secret}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-booking-payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});