import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { validateStripeConfig } from "../_shared/stripeValidation.ts";
import {
  isAccountOwnerRequiredError,
  requireAccountOwner,
} from "../_shared/accountOwnerGuard.ts";
import { evaluatePaymentLaunchGate } from "../_shared/paymentLaunchGate.ts";
import {
  isAllowedCheckoutUrl,
  resolveSubscriptionPriceId,
  subscriptionCheckoutSchema,
  type SubscriptionTierPriceRow,
} from "./subscriptionCheckout.ts";
import {
  blocksNewSubscriptionCheckout,
  parseSubscriptionCheckoutClaim,
} from "../_shared/subscriptionCheckoutGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(
    `[CREATE-CHECKOUT] ${step}${
      details ? ` - ${JSON.stringify(details)}` : ""
    }`,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const parsedBody = subscriptionCheckoutSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsedBody.success) {
      return jsonResponse({
        error: "Invalid subscription checkout request",
        code: "INVALID_SUBSCRIPTION_CHECKOUT",
      }, 400);
    }
    const body = parsedBody.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse({
        error: "Subscription checkout is not configured",
        code: "SUBSCRIPTION_CHECKOUT_NOT_CONFIGURED",
      }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const token = authHeader.slice("Bearer ".length);
    const { data: userData, error: userError } = await supabaseAuth.auth
      .getUser(
        token,
      );
    const user = userData.user;
    if (userError || !user?.id || !user.email) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("account_owner_id")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) {
      throw new Error("SUBSCRIPTION_PROFILE_MISSING");
    }
    const accountOwnerId = requireAccountOwner(
      profile.account_owner_id,
      user.id,
    );

    // This server-owned path gate is evaluated before key selection or any Stripe
    // API call. Request-body fields, developer roles and runtime UI switches have
    // no override path.
    const gate = await evaluatePaymentLaunchGate(
      "subscription",
      accountOwnerId,
    );
    if (!gate.allowed) {
      logStep("Subscription gate blocked request", {
        tenantId: accountOwnerId,
        state: gate.state,
        code: gate.code,
        configurationHash: gate.configurationHash,
      });
      return jsonResponse({
        error: gate.reason,
        code: gate.code,
        payment_path: gate.path,
        gate_state: gate.state,
        gate_configuration_hash: gate.configurationHash,
      }, 503);
    }

    // Server mode is authoritative. A body mismatch is rejected; no admin or
    // developer can select a different Stripe key at request time.
    const stripeConfig = await validateStripeConfig(
      body.mode,
      supabaseUrl,
      supabaseServiceKey,
    );
    const stripeMode = stripeConfig.mode;

    const { data: tier, error: tierError } = await supabaseAdmin
      .from("subscription_tiers")
      .select(
        "tier_name,is_active,stripe_test_monthly_price_id,stripe_test_yearly_price_id,stripe_live_monthly_price_id,stripe_live_yearly_price_id",
      )
      .eq("tier_name", body.tier_name)
      .eq("is_active", true)
      .maybeSingle();
    if (tierError || !tier) {
      return jsonResponse({
        error: "Selected subscription tier is unavailable",
        code: "SUBSCRIPTION_TIER_UNAVAILABLE",
      }, 409);
    }

    const authoritativePriceId = resolveSubscriptionPriceId(
      tier as SubscriptionTierPriceRow,
      stripeMode,
      body.is_annual,
    );
    if (body.priceId && body.priceId !== authoritativePriceId) {
      return jsonResponse({
        error: "Subscription price does not match the selected tier",
        code: "SUBSCRIPTION_PRICE_MISMATCH",
      }, 409);
    }

    const headerOrigin = req.headers.get("origin") ?? undefined;
    const origin = isAllowedCheckoutUrl(headerOrigin)
      ? headerOrigin!
      : "https://bookingsassistant.com";
    const successUrl = isAllowedCheckoutUrl(body.success_url)
      ? body.success_url!
      : `${origin}/success`;
    const cancelUrl = isAllowedCheckoutUrl(body.cancel_url)
      ? body.cancel_url!
      : `${origin}/dashboard`;

    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: "2023-10-16",
    });

    const { data: localSubscriber, error: localSubscriberError } =
      await supabaseAdmin
        .from("subscribers")
        .select(
          "stripe_subscription_id,stripe_customer_id,stripe_mode,subscribed",
        )
        .eq("user_id", user.id)
        .maybeSingle();
    if (localSubscriberError) {
      throw new Error(
        `SUBSCRIPTION_STATE_READ_FAILED:${localSubscriberError.message}`,
      );
    }
    if (
      localSubscriber?.stripe_mode &&
      localSubscriber.stripe_mode !== stripeMode
    ) {
      return jsonResponse({
        error: "Existing subscription belongs to another Stripe environment",
        code: "SUBSCRIPTION_MODE_CONFLICT",
      }, 409);
    }

    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    const customerId = localSubscriber?.stripe_mode === stripeMode
      ? (localSubscriber.stripe_customer_id || customers.data[0]?.id)
      : customers.data[0]?.id;

    if (localSubscriber?.stripe_subscription_id) {
      try {
        const existing = await stripe.subscriptions.retrieve(
          localSubscriber.stripe_subscription_id,
        );
        if (blocksNewSubscriptionCheckout(existing.status)) {
          return jsonResponse({
            error: "Use the billing portal to change an existing subscription",
            code: "SUBSCRIPTION_ALREADY_EXISTS_USE_PORTAL",
          }, 409);
        }
      } catch (providerError) {
        const code = (providerError as { code?: string })?.code;
        if (code !== "resource_missing") throw providerError;
      }
    }

    if (customerId) {
      const providerSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });
      if (
        providerSubscriptions.data.some((subscription: Stripe.Subscription) =>
          blocksNewSubscriptionCheckout(subscription.status)
        )
      ) {
        return jsonResponse({
          error: "Use the billing portal to change an existing subscription",
          code: "SUBSCRIPTION_ALREADY_EXISTS_USE_PORTAL",
        }, 409);
      }
    }

    const cadence = body.is_annual ? "year" : "month";
    const { data: rawClaim, error: claimError } = await supabaseAdmin.rpc(
      "claim_subscription_checkout",
      {
        p_user_id: user.id,
        p_stripe_mode: stripeMode,
        p_tier_name: body.tier_name,
        p_cadence: cadence,
        p_lease_seconds: 120,
      },
    );
    if (claimError) {
      throw new Error(
        `SUBSCRIPTION_CHECKOUT_CLAIM_FAILED:${claimError.message}`,
      );
    }
    const checkoutClaim = parseSubscriptionCheckoutClaim(rawClaim);
    if (checkoutClaim.kind === "replay") {
      return jsonResponse({
        url: checkoutClaim.checkoutUrl,
        session_id: checkoutClaim.sessionId,
        mode: stripeMode,
        replay: true,
        gate_state: gate.state,
        gate_configuration_hash: gate.configurationHash,
      }, 200);
    }
    if (checkoutClaim.kind === "in_progress") {
      return jsonResponse({
        error: "A subscription checkout is already being prepared",
        code: "SUBSCRIPTION_CHECKOUT_IN_PROGRESS",
      }, 409);
    }
    if (checkoutClaim.kind === "existing_session") {
      return jsonResponse({
        error: "An unexpired subscription checkout already exists",
        code: "SUBSCRIPTION_CHECKOUT_ALREADY_CREATED",
      }, 409);
    }

    const idempotencyKey = [
      "subscription-checkout",
      user.id,
      stripeMode,
      body.tier_name,
      cadence,
      checkoutClaim.claimToken,
    ].join("-");

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        client_reference_id: user.id,
        mode: "subscription",
        line_items: [{ price: authoritativePriceId, quantity: 1 }],
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: {
            user_id: user.id,
            tier_name: body.tier_name,
            is_annual: body.is_annual ? "true" : "false",
            gate_configuration_hash: gate.configurationHash,
          },
        },
        metadata: {
          user_id: user.id,
          tier_name: body.tier_name,
          is_annual: body.is_annual ? "true" : "false",
          stripe_mode: stripeMode,
          gate_configuration_hash: gate.configurationHash,
        },
      }, { idempotencyKey });
    } catch (providerError) {
      await supabaseAdmin.rpc("fail_subscription_checkout", {
        p_user_id: user.id,
        p_stripe_mode: stripeMode,
        p_claim_token: checkoutClaim.claimToken,
        p_error_code: "stripe_session_create_failed",
      });
      throw providerError;
    }

    if (!session.url || !session.expires_at) {
      await supabaseAdmin.rpc("fail_subscription_checkout", {
        p_user_id: user.id,
        p_stripe_mode: stripeMode,
        p_claim_token: checkoutClaim.claimToken,
        p_error_code: "stripe_session_incomplete",
      });
      throw new Error("SUBSCRIPTION_CHECKOUT_SESSION_INCOMPLETE");
    }

    const { data: completed, error: completionError } = await supabaseAdmin.rpc(
      "complete_subscription_checkout",
      {
        p_user_id: user.id,
        p_stripe_mode: stripeMode,
        p_claim_token: checkoutClaim.claimToken,
        p_session_id: session.id,
        p_checkout_url: session.url,
        p_expires_at: new Date(session.expires_at * 1000).toISOString(),
      },
    );
    if (completionError || completed !== true) {
      throw new Error(
        `SUBSCRIPTION_CHECKOUT_COMPLETE_FAILED:${
          completionError?.message ?? "claim_not_current"
        }`,
      );
    }

    logStep("Subscription checkout created", {
      sessionId: session.id,
      tenantId: accountOwnerId,
      tier: body.tier_name,
      cadence: body.is_annual ? "year" : "month",
      mode: stripeMode,
      gateState: gate.state,
      configurationHash: gate.configurationHash,
    });

    return jsonResponse({
      url: session.url,
      session_id: session.id,
      mode: stripeMode,
      gate_state: gate.state,
      gate_configuration_hash: gate.configurationHash,
    }, 200);
  } catch (error) {
    const ownerDenied = isAccountOwnerRequiredError(error);
    const message = error instanceof Error ? error.message : String(error);
    logStep("Request failed", { message });

    if (ownerDenied) {
      return jsonResponse({
        error: error.message,
        code: error.code,
      }, error.status);
    }
    if (message.includes("Mode mismatch")) {
      return jsonResponse({
        error: "Requested Stripe mode does not match server configuration",
        code: "STRIPE_MODE_MISMATCH",
      }, 409);
    }
    if (
      message === "SUBSCRIPTION_PRICE_NOT_CONFIGURED" ||
      message === "SUBSCRIPTION_TIER_INACTIVE"
    ) {
      return jsonResponse({
        error: "Subscription checkout is not configured for this tier",
        code: message,
      }, 503);
    }
    return jsonResponse({
      error: "Unable to create subscription checkout",
      code: "SUBSCRIPTION_CHECKOUT_FAILED",
    }, 500);
  }
});
