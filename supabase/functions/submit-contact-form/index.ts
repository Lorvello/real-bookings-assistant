import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.50.0";
import { getClientIp, RateLimiter } from "../_shared/rateLimit.ts";
import * as contactDelivery from "./contactDelivery.ts";
import * as contactMeeting from "./contactMeeting.ts";
import * as contactSubmission from "./contactSubmission.ts";

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

const MAX_REQUEST_BYTES = 20_000;

function environment(): Record<string, string | undefined> {
  return {
    APP_ENV: Deno.env.get("APP_ENV"),
    CONTACT_FORM_DELIVERY_MODE: Deno.env.get("CONTACT_FORM_DELIVERY_MODE"),
    CONTACT_FORM_FROM_EMAIL: Deno.env.get("CONTACT_FORM_FROM_EMAIL"),
    CONTACT_FORM_TO_EMAIL: Deno.env.get("CONTACT_FORM_TO_EMAIL"),
    RESEND_API_KEY: Deno.env.get("RESEND_API_KEY"),
  };
}

async function recordSubmissionEvent(
  supabaseClient: SupabaseClient,
  submission: contactSubmission.ContactSubmission,
  ipAddress: string,
  deliveryMode: "send" | "record-only",
  deliveryStatus: "delivered" | "recorded" | "failed",
  providerMessageId: string | null,
): Promise<void> {
  const { error } = await supabaseClient
    .from("security_events_log")
    .insert({
      event_type: "contact_form_submission",
      ip_address: ipAddress,
      event_data: {
        submission_id: submission.submissionId,
        form_type: submission.formType,
        request_meeting: submission.requestMeeting,
        delivery_mode: deliveryMode,
        delivery_status: deliveryStatus,
        provider_message_id: providerMessageId,
      },
      severity: deliveryStatus === "failed"
        ? "warn"
        : submission.requestMeeting
        ? "warn"
        : "info",
    });

  if (error) {
    console.error("Contact submission audit write failed", {
      submissionId: submission.submissionId,
      code: error.code,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: jsonHeaders },
    );
  }

  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return new Response(
      JSON.stringify({ error: "Request too large" }),
      { status: 413, headers: jsonHeaders },
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const ipAddress = getClientIp(req);

  try {
    const rateLimiter = new RateLimiter(supabaseClient, {
      endpoint: "contact_form",
      maxRequests: 3,
      windowSeconds: 300,
      blockDurationSeconds: 1800,
      enableCaptchaThreshold: 2,
    });
    const rateLimitResult = await rateLimiter.checkLimit(ipAddress);

    if (!rateLimitResult.allowed) {
      return RateLimiter.createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const parsedSubmission = contactSubmission.contactSubmissionSchema
      .safeParse(
        rawBody,
      );
    if (!parsedSubmission.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: parsedSubmission.error.flatten(),
        }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const submission = parsedSubmission.data;
    const deliveryConfig = contactDelivery.resolveContactDeliveryConfig(
      environment(),
    );
    const email = contactSubmission.buildContactEmail(submission);
    let meetingReservation: contactMeeting.ContactMeetingReservation | null;

    try {
      meetingReservation = await contactMeeting.reserveContactMeeting(
        supabaseClient as unknown as contactMeeting.ContactMeetingRpcClient,
        submission,
      );
    } catch (error) {
      if (error instanceof contactMeeting.ContactMeetingPersistenceError) {
        console.error("Contact meeting reservation failed", {
          submissionId: submission.submissionId,
          code: error.errorCode,
        });
        return new Response(
          JSON.stringify({
            error: error.httpStatus === 409
              ? "Meeting slot is no longer available"
              : "Meeting reservation failed",
            code: error.errorCode,
          }),
          { status: error.httpStatus, headers: jsonHeaders },
        );
      }
      throw error;
    }

    try {
      const delivery = await contactDelivery.deliverContactSubmission(
        deliveryConfig,
        email,
      );
      await contactMeeting.recordContactMeetingDelivery(
        supabaseClient as unknown as contactMeeting.ContactMeetingRpcClient,
        meetingReservation,
        delivery.mode === "send" ? "delivered" : "recorded",
        delivery.providerMessageId,
      );
      await recordSubmissionEvent(
        supabaseClient,
        submission,
        ipAddress,
        delivery.mode,
        delivery.mode === "send" ? "delivered" : "recorded",
        delivery.providerMessageId,
      );

      return new Response(
        JSON.stringify({
          success: true,
          submissionId: submission.submissionId,
          status: delivery.mode === "send" ? "delivered" : "recorded",
        }),
        {
          status: 200,
          headers: {
            ...jsonHeaders,
            ...RateLimiter.getRateLimitHeaders(rateLimitResult),
          },
        },
      );
    } catch (error) {
      if (error instanceof contactDelivery.ContactDeliveryProviderError) {
        try {
          await contactMeeting.recordContactMeetingDelivery(
            supabaseClient as unknown as contactMeeting.ContactMeetingRpcClient,
            meetingReservation,
            "failed",
            null,
          );
        } catch (recordError) {
          console.error("Contact meeting failure-state write failed", {
            submissionId: submission.submissionId,
            code: recordError instanceof
                contactMeeting.ContactMeetingPersistenceError
              ? recordError.errorCode
              : "UNKNOWN",
          });
        }
        await recordSubmissionEvent(
          supabaseClient,
          submission,
          ipAddress,
          deliveryConfig.mode,
          "failed",
          null,
        );
        console.error("Contact provider delivery failed", {
          submissionId: submission.submissionId,
          status: error.status,
        });
        return new Response(
          JSON.stringify({ error: "Contact delivery failed" }),
          { status: 502, headers: jsonHeaders },
        );
      }
      throw error;
    }
  } catch (error) {
    if (
      error instanceof contactDelivery.ContactDeliveryConfigurationError
    ) {
      console.error("Contact delivery configuration invalid", {
        name: error.name,
      });
      return new Response(
        JSON.stringify({ error: "Contact delivery is not configured" }),
        { status: 503, headers: jsonHeaders },
      );
    }

    console.error("Contact form request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
