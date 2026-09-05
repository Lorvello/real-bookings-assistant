import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { validateStripeConfig } from "../_shared/stripeValidation.ts";
import {
  isAccountOwnerRequiredError,
  requireAccountOwner,
} from "../_shared/accountOwnerGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string) => console.log(`[CUSTOMER-PORTAL] ${step}`);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // SECURITY: pin the Stripe mode on the server STRIPE_MODE (cannot be set by
    // the client). Previously this trusted body.mode (default 'test'), so a spoofed
    // or stale client mode could mix test/live keys. Same hardening as
    // check-subscription via the shared validateStripeConfig.
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeConfig = await validateStripeConfig(
      undefined,
      supabaseUrl,
      supabaseServiceKey,
    );
    const stripeKey = stripeConfig.secretKey;
    logStep(`Stripe configuration validated (${stripeConfig.mode} mode)`);

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth
      .getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated");

    const { data: profile, error: profileError } = await supabaseClient
      .from("users")
      .select("account_owner_id")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) {
      throw new Error(
        `Failed to fetch user profile: ${
          profileError?.message ?? "profile missing"
        }`,
      );
    }
    requireAccountOwner(profile.account_owner_id, user.id);

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer");

    // SECURITY: the portal return_url comes from the Origin header, which is
    // spoofable — validate it against our own hosts (same hardening as
    // create-checkout) so it can't be turned into an off-site redirect.
    const ALLOWED_REDIRECT_HOSTS = [
      "bookingsassistant.com",
      "www.bookingsassistant.com",
      "localhost",
      "127.0.0.1",
    ];
    const headerOrigin = req.headers.get("origin");
    let originIsAllowed = false;
    try {
      originIsAllowed = !!headerOrigin &&
        ALLOWED_REDIRECT_HOSTS.includes(new URL(headerOrigin).hostname);
    } catch {
      originIsAllowed = false;
    }
    const origin = originIsAllowed
      ? headerOrigin!
      : "https://bookingsassistant.com";

    // Try to create customer portal session
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/settings?tab=billing`,
      });
      logStep("Customer portal session created");

      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (portalError) {
      const portalErrorMessage = portalError instanceof Error
        ? portalError.message
        : String(portalError);
      logStep("Customer portal request failed");

      // If customer portal is not configured, return helpful error
      if (
        portalErrorMessage.includes("Customer portal") ||
        portalErrorMessage.includes("portal")
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Customer portal is not configured in Stripe dashboard. Please contact support.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      throw portalError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const ownerDenied = isAccountOwnerRequiredError(error);
    logStep("ERROR in customer-portal");
    return new Response(
      JSON.stringify({
        error: ownerDenied ? errorMessage : "Unable to open the billing portal",
        ...(ownerDenied ? { code: error.code } : {}),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ownerDenied ? error.status : 500,
      },
    );
  }
});
