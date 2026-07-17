import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  deliverWebhook,
  isWebhookClaim,
  parseProcessWebhookRequest,
  validateWebhookEgressProxyConfig,
  type WebhookClaim,
  type WebhookEgressProxyConfig,
} from "./webhookDelivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "service_unavailable" }, 503);
  }

  let input;
  try {
    input = parseProcessWebhookRequest(await req.json());
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "invalid_request",
    }, 400);
  }

  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
  const isInternal = internalSecret.length >= 32 &&
    req.headers.get("x-internal-secret") === internalSecret;

  let userId: string | null = null;
  if (!isInternal) {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) {
      return jsonResponse(
        { success: false, error: "authentication_required" },
        401,
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error } = await authClient.auth.getUser();
    if (error || !user) {
      return jsonResponse(
        { success: false, error: "authentication_required" },
        401,
      );
    }
    userId = user.id;
  }

  if (Deno.env.get("WEBHOOK_EGRESS_ENABLED") !== "true") {
    return jsonResponse({
      success: false,
      error: "webhook_egress_not_enabled",
    }, 503);
  }

  let egressProxy: WebhookEgressProxyConfig;
  try {
    egressProxy = validateWebhookEgressProxyConfig({
      url: Deno.env.get("WEBHOOK_EGRESS_PROXY_URL") ?? "",
      token: Deno.env.get("WEBHOOK_EGRESS_PROXY_TOKEN") ?? "",
      contractVersion: Deno.env.get("WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION") ??
        "",
    });
  } catch {
    // This is a deployment failure, not a delivery attempt. Return before the
    // claim RPC so no retry budget or lease state is consumed.
    return jsonResponse({
      success: false,
      error: "webhook_egress_proxy_unavailable",
    }, 503);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: claimData, error: claimError } = await serviceClient.rpc(
    "claim_webhook_deliveries",
    {
      p_user_id: userId,
      p_calendar_id: input.calendarId ?? null,
      p_event_id: input.eventId ?? null,
      p_retry_failed: input.retryFailed,
      p_limit: input.batchSize,
    },
  );

  if (claimError) {
    const denied = claimError.code === "42501";
    console.error("Webhook claim failed", {
      code: claimError.code ?? "unknown",
    });
    return jsonResponse({
      success: false,
      error: denied ? "access_denied" : "claim_failed",
    }, denied ? 403 : 500);
  }

  if (!Array.isArray(claimData) || !claimData.every(isWebhookClaim)) {
    console.error("Webhook claim returned an invalid runtime shape");
    return jsonResponse({ success: false, error: "invalid_claim_shape" }, 500);
  }

  const claims = claimData as WebhookClaim[];
  if (claims.length === 0) {
    return jsonResponse({
      success: true,
      processed: 0,
      successful: 0,
      failed: 0,
      message: "no_claimable_deliveries",
    });
  }

  const results: Array<{ success: boolean; completed: boolean }> = [];
  // Bound peak memory: serialize, deliver and release one event envelope before
  // beginning the next. A batch cannot amplify one large legacy payload 50x.
  for (const claim of claims) {
    const delivery = await deliverWebhook(claim, {
      egressProxy,
    });
    const { data: completion, error: completionError } = await serviceClient
      .rpc(
        "complete_webhook_delivery",
        {
          p_delivery_id: claim.delivery_id,
          p_claim_token: claim.delivery_claim_token,
          p_success: delivery.success,
          p_http_status: delivery.httpStatus,
          p_error_code: delivery.errorCode,
        },
      );

    const accepted = !completionError &&
      typeof completion === "object" &&
      completion !== null &&
      (completion as Record<string, unknown>).accepted === true;

    if (!accepted) {
      console.error("Webhook completion rejected", {
        code: completionError?.code ?? "claim_not_current",
      });
    }

    results.push({
      success: delivery.success && accepted,
      completed: accepted,
    });
  }

  const successful = results.filter((result) => result.success).length;
  const failed = results.length - successful;
  const completionFailures = results.filter((result) =>
    !result.completed
  ).length;

  console.log("Webhook delivery batch completed", {
    source: input.source ?? (isInternal ? "internal" : "authenticated"),
    claimed: claims.length,
    successful,
    failed,
    completionFailures,
  });

  return jsonResponse({
    success: completionFailures === 0,
    processed: claims.length,
    successful,
    failed,
    completion_failures: completionFailures,
    events: new Set(claims.map((claim) => claim.event_id)).size,
  }, completionFailures === 0 ? 200 : 500);
});
