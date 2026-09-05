import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.45.0";
import { getCurrentPeriodEndISO } from "../_shared/subscriptionPeriod.ts";
import { buildWhatsappBookingPaymentRow } from "../_shared/taxReport.ts";
import { createTaxTransaction } from "../_shared/taxCalc.ts";
import {
  type BookingPaymentKind,
  bookingPaymentKind,
} from "../_shared/bookingPaymentTransition.ts";
import { parseStripeEventClaim } from "../_shared/stripeEventClaim.ts";
import { resolveConfiguredSubscriptionTier } from "../_shared/subscriptionTierResolver.ts";
import { bookingCheckoutCanConfirm } from "../_shared/bookingCheckoutStatus.ts";
import {
  assertStripeWebhookMode,
  type StripeMode,
} from "../_shared/stripeWebhookMode.ts";
import {
  normalizeStripeSubscriptionStatus,
  type SubscriptionEventKind,
  subscriptionIdFromInvoice,
} from "../_shared/subscriptionEvent.ts";
import { parseBookingPaymentProviderMetadata } from "../_shared/bookingPaymentProviderReservation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...corsHeaders, Allow: "POST, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("❌ No Stripe signature found");
      return new Response("Webhook signature verification failed", {
        status: 401,
      });
    }

    // Determine if test or live mode based on signature
    const webhookSecretTest = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
    const webhookSecretLive = Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE");

    const body = await req.text();
    let event: Stripe.Event;
    let isTestMode = false;
    // The Stripe client that VERIFIED this event (TEST or LIVE). Captured here so the
    // booking handlers can read back the PaymentIntent in the same mode (used by the
    // F-TAX-23 booking_payments insert on WhatsApp Checkout completion). Mode is NEVER
    // taken from the body: it is the secret that actually verified the signature.
    let stripe: Stripe | null = null;

    // Deno's Stripe SDK only exposes async signature verification: its
    // SubtleCryptoProvider is async-only, so the synchronous constructEvent()
    // throws "Use constructEventAsync(...)" and the fn 400s on every delivery.
    // Verify with constructEventAsync + an explicit SubtleCrypto provider.
    const cryptoProvider = Stripe.createSubtleCryptoProvider();

    // Try test mode first
    if (webhookSecretTest) {
      try {
        const stripeTest = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_TEST")!, {
          apiVersion: "2023-10-16",
        });
        event = await stripeTest.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecretTest,
          undefined,
          cryptoProvider,
        );
        isTestMode = true;
        stripe = stripeTest;
        console.log("✅ Webhook verified (TEST mode)");
      } catch (err) {
        // Try live mode
        if (webhookSecretLive) {
          try {
            const stripeLive = new Stripe(
              Deno.env.get("STRIPE_SECRET_KEY_LIVE")!,
              { apiVersion: "2023-10-16" },
            );
            event = await stripeLive.webhooks.constructEventAsync(
              body,
              signature,
              webhookSecretLive,
              undefined,
              cryptoProvider,
            );
            isTestMode = false;
            stripe = stripeLive;
            console.log("✅ Webhook verified (LIVE mode)");
          } catch (liveErr) {
            console.error(
              "❌ Webhook signature verification failed (both modes)",
              liveErr,
            );
            await logSecurityEvent(
              supabase,
              "stripe_verification_failed",
              null,
              {
                error: (liveErr as Error)?.message,
                test_error: (err as Error)?.message,
              },
            );
            return new Response(
              `Webhook Error: ${(liveErr as Error)?.message}`,
              { status: 400 },
            );
          }
        } else {
          console.error("❌ Webhook signature verification failed", err);
          await logSecurityEvent(supabase, "stripe_verification_failed", null, {
            error: (err as Error)?.message,
          });
          return new Response(`Webhook Error: ${(err as Error)?.message}`, {
            status: 400,
          });
        }
      }
    } else if (webhookSecretLive) {
      try {
        const stripeLive = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_LIVE")!, {
          apiVersion: "2023-10-16",
        });
        event = await stripeLive.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecretLive,
          undefined,
          cryptoProvider,
        );
        isTestMode = false;
        stripe = stripeLive;
        console.log("✅ Webhook verified (LIVE mode)");
      } catch (err) {
        console.error("❌ Webhook signature verification failed", err);
        await logSecurityEvent(supabase, "stripe_verification_failed", null, {
          error: (err as Error)?.message,
        });
        return new Response(`Webhook Error: ${(err as Error)?.message}`, {
          status: 400,
        });
      }
    } else {
      console.error("❌ No webhook secrets configured");
      return new Response("Webhook secrets not configured", { status: 500 });
    }

    let stripeMode: StripeMode;
    try {
      stripeMode = assertStripeWebhookMode(
        Deno.env.get("STRIPE_MODE"),
        isTestMode ? "test" : "live",
        event.livemode,
      );
    } catch (modeError) {
      const modeCode = modeError instanceof Error
        ? modeError.message
        : "STRIPE_WEBHOOK_MODE_REJECTED";
      await logSecurityEvent(supabase, "stripe_mode_rejected", null, {
        event_type: event.type,
        verified_mode: isTestMode ? "test" : "live",
        configured_mode: Deno.env.get("STRIPE_MODE") ?? "missing",
        code: modeCode,
      });
      return new Response(JSON.stringify({ received: false, code: modeCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    console.log(`📨 Processing webhook: ${event.type}`, { mode: stripeMode });

    const { data: rawClaim, error: claimErr } = await supabase.rpc(
      "claim_stripe_event",
      {
        p_event_id: event.id,
        p_event_type: event.type,
        p_lease_seconds: 300,
        p_stripe_mode: stripeMode,
      },
    );
    if (claimErr) {
      throw new Error(
        `STRIPE_EVENT_CLAIM_FAILED:${claimErr.message ?? claimErr.code}`,
      );
    }
    const eventClaim = parseStripeEventClaim(rawClaim);
    if (eventClaim.completed) {
      console.log(`↩️ Completed Stripe event ${event.id}; duplicate skipped.`);
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }
    if (!eventClaim.claimed) {
      // Another worker is still processing. A 2xx would tell Stripe to discard
      // this delivery even if that worker later fails, so explicitly request a retry.
      return new Response(
        JSON.stringify({ received: false, retry: true, reason: "in_progress" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "5",
          },
          status: 503,
        },
      );
    }
    const claimToken = eventClaim.claimToken;

    // Process event under the current lease. Only this claim token may complete
    // or fail the event; stale workers cannot acknowledge newer work.
    try {
      switch (event.type) {
        case "customer.subscription.created":
          await handleSubscriptionEvent(
            supabase,
            event.data.object as Stripe.Subscription,
            stripeMode,
            event.id,
            event.created,
            "created",
          );
          break;

        case "customer.subscription.updated":
          await handleSubscriptionEvent(
            supabase,
            event.data.object as Stripe.Subscription,
            stripeMode,
            event.id,
            event.created,
            "updated",
          );
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionEvent(
            supabase,
            event.data.object as Stripe.Subscription,
            stripeMode,
            event.id,
            event.created,
            "deleted",
          );
          break;

        case "invoice.payment_failed":
          await handlePaymentFailed(
            supabase,
            event.data.object as Stripe.Invoice,
            stripeMode,
            event.id,
            event.created,
          );
          break;

        case "invoice.payment_succeeded":
          await handlePaymentSucceeded(
            supabase,
            event.data.object as Stripe.Invoice,
            stripeMode,
            event.id,
            event.created,
          );
          break;

        case "checkout.session.completed":
          await handleCheckoutCompleted(
            supabase,
            event.data.object as Stripe.Checkout.Session,
            stripeMode,
            stripe,
          );
          break;

        case "checkout.session.async_payment_succeeded":
          await handleCheckoutCompleted(
            supabase,
            event.data.object as Stripe.Checkout.Session,
            stripeMode,
            stripe,
          );
          break;

        case "checkout.session.async_payment_failed":
        case "checkout.session.expired":
          await handleBookingCheckoutFailed(
            supabase,
            event.data.object as Stripe.Checkout.Session,
            event.type,
            stripeMode,
            event.created,
          );
          break;

        case "customer.subscription.trial_will_end":
          await handleTrialWillEnd(
            supabase,
            event.data.object as Stripe.Subscription,
          );
          break;

        // Pay & Book: een boeking-PaymentIntent (create-booking-payment) is geslaagd ->
        // bevestig de boeking + stuur de bevestigingsmail die create-booking inhield.
        case "payment_intent.succeeded":
          await handleBookingPaymentSucceeded(
            supabase,
            event.data.object as Stripe.PaymentIntent,
            stripe,
            stripeMode,
          );
          break;

        case "payment_intent.payment_failed":
          await handleBookingPaymentFailed(
            supabase,
            event.data.object as Stripe.PaymentIntent,
            stripeMode,
            event.created,
          );
          break;

        // SEQP1R31 (finding R30-1): a refund (full or partial, no distinction, Mathew's
        // decision) on a booking-payment charge must stop that booking's reminders. Never
        // handled before this: the switch had no case at all for the refund-event family, so
        // a real refund silently no-op'd (reached processed_stripe_events, i.e. passed
        // signature verification + idempotency-claim, then fell to default). Only
        // 'charge.refunded' is handled (not the sibling 'refund.created'/'refund.updated'/
        // 'charge.refund.updated' events also seen on the account): 'charge.refunded' is the
        // single event that carries the charge's CURRENT authoritative refunded/amount_refunded
        // state (idempotent to re-derive from), while the refund.* family are per-refund-object
        // deltas that would require summing across possibly-multiple partial refunds to reach
        // the same conclusion this one event already gives directly.
        case "charge.refunded":
          await handleChargeRefunded(
            supabase,
            event.data.object as Stripe.Charge,
            stripeMode,
          );
          break;

        // Connect: a merchant's account capabilities changed (finished onboarding,
        // charges/payouts enabled, etc.). Sync business_stripe_accounts so Pay & Book
        // un-disables automatically, without the merchant revisiting the settings page.
        // This is the single biggest Connect reliability gap (previously unhandled).
        case "account.updated":
          await handleAccountUpdated(
            supabase,
            event.data.object as Stripe.Account,
          );
          break;

        default:
          console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
      const { data: completed, error: completionError } = await supabase.rpc(
        "complete_stripe_event",
        { p_event_id: event.id, p_claim_token: claimToken },
      );
      if (completionError || completed !== true) {
        throw new Error(
          `STRIPE_EVENT_COMPLETE_FAILED:${
            completionError?.message ?? "claim_not_current"
          }`,
        );
      }
    } catch (procErr) {
      const { data: failed, error: failureError } = await supabase.rpc(
        "fail_stripe_event",
        {
          p_event_id: event.id,
          p_claim_token: claimToken,
          p_error_code: "stripe_event_processing_failed",
        },
      );
      if (failureError || failed !== true) {
        console.error("Failed to release Stripe event lease", {
          eventType: event.type,
          failureCode: failureError?.code ?? "claim_not_current",
        });
      }
      throw procErr;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return new Response(JSON.stringify({ error: (error as Error)?.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionEvent(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  stripeMode: StripeMode,
  eventId: string,
  eventCreated: number,
  eventKind: SubscriptionEventKind,
) {
  const stripeStatus = normalizeStripeSubscriptionStatus(
    subscription.status,
    eventKind,
  );
  const userId = subscription.metadata?.user_id || null;
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id;
  if (!customerId) {
    throw new Error(`SUBSCRIPTION_CUSTOMER_MISSING:${subscription.id}`);
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = await getTierFromPriceId(
    supabase,
    priceId,
    stripeMode === "test",
    subscription.metadata?.tier_name || subscription.metadata?.tier,
  );
  const endDateIso = getCurrentPeriodEndISO(subscription);
  let userEmail: string | null = null;
  if (userId) {
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) {
      throw new Error(
        `SUBSCRIPTION_PROFILE_READ_FAILED:${profileError.message}`,
      );
    }
    userEmail = profile?.email ?? null;
  }

  const { data: transition, error } = await supabase.rpc(
    "apply_stripe_subscription_event",
    {
      p_event_id: eventId,
      p_event_created: eventCreated,
      p_stripe_mode: stripeMode,
      p_event_kind: eventKind,
      p_subscription_id: subscription.id,
      p_customer_id: customerId,
      p_user_id: userId,
      p_user_email: userEmail,
      p_stripe_status: stripeStatus,
      p_tier: tier,
      p_period_end: endDateIso,
      p_cancel_at_period_end: subscription.cancel_at_period_end === true,
    },
  );
  if (error || transition?.success !== true) {
    throw new Error(
      `SUBSCRIPTION_STATE_TRANSITION_FAILED:${subscription.id}:${
        error?.message ?? transition?.error ?? "unknown"
      }`,
    );
  }

  await logSecurityEvent(
    supabase,
    `subscription_${eventKind}`,
    transition.userId ?? userId,
    {
      subscription_id: subscription.id,
      stripe_status: stripeStatus,
      action: transition.action,
      applied: transition.applied,
      mode: stripeMode,
    },
  );
}

async function handleSubscriptionInvoiceEvent(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  stripeMode: StripeMode,
  eventId: string,
  eventCreated: number,
  outcome: "succeeded" | "failed",
) {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) {
    console.log(`Invoice ${invoice.id} is not subscription-scoped; ignored.`);
    return;
  }
  const { data: transition, error } = await supabase.rpc(
    "apply_stripe_subscription_invoice_event",
    {
      p_event_id: eventId,
      p_event_created: eventCreated,
      p_stripe_mode: stripeMode,
      p_subscription_id: subscriptionId,
      p_outcome: outcome,
    },
  );
  if (error || transition?.success !== true) {
    throw new Error(
      `SUBSCRIPTION_INVOICE_TRANSITION_FAILED:${subscriptionId}:${
        error?.message ?? transition?.error ?? "unknown"
      }`,
    );
  }
  console.log(
    `Subscription invoice ${invoice.id}: outcome=${outcome}, action=${transition.action}.`,
  );
}

async function handlePaymentFailed(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  stripeMode: StripeMode,
  eventId: string,
  eventCreated: number,
) {
  await handleSubscriptionInvoiceEvent(
    supabase,
    invoice,
    stripeMode,
    eventId,
    eventCreated,
    "failed",
  );
}

async function handlePaymentSucceeded(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  stripeMode: StripeMode,
  eventId: string,
  eventCreated: number,
) {
  await handleSubscriptionInvoiceEvent(
    supabase,
    invoice,
    stripeMode,
    eventId,
    eventCreated,
    "succeeded",
  );
}

async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  stripeMode: StripeMode,
  stripe: Stripe | null,
) {
  console.log(`✅ Checkout completed: ${session.id}`);

  // Pay & Book: een hosted Checkout voor een BOEKING (mode=payment) draagt een
  // booking_id in de metadata en heeft GEEN subscription. Bevestig + mail de boeking.
  const bookingId = session.metadata?.booking_id;
  if (bookingId) {
    if (!bookingCheckoutCanConfirm(session.payment_status)) {
      console.log(
        `⏳ Checkout ${session.id} completed with payment_status=${session.payment_status}; booking ${bookingId} remains pending until an authoritative success event.`,
      );
      return;
    }
    await confirmBookingPaid(
      supabase,
      bookingId,
      session.payment_intent as string,
      stripe,
      null,
      bookingPaymentKind(session.metadata?.payment_type),
      stripeMode,
      session.id,
    );
    return;
  }

  const userId = session.metadata?.user_id;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error("❌ Missing user_id or subscription_id in session");
    return;
  }

  // The subscription object webhook owns entitlement and subscription identity. A
  // checkout event may arrive before or after it, so writing subscribers here would
  // create a second, non-monotonic state path.

  await logSecurityEvent(supabase, "checkout_completed", userId, {
    session_id: session.id,
    subscription_id: subscriptionId,
    mode: stripeMode,
  });

  console.log(`✅ Checkout completed for user ${userId}`);
}

async function handleBookingCheckoutFailed(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  eventType: string,
  stripeMode: StripeMode,
  eventCreated: number,
) {
  const bookingId = session.metadata?.booking_id;
  if (!bookingId) return;
  if (eventType === "checkout.session.async_payment_failed") {
    const providerOwnership = parseBookingPaymentProviderMetadata(
      session.metadata,
    );
    if (
      !providerOwnership ||
      providerOwnership.providerKind !== "checkout_session" ||
      providerOwnership.channel !== "whatsapp"
    ) {
      throw new Error(
        `BOOKING_PROVIDER_FAILURE_METADATA_MISSING:${bookingId}:${session.id}`,
      );
    }
    const { data: release, error: releaseError } = await supabase.rpc(
      "release_booking_payment_provider_after_failure",
      {
        p_booking_id: bookingId,
        p_provider_kind: "checkout_session",
        p_provider_object_id: session.id,
        p_generation: providerOwnership.generation,
        p_request_fingerprint: providerOwnership.requestFingerprint,
        p_stripe_mode: stripeMode,
        p_failure_code: "CHECKOUT_ASYNC_PAYMENT_FAILED",
      },
    );
    if (
      releaseError ||
      !["released", "replay"].includes(release?.outcome)
    ) {
      throw new Error(
        `BOOKING_PROVIDER_FAILURE_RELEASE_FAILED:${bookingId}:${session.id}:${
          releaseError?.message ?? release?.code ?? "unknown"
        }`,
      );
    }
  }
  const { data: transition, error } = await supabase.rpc(
    "record_booking_checkout_failure",
    {
      p_booking_id: bookingId,
      p_stripe_session_id: session.id,
      p_stripe_mode: stripeMode,
      p_failed_at: new Date(eventCreated * 1000).toISOString(),
    },
  );
  if (error || transition?.success !== true) {
    throw new Error(
      `BOOKING_CHECKOUT_FAILURE_RECONCILIATION_FAILED:${bookingId}:${
        error?.message ?? transition?.error ?? "unknown"
      }`,
    );
  }
  console.log(
    `${eventType}: booking ${bookingId}, action=${transition.action}.`,
  );
}

async function handleBookingPaymentFailed(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent,
  stripeMode: StripeMode,
  eventCreated: number,
) {
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) return;
  const { data: transition, error } = await supabase.rpc(
    "record_booking_payment_failure",
    {
      p_booking_id: bookingId,
      p_stripe_payment_intent_id: paymentIntent.id,
      p_stripe_mode: stripeMode,
      p_failed_at: new Date(eventCreated * 1000).toISOString(),
    },
  );
  if (error || transition?.success !== true) {
    throw new Error(
      `BOOKING_PAYMENT_FAILURE_RECONCILIATION_FAILED:${bookingId}:${
        error?.message ?? transition?.error ?? "unknown"
      }`,
    );
  }
}

async function handleTrialWillEnd(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
) {
  console.log(`⏰ Trial will end: ${subscription.id}`);

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!subscriber) {
    console.error("❌ No user found for subscription:", subscription.id);
    return;
  }

  const userId = subscriber.user_id;

  await logSecurityEvent(supabase, "trial_will_end", userId, {
    subscription_id: subscription.id,
    trial_end: subscription.trial_end,
  });

  console.log(`⏰ Trial will end notification for user ${userId}`);
}

// Pay & Book: bevestig de boeking + stuur de bevestigingsmail wanneer de boeking-
// PaymentIntent (create-booking-payment) slaagt. booking_id zit in de PI-metadata.
// Idempotent: webhook-retries mogen de boeking niet dubbel bevestigen of mailen.
async function handleBookingPaymentSucceeded(
  supabase: SupabaseClient,
  paymentIntent: Stripe.PaymentIntent,
  stripe: Stripe | null,
  stripeMode: StripeMode,
) {
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) {
    // Niet elke payment_intent.succeeded is een boeking (geen booking_id -> negeren).
    return;
  }
  console.log(
    `💳 Booking payment succeeded: PI ${paymentIntent.id} -> booking ${bookingId}`,
  );
  // The full PI is already in hand on this path, so pass it through: ensureBookingPaymentRow
  // can record the row with no extra Stripe round-trip (and no transient-retrieve failure mode).
  await confirmBookingPaid(
    supabase,
    bookingId,
    paymentIntent.id,
    stripe,
    paymentIntent,
    bookingPaymentKind(paymentIntent.metadata?.payment_type),
    stripeMode,
    null,
  );
}

// SEQP1R31 (finding R30-1, evidence launch-ready-loop/evidence/SEQ_P1_r30.md): a Stripe
// refund against a booking-payment charge must stop that booking's reminders. Mathew's
// decision (2026-07-07, "any refund stops reminders"): both full and partial refunds
// stop reminders. The exact refund state is still retained so downstream cancellation
// logic can distinguish a fully refunded booking from one with captured money remaining.
// The booking's own `status` is DELIBERATELY left untouched (never auto-cancelled): the
// reminder-side gate (claim_booking_reminder / get_due_booking_reminders, SEQP1R31
// migration) is what actually stops the send, independent of status. Redelivery is
// idempotent because each ledger is set to the state derived from Stripe's cumulative
// amount_refunded value.
async function handleChargeRefunded(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  stripeMode: StripeMode,
) {
  const bookingId = charge.metadata?.booking_id;
  if (!bookingId) {
    // Not every charge.refunded is a booking-payment charge (subscription/other Stripe
    // objects can also be refunded) -- ignore anything without our booking_id metadata,
    // same convention as handleBookingPaymentSucceeded's early-return.
    return;
  }
  console.log(
    `↩️ Charge refunded: ${charge.id} (amount_refunded=${charge.amount_refunded}/${charge.amount}) -> booking ${bookingId}`,
  );

  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : charge.payment_intent?.id;
  if (!paymentIntentId) {
    throw new Error(`REFUND_PAYMENT_INTENT_MISSING:${charge.id}:${bookingId}`);
  }
  const refundedAt = new Date().toISOString();

  // One database transaction owns monotonicity and all four affected ledgers. An
  // older partial-refund event can no longer downgrade a full refund, and a failed
  // sibling write can no longer expose a half-reconciled state.
  const { data: reconciliation, error: reconciliationError } = await supabase
    .rpc(
      "reconcile_booking_refund_v2",
      {
        p_booking_id: bookingId,
        p_stripe_payment_intent_id: paymentIntentId,
        p_refund_amount_cents: charge.amount_refunded,
        p_refunded_at: refundedAt,
        p_stripe_mode: stripeMode,
      },
    );
  if (reconciliationError || reconciliation?.success !== true) {
    throw new Error(
      `REFUND_RECONCILIATION_FAILED:${bookingId}:${
        reconciliationError?.message ?? reconciliation?.error ?? "unknown"
      }`,
    );
  }
  console.log(
    `✅ Refund reconciliation for booking ${bookingId}: status=${reconciliation.status}, applied=${reconciliation.applied}.`,
  );
}

// Gedeeld door beide betaal-routes (hosted Checkout: checkout.session.completed,
// en Elements/installments: payment_intent.succeeded). Bevestigt de boeking +
// stuurt de in create-booking ingehouden bevestigingsmail. Idempotent: webhook-
// retries én het dubbel-event (beide routes vuren soms) mogen niet dubbel mailen.
async function confirmBookingPaid(
  supabase: SupabaseClient,
  bookingId: string,
  paymentIntentId?: string | null,
  stripe?: Stripe | null,
  // Optional: the already-resolved PaymentIntent (payment_intent.succeeded carries it).
  // When supplied, ensureBookingPaymentRow skips the Stripe retrieve.
  prefetchedPi?: Stripe.PaymentIntent | null,
  paymentKind: BookingPaymentKind = "full",
  stripeMode: StripeMode = "test",
  checkoutSessionId: string | null = null,
) {
  const { data: booking, error: bookingReadError } = await supabase
    .from("bookings")
    .select("id, customer_email, customer_name")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingReadError) {
    throw new Error(
      "BOOKING_PAYMENT_READ_FAILED:" +
        (bookingReadError.message ?? bookingReadError.code),
    );
  }
  if (!booking) {
    throw new Error("BOOKING_PAYMENT_BOOKING_MISSING:" + bookingId);
  }

  if (!paymentIntentId) {
    throw new Error("BOOKING_PAYMENT_LEDGER_PI_MISSING:" + bookingId);
  }

  let authoritativePi = prefetchedPi && prefetchedPi.id === paymentIntentId
    ? prefetchedPi
    : null;
  if (!authoritativePi) {
    if (!stripe) {
      throw new Error(
        `BOOKING_PAYMENT_LEDGER_PROVIDER_UNAVAILABLE:${paymentIntentId}`,
      );
    }
    authoritativePi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["latest_charge"],
    });
  }

  // R48: settlement must carry the exact generation+fingerprint stamped by the
  // provider-creation authority. A bare booking_id is no longer enough to attach
  // an unrelated PaymentIntent to a Checkout reservation.
  const providerOwnership = parseBookingPaymentProviderMetadata(
    authoritativePi.metadata,
  );
  if (!providerOwnership) {
    throw new Error(
      `BOOKING_PROVIDER_SETTLEMENT_METADATA_MISSING:${paymentIntentId}`,
    );
  }
  const destinationAccountId = typeof authoritativePi.transfer_data
      ?.destination === "string"
    ? authoritativePi.transfer_data.destination
    : authoritativePi.transfer_data?.destination?.id;
  if (!destinationAccountId) {
    throw new Error(
      `BOOKING_PAYMENT_LEDGER_DESTINATION_MISSING:${paymentIntentId}`,
    );
  }
  const providerObjectId = providerOwnership.providerKind === "payment_intent"
    ? paymentIntentId
    : checkoutSessionId;
  const { data: providerAuthorization, error: providerAuthorizationError } =
    await supabase.rpc("authorize_booking_payment_provider_settlement", {
      p_booking_id: bookingId,
      p_provider_kind: providerOwnership.providerKind,
      p_provider_object_id: providerObjectId,
      p_generation: providerOwnership.generation,
      p_request_fingerprint: providerOwnership.requestFingerprint,
      p_payment_intent_id: paymentIntentId,
      p_amount_cents: authoritativePi.amount,
      p_currency: authoritativePi.currency,
      p_stripe_mode: stripeMode,
      p_destination_account_id: destinationAccountId,
    });
  if (
    providerAuthorizationError ||
    !["authorized", "replay"].includes(providerAuthorization?.outcome)
  ) {
    throw new Error(
      `BOOKING_PROVIDER_SETTLEMENT_NOT_AUTHORIZED:${paymentIntentId}:${
        providerAuthorizationError?.message ??
          providerAuthorization?.code ?? "unknown"
      }`,
    );
  }

  // Both charge paths need a canonical booking_payments row before the database can
  // atomically settle or reconcile the PaymentIntent.
  await ensureBookingPaymentRow(
    supabase,
    bookingId,
    paymentIntentId,
    booking,
    stripe,
    authoritativePi,
    stripeMode,
  );

  // Cross-border filing is provider-idempotent and deliberately remains separate from
  // the local transaction. Local money truth is committed only by the RPC below.
  await recordTaxFilingTransactionIfPending(stripe, authoritativePi);

  const { data: transition, error: transitionError } = await supabase.rpc(
    "finalize_booking_payment_success_v2",
    {
      p_booking_id: bookingId,
      p_stripe_payment_intent_id: paymentIntentId,
      p_payment_kind: paymentKind,
      p_paid_at: new Date().toISOString(),
      p_stripe_mode: stripeMode,
    },
  );

  if (transitionError || transition?.success !== true) {
    throw new Error(
      "BOOKING_PAYMENT_SUCCESS_RECONCILIATION_FAILED:" +
        paymentIntentId +
        ":" +
        (transitionError?.message ?? transition?.error ?? "unknown"),
    );
  }

  if (transition.shouldDeliverConfirmation !== true) {
    console.log(
      "Booking payment transition stopped safely: booking=" +
        bookingId +
        ", PI=" +
        paymentIntentId +
        ", action=" +
        (transition.action ?? "unknown") +
        ", payment_status=" +
        (transition.bookingPaymentStatus ?? "unknown") +
        ".",
    );
    return;
  }

  // Delivery has its own durable claim and provider idempotency. Throwing keeps the
  // Stripe event retryable when the provider call fails after the payment transaction.
  await deliverBookingConfirmation(supabase, bookingId);
  console.log(
    "Booking " +
      bookingId +
      " payment finalized atomically as " +
      transition.bookingPaymentStatus +
      ".",
  );
}
async function deliverBookingConfirmation(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke(
    "send-booking-confirmation",
    { body: { booking_id: bookingId } },
  );
  if (error || data?.success !== true) {
    throw new Error(
      `BOOKING_CONFIRMATION_DELIVERY_FAILED:${bookingId}:${
        error?.message ?? data?.error ?? "unknown"
      }`,
    );
  }
}

// F-TAX-23: idempotently INSERT the booking_payments row for a paid booking when one
// does not already exist, so the WhatsApp / hosted-Checkout pay-and-book path becomes
// visible to the tax filing reports (which read FROM booking_payments). The web path
// (create-booking-payment) already inserts this row up front, so this is a no-op there.
//
// Idempotency (HARD requirement): the insert is an upsert on the UNIQUE
// stripe_payment_intent_id with ignoreDuplicates, so a webhook retry, the dual-event
// case (checkout.session.completed AND payment_intent.succeeded both fire for one
// booking), and an already-existing web-path row can NEVER create a second row or
// double-count in the reports.
//
// Charge economics are NOT touched: this only mirrors the already-charged PI into the
// app's own booking_payments ledger; amount/fee/transfer were fixed at charge time by
// whatsapp-payment-handler. The PI is READ (platform context) to copy its authoritative
// amount/currency/destination; no money action is taken.
// CROSS-BORDER (X3b-1): reconstruct the three X1 persistence values from the markers
// whatsapp-payment-handler stamped onto the PI metadata. tax_breakdown is carried as a
// compact JSON string; we parse it defensively. If it is absent OR unparseable (e.g. a
// 500-char Stripe-metadata truncation on an unusually long breakdown), we DO NOT silently
// drop the tax outcome: we reconstruct a minimal breakdown from the discrete guard /
// reverse-charge markers + customer_country so the report (X6) still surfaces the right
// line (reverse-charge 0% / cross-border-unavailable / domestic-unavailable) instead of a
// fake clean 0%. in_person / domestic charges carry no markers -> null/null/false.
function readCrossBorderMarkers(pi: Stripe.PaymentIntent): {
  customerCountry: string | null;
  taxBreakdown: unknown | null;
  reverseCharge: boolean;
} {
  const meta = (pi.metadata ?? {}) as Record<string, string>;
  const customerCountry = typeof meta.customer_country === "string" &&
      meta.customer_country.length === 2
    ? meta.customer_country.toUpperCase()
    : null;
  const reverseCharge = meta.reverse_charge === "true";

  let taxBreakdown: unknown | null = null;
  const rawBreakdown = typeof meta.tax_breakdown === "string"
    ? meta.tax_breakdown
    : "";
  if (rawBreakdown) {
    try {
      const parsed = JSON.parse(rawBreakdown);
      if (Array.isArray(parsed)) taxBreakdown = parsed;
    } catch (_e) {
      // Unparseable (truncated) -> fall through to the marker-based reconstruction below.
      taxBreakdown = null;
    }
  }

  // No usable breakdown but a guard / reverse-charge marker is present -> reconstruct a
  // minimal one so the outcome is never lost (never a silent clean 0%).
  if (!taxBreakdown) {
    const reason = meta.cross_border_status || meta.domestic_status ||
      (reverseCharge ? "reverse_charge" : null);
    if (reason) {
      taxBreakdown = [{
        amountCents: 0,
        inclusive: false,
        taxabilityReason: reason,
        country: customerCountry,
        percentageDecimal: null,
        taxType: null,
      }];
    }
  }

  return { customerCountry, taxBreakdown, reverseCharge };
}

async function ensureBookingPaymentRow(
  supabase: SupabaseClient,
  bookingId: string,
  paymentIntentId: string | null | undefined,
  booking: { customer_email?: string | null; customer_name?: string | null },
  stripe?: Stripe | null,
  prefetchedPi?: Stripe.PaymentIntent | null,
  stripeMode: StripeMode = "test",
) {
  // No PI id (legacy conversation-only flow) -> nothing to key the row on; skip.
  if (!paymentIntentId) return;

  // Already recorded (web path inserted it, or a prior delivery did) -> no-op.
  // (The UNIQUE(stripe_payment_intent_id) upsert below is the actual race guard; this
  // pre-check just avoids the Stripe retrieve + a write attempt on the common case.)
  const { data: existing, error: existingError } = await supabase
    .from("booking_payments")
    .select("id,stripe_mode")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (existingError) {
    throw new Error(
      `BOOKING_PAYMENT_LEDGER_READ_FAILED:${
        existingError.message ?? existingError.code
      }`,
    );
  }
  if (existing) {
    if (existing.stripe_mode && existing.stripe_mode !== stripeMode) {
      throw new Error(
        `BOOKING_PAYMENT_LEDGER_MODE_CONFLICT:${paymentIntentId}`,
      );
    }
    return;
  }

  // Resolve the PI's authoritative figures (amount, currency, the connected destination
  // account the reports filter by, fee). On payment_intent.succeeded the PI is already in
  // hand (prefetchedPi). Otherwise (checkout.session.completed) retrieve it on the PLATFORM
  // account (destination charges live there, the F-TAX-21 seam) via the verifying client.
  let pi: Stripe.PaymentIntent;
  if (prefetchedPi && prefetchedPi.id === paymentIntentId) {
    pi = prefetchedPi;
  } else {
    if (!stripe) {
      throw new Error(
        `BOOKING_PAYMENT_LEDGER_PROVIDER_UNAVAILABLE:${paymentIntentId}`,
      );
    }
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
    } catch (err) {
      throw new Error(
        `BOOKING_PAYMENT_LEDGER_PROVIDER_READ_FAILED:${
          (err as Error)?.message ?? "unknown"
        }`,
      );
    }
  }

  if (pi.livemode !== (stripeMode === "live")) {
    throw new Error(
      `BOOKING_PAYMENT_PROVIDER_MODE_CONFLICT:${paymentIntentId}`,
    );
  }

  // Only record a SETTLED charge as 'succeeded'. An async method (SEPA debit, or an iDEAL
  // that resolves to 'processing') can complete the Checkout session before the money
  // clears; recording it 'succeeded' would surface it in the VAT filing report before it
  // settles. The reports filter status IN (succeeded, completed), so a not-yet-succeeded
  // PI is simply not recorded here; the later payment_intent.succeeded event (which carries
  // the PI with status 'succeeded') backfills the row. iDEAL/card (BA's default methods)
  // are synchronous, so the row is created on first delivery.
  if (pi.status !== "succeeded") {
    console.log(
      `F-TAX-23: PI ${paymentIntentId} status '${pi.status}' not yet succeeded; deferring booking_payments row to payment_intent.succeeded.`,
    );
    return;
  }

  // The connected account this destination charge transfers to == the value the tax
  // reports filter booking_payments.stripe_account_id by. Read it from the PI itself.
  const connectedAccountId = typeof pi.transfer_data?.destination === "string"
    ? pi.transfer_data.destination
    : (pi.transfer_data?.destination as { id?: string } | undefined)?.id;

  if (!connectedAccountId) {
    throw new Error(
      `BOOKING_PAYMENT_LEDGER_DESTINATION_MISSING:${paymentIntentId}`,
    );
  }

  // payment_method_type is a display/CSV column on the reports (tax math is unaffected).
  // Only record it from the ACTUAL charge; if latest_charge is not expanded/available,
  // leave it null (the reports default to 'card' when null) rather than guessing from the
  // OFFERED payment_method_types list, which would mislabel the method actually used.
  const latestCharge =
    (pi.latest_charge && typeof pi.latest_charge === "object")
      ? pi.latest_charge as Stripe.Charge
      : null;
  const paymentMethodType = latestCharge?.payment_method_details?.type ?? null;

  // CROSS-BORDER (X3b-1): read the cross-border markers whatsapp-payment-handler stamped
  // onto the PI metadata and persist the three X1 columns onto the row, so a remote
  // WhatsApp charge is report-visible per-jurisdiction (X6), not just a blended figure.
  // The web path (create-booking-payment) inserts these columns up front; the WhatsApp
  // path's only inserter is THIS function, so the persistence lands here. in_person /
  // domestic charges carry no markers -> null/null/false (byte-identical to before).
  const cb = readCrossBorderMarkers(pi);

  const row = {
    ...buildWhatsappBookingPaymentRow({
      bookingId,
      paymentIntentId,
      connectedAccountId,
      amountCents: pi.amount,
      currency: pi.currency,
      applicationFeeCents: pi.application_fee_amount ?? 0,
      customerEmail: booking.customer_email ?? null,
      customerName: booking.customer_name ?? null,
      paymentMethodType,
      customerCountry: cb.customerCountry,
      taxBreakdown: cb.taxBreakdown,
      reverseCharge: cb.reverseCharge,
    }),
    stripe_mode: stripeMode,
  };

  // Upsert on the UNIQUE PI id; ignoreDuplicates makes a concurrent dual-event / retry
  // a no-op instead of a 23505 or a second row.
  const { error: insertErr } = await supabase
    .from("booking_payments")
    .upsert(row, {
      onConflict: "stripe_payment_intent_id",
      ignoreDuplicates: true,
    });

  if (insertErr) {
    throw new Error(
      `BOOKING_PAYMENT_LEDGER_WRITE_FAILED:${
        insertErr.message ?? insertErr.code
      }`,
    );
  }
  console.log(
    `F-TAX-23: recorded booking_payments row for PI ${paymentIntentId} (booking ${bookingId}, acct ${connectedAccountId}).`,
  );
}

// CROSS-BORDER (X2, case (a)): when a remote/digital service was charged with a POSITIVE
// collectible cross-border VAT, create-booking-payment stamped the PI metadata with
// `tax_calculation` (the Stripe Tax calculation id) and `tax_transaction_pending=true`.
// On payment success we record the filing transaction (transactions/create_from_calculation)
// so the calc becomes a recorded liability for the OSS/VAT return.
//
// Idempotent + best-effort: Stripe dedupes on `reference` (the PI id), and a failure here
// is logged but NEVER throws (a missing filing transaction is a reporting concern, not a
// money/charge concern; booking_payments.tax_breakdown already carries the figures, which
// is what the reports read). This path is REGISTRATION-GATED (D-CB-REG): until the merchant
// activates Stripe Tax + an OSS/destination registration on the connected account, Stripe
// returns not_collecting cross-border and `tax_transaction_pending` is never set, so this
// is a no-op. The code path exists so it works the moment registration clears.
async function recordTaxFilingTransactionIfPending(
  stripe: Stripe | null | undefined,
  pi: Stripe.PaymentIntent | null | undefined,
) {
  if (!stripe || !pi) return;
  const meta = pi.metadata ?? {};
  const calcId = typeof meta.tax_calculation === "string"
    ? meta.tax_calculation
    : null;
  const pending = meta.tax_transaction_pending === "true";
  if (!calcId || !pending) return;

  const connectedAccountId = typeof pi.transfer_data?.destination === "string"
    ? pi.transfer_data.destination
    : (pi.transfer_data?.destination as { id?: string } | undefined)?.id;
  if (!connectedAccountId) return;

  const secretKey = Deno.env.get(
    (Deno.env.get("STRIPE_MODE") === "live")
      ? "STRIPE_SECRET_KEY_LIVE"
      : "STRIPE_SECRET_KEY_TEST",
  );
  if (!secretKey) {
    console.error(
      `X2: no Stripe secret key to record tax transaction for PI ${pi.id}.`,
    );
    return;
  }

  try {
    // The calculation was computed in the platform context today (connectedTaxActive
    // false), so record the transaction in the same context. When Tax is active on the
    // connected account this flips to the connected context with the Stripe-Account header.
    const txId = await createTaxTransaction({
      stripeSecretKey: secretKey,
      calculationId: calcId,
      reference: pi.id,
      connectedAccountId,
      connectedTaxActive: false,
    });
    console.log(
      `X2: recorded Stripe Tax transaction ${txId} for PI ${pi.id} (calc ${calcId}).`,
    );
  } catch (err) {
    console.error(
      `X2: failed to record Stripe Tax transaction for PI ${pi.id} (non-fatal):`,
      (err as Error)?.message,
    );
  }
}

async function getTierFromPriceId(
  supabase: SupabaseClient,
  priceId: string | undefined,
  isTestMode: boolean,
  metadataTier?: string | null,
): Promise<string> {
  const { data: tiers, error } = await supabase
    .from("subscription_tiers")
    .select(
      "tier_name,is_active,stripe_test_monthly_price_id,stripe_test_yearly_price_id,stripe_live_monthly_price_id,stripe_live_yearly_price_id",
    );
  if (error || !tiers) {
    throw new Error(
      `SUBSCRIPTION_TIER_CONFIG_UNAVAILABLE:${error?.message ?? "no_rows"}`,
    );
  }

  try {
    return resolveConfiguredSubscriptionTier(
      tiers,
      priceId,
      isTestMode ? "test" : "live",
      metadataTier,
    );
  } catch (error) {
    await logSecurityEvent(
      supabase,
      "subscription_tier_resolution_blocked",
      null,
      {
        priceId: priceId ?? null,
        isTestMode,
        code: error instanceof Error ? error.message : String(error),
      },
    );
    throw error;
  }
}

async function logSecurityEvent(
  supabase: SupabaseClient,
  eventType: string,
  userId: string | null,
  details: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("webhook_security_logs")
    .insert({
      event_type: `stripe_${eventType}`,
      severity:
        eventType.includes("failed") || eventType.includes("verification")
          ? "high"
          : "info",
      user_id: userId,
      event_data: {
        ...details,
        processed_at: new Date().toISOString(),
      },
    });

  if (error) {
    console.error("❌ Error logging security event:", error);
  }
}

// Connect: a merchant's account capabilities changed. Mirror them into
// business_stripe_accounts (matched by stripe_account_id) so Pay & Book un-disables
// automatically once Stripe enables charges, instead of waiting for the merchant to
// revisit the settings page and trigger a manual refresh poll.
async function handleAccountUpdated(
  supabase: SupabaseClient,
  account: Stripe.Account,
) {
  const chargesEnabled = account.charges_enabled === true;
  const payoutsEnabled = account.payouts_enabled === true;
  const detailsSubmitted = account.details_submitted === true;
  const accountStatus = chargesEnabled
    ? "active"
    : (detailsSubmitted ? "pending" : "incomplete");

  const { data, error } = await supabase
    .from("business_stripe_accounts")
    .update({
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      details_submitted: detailsSubmitted,
      onboarding_completed: detailsSubmitted,
      account_status: accountStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", account.id)
    .select("id");

  if (error) {
    console.error(`❌ account.updated sync failed for ${account.id}:`, error);
    throw new Error(
      `CONNECT_ACCOUNT_SYNC_FAILED:${account.id}:${error.message ?? error}`,
    );
  }
  if (!data || data.length === 0) {
    // An account we don't track yet (or never inserted) — not an error.
    console.log(`ℹ️ account.updated for untracked account ${account.id}`);
    return;
  }
  console.log(
    `✅ account.updated synced ${account.id}: charges=${chargesEnabled} payouts=${payoutsEnabled} details=${detailsSubmitted}`,
  );
}
