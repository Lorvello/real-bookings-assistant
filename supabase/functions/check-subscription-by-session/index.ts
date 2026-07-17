import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCurrentPeriodEndISO } from "../_shared/subscriptionPeriod.ts";
import {
  normalizeStripeSubscriptionStatus,
} from "../_shared/subscriptionEvent.ts";
import {
  verifyExactSessionSubscription,
  verifySubscriptionCheckoutSession,
} from "../_shared/subscriptionSession.ts";
import { resolveConfiguredSubscriptionTier } from "../_shared/subscriptionTierResolver.ts";
import { validateStripeConfig } from "../_shared/stripeValidation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ success: false, error: "Authentication required" }, 401);
    }
    const { data: authData, error: authError } = await supabaseClient.auth
      .getUser(authHeader.slice("Bearer ".length));
    if (authError || !authData.user) {
      return json({ success: false, error: "Invalid authentication" }, 401);
    }

    const body = await req.json().catch(() => null) as {
      session_id?: unknown;
    } | null;
    const requestedSessionId = typeof body?.session_id === "string"
      ? body.session_id.trim()
      : "";
    if (!requestedSessionId) {
      return json({ success: false, error: "No session_id provided" }, 400);
    }

    const stripeConfig = await validateStripeConfig(
      undefined,
      supabaseUrl,
      serviceRoleKey,
    );
    const stripeMode = stripeConfig.mode;
    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: "2023-10-16",
    });

    const checkoutSession = await stripe.checkout.sessions.retrieve(
      requestedSessionId,
    );
    const verifiedSession = verifySubscriptionCheckoutSession(
      checkoutSession,
      requestedSessionId,
      authData.user.id,
      stripeMode,
    );

    // The session's own subscription is the only acceptable authority. Listing an
    // arbitrary active customer subscription lets an unrelated paid session pass.
    const subscription = await stripe.subscriptions.retrieve(
      verifiedSession.subscriptionId,
    );
    verifyExactSessionSubscription(subscription, verifiedSession, stripeMode);

    const priceId = subscription.items.data[0]?.price?.id;
    const metadataTier = subscription.metadata?.tier_name ??
      subscription.metadata?.tier;
    const { data: tiers, error: tierError } = await supabaseClient
      .from("subscription_tiers")
      .select(
        "tier_name,is_active,stripe_test_monthly_price_id,stripe_test_yearly_price_id,stripe_live_monthly_price_id,stripe_live_yearly_price_id",
      );
    if (tierError || !tiers) {
      throw new Error("SUBSCRIPTION_TIER_CONFIG_UNAVAILABLE");
    }
    const subscriptionTier = resolveConfiguredSubscriptionTier(
      tiers,
      priceId,
      stripeMode,
      metadataTier,
    );
    const subscriptionEnd = getCurrentPeriodEndISO(subscription);
    const normalizedStatus = normalizeStripeSubscriptionStatus(
      subscription.status,
      "created",
    );

    // One database transaction owns users + subscribers + monotonic subscription
    // state. A write error is fatal and can no longer be reported as activation.
    const { data: applyResult, error: applyError } = await supabaseClient.rpc(
      "apply_stripe_subscription_event",
      {
        p_event_id: `checkout-session-verification:${checkoutSession.id}`,
        p_event_created: Math.max(
          checkoutSession.created ?? 0,
          subscription.created ?? 0,
        ),
        p_stripe_mode: stripeMode,
        p_event_kind: "created",
        p_subscription_id: subscription.id,
        p_customer_id: verifiedSession.customerId,
        p_user_id: verifiedSession.userId,
        p_user_email: checkoutSession.customer_details?.email ??
          authData.user.email ?? null,
        p_stripe_status: normalizedStatus,
        p_tier: subscriptionTier,
        p_period_end: subscriptionEnd,
        p_cancel_at_period_end: subscription.cancel_at_period_end === true,
      },
    );
    const applied = applyResult as { success?: boolean } | null;
    if (applyError || applied?.success !== true) {
      throw new Error("SUBSCRIPTION_ACTIVATION_PERSISTENCE_FAILED");
    }

    // A stale callback is allowed to no-op only when the durable current state still
    // matches this exact subscription. Both reads are checked; no ignored PostgREST
    // error may reach the success response.
    const [userRead, subscriberRead] = await Promise.all([
      supabaseClient
        .from("users")
        .select(
          "subscription_status,subscription_tier,payment_status,cancel_at_period_end",
        )
        .eq("id", verifiedSession.userId)
        .maybeSingle(),
      supabaseClient
        .from("subscribers")
        .select(
          "user_id,stripe_customer_id,stripe_subscription_id,stripe_mode,subscribed,subscription_tier,subscription_end",
        )
        .eq("user_id", verifiedSession.userId)
        .maybeSingle(),
    ]);
    if (userRead.error || subscriberRead.error) {
      throw new Error("SUBSCRIPTION_ACTIVATION_READBACK_FAILED");
    }
    const userState = userRead.data;
    const subscriberState = subscriberRead.data;
    const userStateMatches = userState?.payment_status === "paid" &&
      (
        userState.subscription_status === "active" ||
        (
          userState.subscription_status === "canceled" &&
          userState.cancel_at_period_end === true
        )
      );
    const subscriberStateMatches = subscriberState?.user_id ===
        verifiedSession.userId &&
      subscriberState.stripe_customer_id === verifiedSession.customerId &&
      subscriberState.stripe_subscription_id === subscription.id &&
      subscriberState.stripe_mode === stripeMode &&
      subscriberState.subscribed === true &&
      subscriberState.subscription_tier === subscriptionTier;
    if (!userStateMatches || !subscriberStateMatches) {
      throw new Error("SUBSCRIPTION_ACTIVATION_READBACK_MISMATCH");
    }

    return json({
      success: true,
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_end: subscriberState.subscription_end ?? subscriptionEnd,
      payment_status: "paid",
      checkout_session_id: checkoutSession.id,
      stripe_subscription_id: subscription.id,
    }, 200);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-SUB-BY-SESSION] verification failed", {
      code: errorMessage,
    });
    return json({ success: false, error: errorMessage }, 500);
  }
});
