import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import Stripe from "npm:stripe@14.21.0";
import {
  type BookingProviderCleanupClassification,
  type ClaimedBookingProviderCleanup,
  classifyBookingProviderCleanupState,
  finalizeBookingProviderCleanupOutcome,
  parseBookingProviderCleanupClaim,
} from "../_shared/bookingProviderCleanup.ts";
import { getStripeSecretKey } from "../_shared/stripeValidation.ts";

const CLAIM_TTL_SECONDS = 120;
const RETRY_AFTER_SECONDS = 300;
const JSON_HEADERS = { "Content-Type": "application/json" };

interface CleanupResult {
  success: boolean;
  errorCode: string | null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function retryable(errorCode: string): CleanupResult {
  return { success: false, errorCode };
}

async function processClaim(
  claim: ClaimedBookingProviderCleanup,
  verifySideEffectFence: () => Promise<boolean>,
): Promise<CleanupResult> {
  // The mode comes only from the service-role RPC claim. This endpoint never
  // parses a request body, so callers cannot influence Stripe key selection.
  const stripeKey = getStripeSecretKey(claim.stripe_mode);
  if (!stripeKey) {
    return retryable("STRIPE_SECRET_KEY_MISSING");
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    maxNetworkRetries: 0,
    timeout: 20_000,
  });

  let classification: BookingProviderCleanupClassification;
  if (claim.provider_kind === "checkout_session") {
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(
        claim.provider_object_id,
      );
    } catch {
      return retryable("PROVIDER_RETRIEVE_FAILED");
    }

    classification = classifyBookingProviderCleanupState({
      providerKind: "checkout_session",
      status: session.status,
      paymentStatus: session.payment_status,
    });
  } else {
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(
        claim.provider_object_id,
      );
    } catch {
      return retryable("PROVIDER_RETRIEVE_FAILED");
    }

    classification = classifyBookingProviderCleanupState({
      providerKind: "payment_intent",
      status: paymentIntent.status,
    });
  }

  if (classification.outcome === "success") {
    return { success: true, errorCode: null };
  }
  if (
    classification.outcome === "permanent_failure" ||
    classification.outcome === "retryable_failure"
  ) {
    return { success: false, errorCode: classification.errorCode };
  }

  // The provider read above can take seconds. Re-check the database lease and
  // settlement state immediately before the irreversible Stripe side effect.
  if (!await verifySideEffectFence()) {
    return retryable("PROVIDER_CLEANUP_FENCE_LOST");
  }

  try {
    if (classification.action === "expire_checkout_session") {
      await stripe.checkout.sessions.expire(claim.provider_object_id);
    } else {
      await stripe.paymentIntents.cancel(claim.provider_object_id);
    }
    return { success: true, errorCode: null };
  } catch {
    return retryable(
      classification.action === "expire_checkout_session"
        ? "PROVIDER_EXPIRE_FAILED"
        : "PROVIDER_CANCEL_FAILED",
    );
  }
}

serve(async (req) => {
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
  if (
    internalSecret.length === 0 ||
    req.headers.get("x-internal-secret") !== internalSecret
  ) {
    return jsonResponse({ success: false, error: "unauthorized" }, 401);
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "service_unavailable" }, 503);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: claimData, error: claimError } = await serviceClient.rpc(
      "claim_booking_payment_provider_cleanup",
      { p_limit: 1, p_lease_seconds: CLAIM_TTL_SECONDS },
    );
    if (claimError) {
      console.error("Booking provider cleanup claim failed", {
        code: claimError.code ?? "unknown",
      });
      return jsonResponse({ success: false, error: "claim_failed" }, 500);
    }

    const claim = parseBookingProviderCleanupClaim(claimData);
    if (!claim) {
      console.error("Booking provider cleanup claim returned an invalid shape");
      return jsonResponse(
        { success: false, error: "invalid_claim_shape" },
        500,
      );
    }
    if (claim.outcome === "empty") {
      return jsonResponse({ success: true, outcome: "empty", processed: 0 });
    }

    let cleanupResult: CleanupResult;
    try {
      cleanupResult = await processClaim(claim, async () => {
        const { data, error } = await serviceClient.rpc(
          "verify_booking_payment_provider_cleanup_claim",
          {
            p_job_id: claim.job_id,
            p_claim_token: claim.claim_token,
          },
        );
        return !error && data?.outcome === "authorized";
      });
    } catch {
      cleanupResult = retryable("PROVIDER_CLEANUP_UNEXPECTED_ERROR");
    }

    const { data: finalizeData, error: finalizeError } = await serviceClient
      .rpc(
        "finalize_booking_payment_provider_cleanup",
        {
          p_job_id: claim.job_id,
          p_claim_token: claim.claim_token,
          p_succeeded: cleanupResult.success,
          p_provider_result: cleanupResult.success ? "provider_cleaned" : null,
          p_error_code: cleanupResult.errorCode,
          p_retry_delay_seconds: RETRY_AFTER_SECONDS,
        },
      );
    const finalizeOutcome = finalizeBookingProviderCleanupOutcome(finalizeData);
    if (finalizeError || !finalizeOutcome) {
      console.error("Booking provider cleanup finalize failed", {
        queueId: claim.job_id,
        code: finalizeError?.code ?? "claim_not_current",
      });
      return jsonResponse({ success: false, error: "finalize_failed" }, 500);
    }

    console.log("Booking provider cleanup finalized", {
      queueId: claim.job_id,
      providerKind: claim.provider_kind,
      attemptCount: claim.attempt_count,
      cleanupSuccess: cleanupResult.success,
      errorCode: cleanupResult.errorCode,
    });
    const humanActionRequired = finalizeOutcome.humanActionRequired;
    return jsonResponse({
      success: true,
      outcome: finalizeOutcome.outcome,
      processed: 1,
      job_id: claim.job_id,
      provider_kind: claim.provider_kind,
      cleanup_success: cleanupResult.success,
      error_code: cleanupResult.errorCode,
      human_action_required: humanActionRequired,
    }, humanActionRequired ? 207 : 200);
  } catch {
    console.error("Booking provider cleanup processor failed unexpectedly");
    return jsonResponse({ success: false, error: "internal_error" }, 500);
  }
});
