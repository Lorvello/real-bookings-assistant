import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { validateStripeConfig } from "../_shared/stripeValidation.ts";
import { getCurrentPeriodEndISO } from "../_shared/subscriptionPeriod.ts";
import { resolveConfiguredSubscriptionTier } from "../_shared/subscriptionTierResolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function logStep(step: string, details?: Record<string, unknown>): void {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
}

function emptyBillingProjection(overrides: Record<string, unknown> = {}) {
  return {
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
    subscription_status: "expired",
    stripe_status: null,
    stripe_subscription_id: null,
    cancel_at_period_end: false,
    payment_status: "unpaid",
    billing_cycle: null,
    next_billing_date: null,
    last_payment_date: null,
    last_payment_amount: null,
    billing_history: [],
    ...overrides,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // This endpoint is a projection only. Webhooks and the checkout-verification RPC
  // are the sole entitlement writers; polling may read canonical identity and Stripe.
  const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Authentication required" }, 401);
    }

    const { data: userData, error: userError } = await supabaseClient.auth
      .getUser(authHeader.slice("Bearer ".length));
    if (userError || !userData.user?.email) {
      return json({ error: "Invalid authentication" }, 401);
    }
    const user = userData.user;

    const stripeConfig = await validateStripeConfig(
      undefined,
      supabaseUrl,
      serviceRoleKey,
    );
    const stripeMode = stripeConfig.mode;

    const [profileRead, subscriberRead] = await Promise.all([
      supabaseClient
        .from("users")
        .select("subscription_status,subscription_tier,trial_end_date")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseClient
        .from("subscribers")
        .select(
          "user_id,stripe_customer_id,stripe_subscription_id,stripe_mode",
        )
        .eq("user_id", user.id)
        .eq("stripe_mode", stripeMode)
        .maybeSingle(),
    ]);
    if (profileRead.error || subscriberRead.error) {
      throw new Error("SUBSCRIPTION_IDENTITY_READ_FAILED");
    }

    const profile = profileRead.data;
    const subscriber = subscriberRead.data;
    const trialStillActive = profile?.subscription_status === "trial" &&
      typeof profile.trial_end_date === "string" &&
      new Date(profile.trial_end_date).getTime() > Date.now();

    if (!subscriber?.stripe_subscription_id) {
      if (trialStillActive) {
        return json(emptyBillingProjection({
          subscription_tier: profile.subscription_tier,
          subscription_status: "trial",
          payment_status: "trialing",
          trial_end_date: profile.trial_end_date,
        }));
      }

      return json(emptyBillingProjection({
        subscription_status: profile?.subscription_status ?? "expired",
      }));
    }
    if (!subscriber.stripe_customer_id) {
      throw new Error("SUBSCRIPTION_PROVIDER_IDENTITY_INCOMPLETE");
    }

    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: "2023-10-16",
    });
    const subscription = await stripe.subscriptions.retrieve(
      subscriber.stripe_subscription_id,
    );
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
    const expectedLivemode = stripeMode === "live";

    if (subscription.livemode !== expectedLivemode) {
      throw new Error("SUBSCRIPTION_PROVIDER_MODE_MISMATCH");
    }
    if (customerId !== subscriber.stripe_customer_id) {
      throw new Error("SUBSCRIPTION_PROVIDER_CUSTOMER_MISMATCH");
    }
    if (
      subscription.metadata?.user_id &&
      subscription.metadata.user_id !== user.id
    ) {
      throw new Error("SUBSCRIPTION_PROVIDER_USER_MISMATCH");
    }

    const stripeStatus = subscription.status;
    const subscribed = stripeStatus === "active" || stripeStatus === "trialing";
    const cancelPending = subscribed &&
      subscription.cancel_at_period_end === true;
    const subscriptionStatus = cancelPending
      ? "canceled"
      : subscribed
      ? "active"
      : [
          "past_due",
          "unpaid",
          "incomplete",
          "incomplete_expired",
          "paused",
        ].includes(stripeStatus)
      ? "missed_payment"
      : stripeStatus === "canceled"
      ? "canceled"
      : "expired";
    const subscriptionEnd = getCurrentPeriodEndISO(subscription);
    const billingCycle =
      subscription.items.data[0]?.price?.recurring?.interval ??
        null;

    let subscriptionTier: string | null = null;
    if (subscribed) {
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
      subscriptionTier = resolveConfiguredSubscriptionTier(
        tiers,
        priceId,
        stripeMode,
        metadataTier,
      );
    }

    let lastPaymentDate: string | null = null;
    let lastPaymentAmount: number | null = null;
    let billingHistory: Array<Record<string, unknown>> = [];
    try {
      const invoices = await stripe.invoices.list({
        customer: subscriber.stripe_customer_id,
        limit: 10,
      });
      const lastPaidInvoice = invoices.data.find((invoice: Stripe.Invoice) =>
        invoice.status === "paid"
      );
      if (lastPaidInvoice) {
        lastPaymentDate = new Date(lastPaidInvoice.created * 1000)
          .toISOString();
        lastPaymentAmount = lastPaidInvoice.amount_paid;
      }
      billingHistory = invoices.data.map((invoice: Stripe.Invoice) => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000).toISOString(),
        amount: invoice.amount_paid || invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        invoice_url: invoice.hosted_invoice_url,
        description: `${subscriptionTier || "Subscription"} Plan`,
      }));
    } catch (invoiceError) {
      logStep("Invoice history unavailable", {
        code: invoiceError instanceof Error
          ? invoiceError.name
          : "unknown_error",
      });
    }

    return json({
      subscribed,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      subscription_status: subscriptionStatus,
      stripe_status: stripeStatus,
      stripe_subscription_id: subscription.id,
      cancel_at_period_end: cancelPending,
      payment_status: stripeStatus === "trialing"
        ? "trialing"
        : subscribed
        ? "paid"
        : stripeStatus === "canceled"
        ? "canceled"
        : "unpaid",
      billing_cycle: billingCycle,
      next_billing_date: subscribed ? subscriptionEnd : null,
      last_payment_date: lastPaymentDate,
      last_payment_amount: lastPaymentAmount,
      billing_history: billingHistory,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("Projection failed", { code: errorMessage });
    return json({ error: errorMessage }, 500);
  }
});
