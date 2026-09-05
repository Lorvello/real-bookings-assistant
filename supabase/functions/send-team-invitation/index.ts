import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import { getClientIp, RateLimiter } from "../_shared/rateLimit.ts";
import {
  buildTeamInvitationEmail,
  deliverTeamInvitation,
  isTeamInvitationClaim,
  parseTeamInvitationRequest,
  resolveTeamInvitationDeliveryConfig,
  TeamInvitationConfigurationError,
  TeamInvitationProviderError,
} from "./invitationDelivery.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Security-Policy": "default-src 'none'",
  "X-Content-Type-Options": "nosniff",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const MAX_REQUEST_BYTES = 10_000;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...jsonHeaders, ...headers },
  });
}

function environment(): Record<string, string | undefined> {
  return {
    APP_ENV: Deno.env.get("APP_ENV"),
    APP_URL: Deno.env.get("APP_URL"),
    TEAM_INVITATION_DELIVERY_MODE: Deno.env.get(
      "TEAM_INVITATION_DELIVERY_MODE",
    ),
    TEAM_INVITATION_FROM_EMAIL: Deno.env.get(
      "TEAM_INVITATION_FROM_EMAIL",
    ),
    RESEND_API_KEY: Deno.env.get("RESEND_API_KEY"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "method_not_allowed" }, 405);
  }

  const declaredLength = Number(req.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES
  ) {
    return jsonResponse({ success: false, error: "request_too_large" }, 413);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "service_unavailable" }, 503);
  }

  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return jsonResponse(
      { success: false, error: "authentication_required" },
      401,
    );
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse(
      { success: false, error: "authentication_required" },
      401,
    );
  }

  let rawBody: unknown;
  try {
    const bodyText = await req.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BYTES) {
      return jsonResponse({ success: false, error: "request_too_large" }, 413);
    }
    rawBody = JSON.parse(bodyText);
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }

  let input;
  try {
    input = parseTeamInvitationRequest(rawBody);
  } catch {
    return jsonResponse({ success: false, error: "invalid_request" }, 400);
  }

  let deliveryConfig;
  try {
    deliveryConfig = resolveTeamInvitationDeliveryConfig(environment());
  } catch (error) {
    console.error("Team invitation configuration invalid", {
      code: error instanceof TeamInvitationConfigurationError
        ? error.message
        : "unknown",
    });
    return jsonResponse(
      { success: false, error: "delivery_not_configured" },
      503,
    );
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const limiter = new RateLimiter(serviceClient, {
    endpoint: "team_invitation",
    maxRequests: 10,
    windowSeconds: 900,
    blockDurationSeconds: 3600,
  });
  const rateLimit = await limiter.checkLimit(getClientIp(req), user.id);
  if (!rateLimit.allowed) {
    return RateLimiter.createRateLimitResponse(rateLimit, corsHeaders);
  }

  const { data: prepareResult, error: prepareError } = await serviceClient.rpc(
    "prepare_team_invitation_delivery",
    {
      p_user_id: user.id,
      p_request_id: input.request_id,
      p_calendar_id: input.calendar_id,
      p_email: input.email,
      p_full_name: input.full_name,
      p_role: input.role,
      p_app_base_url: deliveryConfig.appBaseUrl,
    },
  );

  if (prepareError) {
    const status = prepareError.code === "42501"
      ? 403
      : prepareError.code === "22023"
      ? 409
      : 500;
    console.error("Team invitation prepare failed", {
      code: prepareError.code ?? "unknown",
    });
    return jsonResponse({
      success: false,
      error: status === 403
        ? "access_denied"
        : status === 409
        ? "request_conflict"
        : "prepare_failed",
    }, status);
  }

  if (!isRecord(prepareResult)) {
    return jsonResponse(
      { success: false, error: "invalid_prepare_shape" },
      500,
    );
  }

  if (prepareResult.claimed !== true) {
    const resultStatus = typeof prepareResult.status === "string"
      ? prepareResult.status
      : "unknown";
    const errorCode = typeof prepareResult.error_code === "string"
      ? prepareResult.error_code
      : null;

    if (resultStatus === "delivered" || resultStatus === "recorded") {
      return jsonResponse({
        success: true,
        duplicate: true,
        delivery_status: resultStatus,
        invitation_id: prepareResult.invitation_id ?? null,
      });
    }
    if (resultStatus === "sending") {
      return jsonResponse({
        success: true,
        duplicate: true,
        in_progress: true,
        delivery_status: resultStatus,
        invitation_id: prepareResult.invitation_id ?? null,
      });
    }

    return jsonResponse({
      success: false,
      error: errorCode ?? "invitation_not_deliverable",
      delivery_status: resultStatus,
    }, 409);
  }

  if (!isTeamInvitationClaim(prepareResult)) {
    return jsonResponse({ success: false, error: "invalid_claim_shape" }, 500);
  }

  let claimOpen = true;
  const finalize = async (
    status: "delivered" | "recorded" | "failed",
    providerMessageId: string | null = null,
    errorCode: string | null = null,
  ): Promise<void> => {
    if (!claimOpen) return;
    const { data, error } = await serviceClient.rpc(
      "complete_team_invitation_delivery",
      {
        p_request_id: prepareResult.request_id,
        p_claim_token: prepareResult.claim_token,
        p_status: status,
        p_provider_message_id: providerMessageId,
        p_error_code: errorCode,
      },
    );
    if (
      error || !isRecord(data) || data.accepted !== true
    ) {
      throw new Error("TEAM_INVITATION_FINALIZE_FAILED");
    }
    claimOpen = false;
  };

  try {
    const email = buildTeamInvitationEmail(prepareResult);
    const delivery = await deliverTeamInvitation(deliveryConfig, email);
    const finalStatus = delivery.mode === "record-only"
      ? "recorded"
      : "delivered";
    await finalize(finalStatus, delivery.providerMessageId);

    console.log("Team invitation delivery completed", {
      requestId: prepareResult.request_id,
      invitationId: prepareResult.invitation_id,
      status: finalStatus,
    });
    return jsonResponse(
      {
        success: true,
        invitation_id: prepareResult.invitation_id,
        delivery_status: finalStatus,
      },
      200,
      RateLimiter.getRateLimitHeaders(rateLimit),
    );
  } catch (error) {
    const errorCode = error instanceof TeamInvitationProviderError
      ? error.code
      : error instanceof Error
      ? error.message
      : "unknown_error";
    try {
      await finalize("failed", null, errorCode);
    } catch (finalizeError) {
      console.error("Team invitation finalize failed", {
        requestId: prepareResult.request_id,
        code: finalizeError instanceof Error
          ? finalizeError.message
          : "unknown",
      });
    }
    console.error("Team invitation delivery failed", {
      requestId: prepareResult.request_id,
      invitationId: prepareResult.invitation_id,
      code: errorCode,
    });
    return jsonResponse(
      { success: false, error: "delivery_failed" },
      error instanceof TeamInvitationProviderError ? 502 : 500,
    );
  }
});
