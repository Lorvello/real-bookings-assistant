import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import { z } from "npm:zod@3.23.8";
import {
  type BookingEmailLocale,
  buildBookingConfirmationEmail,
} from "./emailTemplate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const requestSchema = z.object({
  booking_id: z.string().uuid(),
}).strict();

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
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
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  const hasServiceRole = serviceRoleKey.length > 0 && bearer === serviceRoleKey;
  const hasInternalSecret = internalSecret.length > 0 &&
    req.headers.get("x-internal-secret") === internalSecret;
  if (!hasServiceRole && !hasInternalSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonResponse({
      success: false,
      error: "Invalid booking confirmation request",
    }, 400);
  }
  const bookingId = parsed.data.booking_id;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  let claimToken: string | null = null;
  const finalize = async (
    status: "delivered" | "skipped" | "failed",
    providerMessageId: string | null = null,
    errorCode: string | null = null,
  ) => {
    if (!claimToken) return;
    const { data, error } = await supabase.rpc(
      "finalize_booking_confirmation_delivery",
      {
        p_booking_id: bookingId,
        p_claim_token: claimToken,
        p_status: status,
        p_provider_message_id: providerMessageId,
        p_error_code: errorCode,
      },
    );
    if (error || data !== true) {
      throw new Error("BOOKING_CONFIRMATION_FINALIZE_FAILED");
    }
    claimToken = null;
  };

  try {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id,calendar_id,service_type_id,customer_name,customer_email,customer_locale,start_time,status",
      )
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingError || !booking) {
      return jsonResponse({
        success: false,
        error: "Booking not found",
      }, 404);
    }
    if (!["pending", "confirmed"].includes(booking.status)) {
      return jsonResponse({
        success: false,
        error: "Booking is not eligible for a confirmation email",
        code: "BOOKING_CONFIRMATION_NOT_ALLOWED",
      }, 409);
    }

    const { data: claim, error: claimError } = await supabase.rpc(
      "claim_booking_confirmation_delivery",
      { p_booking_id: bookingId },
    );
    if (claimError || !claim) {
      throw new Error("BOOKING_CONFIRMATION_CLAIM_FAILED");
    }
    if (claim.claimed !== true) {
      return jsonResponse({
        success: true,
        duplicate: true,
        delivery_status: claim.status,
      }, 200);
    }
    claimToken = claim.claim_token;

    const recipient = typeof booking.customer_email === "string"
      ? booking.customer_email.trim()
      : "";
    if (
      !recipient ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ||
      /[\r\n]/.test(recipient)
    ) {
      await finalize("skipped");
      return jsonResponse({
        success: true,
        skipped: true,
        reason: "no_valid_customer_email",
      }, 200);
    }

    const [{ data: overview }, { data: serviceType }] = await Promise.all([
      supabase
        .from("business_overview")
        .select(
          "business_name,timezone,business_city,business_street,business_number",
        )
        .eq("calendar_id", booking.calendar_id)
        .maybeSingle(),
      booking.service_type_id
        ? supabase
          .from("service_types")
          .select("name")
          .eq("id", booking.service_type_id)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const address = [
      [overview?.business_street, overview?.business_number]
        .filter(Boolean)
        .join(" "),
      overview?.business_city,
    ].filter(Boolean).join(", ");
    const locale: BookingEmailLocale = booking.customer_locale === "en"
      ? "en"
      : "nl";
    const email = buildBookingConfirmationEmail({
      locale,
      customerName: booking.customer_name,
      businessName: overview?.business_name,
      serviceName: serviceType?.name ?? null,
      startTime: booking.start_time,
      timezone: overview?.timezone,
      address,
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    if (!resendApiKey) {
      await finalize("failed", null, "RESEND_NOT_CONFIGURED");
      return jsonResponse({
        success: false,
        error: "Booking confirmation delivery is not configured",
      }, 503);
    }

    let providerResponse: Response;
    try {
      providerResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `booking-confirmation/${bookingId}`,
        },
        body: JSON.stringify({
          from: `${email.fromName} <noreply@bookingsassistant.com>`,
          to: [recipient],
          subject: email.subject,
          html: email.html,
          text: email.text,
          tags: [{ name: "booking_id", value: bookingId }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      await finalize("failed", null, "RESEND_NETWORK_ERROR");
      console.error("[BOOKING-CONFIRMATION] Provider request failed", {
        bookingId,
        error: error instanceof Error ? error.name : "unknown",
      });
      return jsonResponse({
        success: false,
        error: "Booking confirmation delivery failed",
      }, 502);
    }

    const providerBody = await providerResponse.json().catch(() => ({}));
    const providerMessageId = typeof providerBody?.id === "string"
      ? providerBody.id
      : null;
    if (!providerResponse.ok || !providerMessageId) {
      await finalize(
        "failed",
        null,
        `RESEND_HTTP_${providerResponse.status}`,
      );
      console.error("[BOOKING-CONFIRMATION] Provider rejected request", {
        bookingId,
        status: providerResponse.status,
      });
      return jsonResponse({
        success: false,
        error: "Booking confirmation delivery failed",
      }, 502);
    }

    await finalize("delivered", providerMessageId);
    console.log("[BOOKING-CONFIRMATION] Delivered", {
      bookingId,
      providerMessageId,
    });
    return jsonResponse({
      success: true,
      delivery_status: "delivered",
      message_id: providerMessageId,
    }, 200);
  } catch (error) {
    if (claimToken) {
      try {
        await finalize(
          "failed",
          null,
          error instanceof Error ? error.message : "UNKNOWN_ERROR",
        );
      } catch (finalizeError) {
        console.error("[BOOKING-CONFIRMATION] Finalize failed", {
          bookingId,
          error: finalizeError instanceof Error
            ? finalizeError.message
            : "unknown",
        });
      }
    }
    console.error("[BOOKING-CONFIRMATION] Request failed", {
      bookingId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return jsonResponse({
      success: false,
      error: "Booking confirmation delivery failed",
    }, 500);
  }
});
