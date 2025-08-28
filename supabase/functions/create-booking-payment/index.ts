import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { booking_id, calendar_id, test_mode = false } = await req.json();

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        service_types (name, price)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Get Stripe account for this calendar
    const { data: stripeAccount } = await supabaseClient
      .from("business_stripe_accounts")
      .select("*")
      .eq("calendar_id", calendar_id)
      .eq("charges_enabled", true)
      .single();

    if (!stripeAccount) {
      throw new Error("Stripe account not connected or charges not enabled");
    }

    // Initialize Stripe with appropriate key based on mode
    const stripeKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeKey) {
      throw new Error(`Stripe ${test_mode ? 'test' : 'live'} secret key not configured`);
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Calculate amount (use booking total_price or service price)
    const amount = Math.round((booking.total_price || booking.service_types?.price || 0) * 100);

    // Create payment intent with destination charges
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: booking.payment_currency || "eur",
      customer: user.email,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },
      metadata: {
        booking_id: booking.id,
        calendar_id: calendar_id,
        customer_email: booking.customer_email,
      },
    });

    // Record payment attempt
    const { error: paymentError } = await supabaseClient
      .from("booking_payments")
      .insert({
        booking_id: booking.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_account_id: stripeAccount.stripe_account_id,
        amount_cents: amount,
        currency: paymentIntent.currency,
        status: "pending",
        customer_email: booking.customer_email,
        customer_name: booking.customer_name,
      });

    if (paymentError) {
      console.error("Error recording payment:", paymentError);
    }

    // Update booking payment status
    await supabaseClient
      .from("bookings")
      .update({
        payment_status: "pending",
        payment_required: true,
      })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});