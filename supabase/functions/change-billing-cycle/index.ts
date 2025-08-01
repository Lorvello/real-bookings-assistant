import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHANGE-BILLING-CYCLE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { newCycle, tierName } = await req.json();
    if (!newCycle || !tierName) {
      throw new Error("newCycle and tierName are required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // For billing cycle changes, redirect to checkout with new billing cycle
    const isAnnual = newCycle === 'yearly';
    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Create checkout session for the same tier but different billing cycle
    const checkoutData = {
      tier_name: tierName,
      is_annual: isAnnual,
      success_url: `${origin}/settings?tab=billing`,
      cancel_url: `${origin}/settings?tab=billing`,
      mode: 'test' // You might want to make this dynamic
    };

    const { data: checkoutResponse, error: checkoutError } = await supabaseClient.functions.invoke('create-checkout', {
      body: checkoutData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (checkoutError) throw checkoutError;

    logStep("Billing cycle change checkout created", { 
      tierName, 
      newCycle,
      checkoutUrl: checkoutResponse.url 
    });

    return new Response(JSON.stringify({ 
      success: true,
      checkoutUrl: checkoutResponse.url,
      message: `Redirecting to checkout for ${newCycle} billing`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in change-billing-cycle", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});