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

    // Get booking details with complete service information including tax config
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        service_types (
          name, 
          price, 
          tax_enabled,
          tax_code,
          tax_behavior,
          applicable_tax_rate,
          business_country,
          stripe_test_price_id,
          stripe_live_price_id
        )
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
    const baseAmount = booking.total_price || booking.service_types?.price || 0;
    let amount = Math.round(baseAmount * 100);
    
    // Check if service has tax configuration and calculate tax if needed
    const service = booking.service_types;
    let taxAmount = 0;
    let automaticTaxEnabled = false;
    
    if (service?.tax_enabled && service?.tax_code && service?.applicable_tax_rate) {
      // Calculate tax based on service configuration
      if (service.tax_behavior === 'inclusive') {
        // Tax is already included in the price, calculate the tax portion
        const taxRate = service.applicable_tax_rate / 100;
        taxAmount = Math.round((baseAmount * taxRate / (1 + taxRate)) * 100);
      } else {
        // Tax is exclusive, add it to the base amount
        const taxRate = service.applicable_tax_rate / 100;
        taxAmount = Math.round((baseAmount * taxRate) * 100);
        amount = Math.round(baseAmount * 100) + taxAmount;
      }
      
      automaticTaxEnabled = true;
      console.log(`Tax calculation: Base: €${baseAmount}, Tax Rate: ${service.applicable_tax_rate}%, Tax Amount: €${taxAmount/100}, Total: €${amount/100}`);
    }

    // Get user's subscription tier for enhanced tax compliance features
    const { data: userData } = await supabaseClient
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    // Enhanced automatic tax for higher tiers with Stripe Tax API
    const useStripeTaxAPI = userData?.subscription_tier === 'professional' || 
                           userData?.subscription_tier === 'enterprise';

    // Create payment intent with advanced tax calculation
    const paymentIntentData: any = {
      amount,
      currency: booking.payment_currency || service?.business_country === 'GB' ? 'gbp' : 'eur',
      customer: user.email,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },
      metadata: {
        booking_id: booking.id,
        calendar_id: calendar_id,
        customer_email: booking.customer_email,
        service_name: service?.name || 'Appointment Service',
        subscription_tier: userData?.subscription_tier || 'starter',
        business_country: service?.business_country || 'NL',
        tax_enabled: service?.tax_enabled?.toString() || 'false',
        base_amount: baseAmount.toString(),
        tax_amount: (taxAmount / 100).toString(),
      },
    };

    // Use Stripe Tax API for professional/enterprise tiers, or manual calculation for others
    if (useStripeTaxAPI && service?.tax_enabled) {
      paymentIntentData.automatic_tax = { enabled: true };
      console.log('Using Stripe Tax API for automatic tax calculation');
    } else if (automaticTaxEnabled) {
      // Manual tax calculation is already included in the amount
      paymentIntentData.metadata.manual_tax_calculated = 'true';
      paymentIntentData.metadata.tax_rate = service?.applicable_tax_rate?.toString() || '0';
      paymentIntentData.metadata.tax_behavior = service?.tax_behavior || 'exclusive';
      console.log('Using manual tax calculation based on service configuration');
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

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