import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { parsePublicBookingCommitResult } from "../_shared/publicBookingSnapshot.ts";
import { getClientIp, RateLimiter } from "../_shared/rateLimit.ts";
import { validatePhoneServerSide } from "../_shared/phoneValidation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Inline validators for edge function
const validateBookingEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
};

const sanitizeBookingText = (text: string): string => {
  return text
    .trim()
    // Strip <> (XSS), then strip C0/C1 control characters incl. the NUL byte.
    // Postgres text columns reject NUL, so an unsanitized control char in a pasted
    // name/phone/notes threw on insert and surfaced as a raw 500 instead of a clean
    // result. Stripping them keeps the insert valid and the response graceful.
    .replace(/[<>]/g, "")
    // deno-lint-ignore no-control-regex
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .substring(0, 500);
};

// Cross-border (X3a): normalize + format-validate the optional customer tax fields before
// persisting them onto the bookings row. These are NOT a tax authority (Stripe decides the
// rate / reverse-charge in create-booking-payment); we only sanitize shape so a malformed
// value never reaches the DB or Stripe. A value that fails the basic format is DROPPED
// (treated as not supplied) rather than 400ing the whole booking: for a remote service a
// missing country is caught later by create-booking-payment (400), and a bogus VAT-ID is
// simply ignored by Stripe (no reverse-charge). This keeps a typo from blocking the book
// step while never letting unvalidated input through.
// country: ISO-3166 alpha-2 (exactly two ASCII letters) -> uppercase, else null.
const normalizeCountry = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
};
// VAT-ID: 2-letter country prefix + 2..12 alphanumerics (Stripe eu_vat shape) -> uppercase,
// stripped of spaces/dots/hyphens, else null. Format only; Stripe runs the real check.
const normalizeVatId = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const v = raw.toUpperCase().replace(/[\s.-]/g, "");
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v) ? v : null;
};
// E-4: capture the visitor's UI language so the reminder body (process-booking-reminders)
// can be NL or EN. Whitelist to the two supported locales; anything else (incl. absent)
// -> null, which is treated as 'nl' downstream. No free text reaches the DB.
const normalizeLocale = (raw: unknown): "nl" | "en" | null => {
  if (typeof raw !== "string") return null;
  const l = raw.trim().toLowerCase().slice(0, 2);
  return l === "en" ? "en" : l === "nl" ? "nl" : null;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Service role: this public endpoint sanitizes customer input and rate-limits, then
    // delegates the complete authority decision and insert to commit_public_booking.
    // That service-role-only RPC locks the current calendar, service and payment policy,
    // derives end_time from service duration, validates and inserts in one transaction.
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const ipAddress = getClientIp(req);

    // Rate limiting: 5 requests per minute
    const rateLimiter = new RateLimiter(supabaseClient, {
      endpoint: "booking_creation",
      maxRequests: 5,
      windowSeconds: 60,
      blockDurationSeconds: 300,
      enableCaptchaThreshold: 3,
    });

    const rateLimitResult = await rateLimiter.checkLimit(ipAddress, req.url);

    if (!rateLimitResult.allowed) {
      return RateLimiter.createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    let bookingData;
    try {
      bookingData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Server-side validation
    if (!bookingData.customerName || bookingData.customerName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid customer name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!validateBookingEmail(bookingData.customerEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate time is in future
    const startTime = new Date(bookingData.startTime);
    if (Number.isNaN(startTime.getTime()) || startTime <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Booking time must be in future" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // SEQP1R10 (fixes P1-9-PHONE2): this endpoint is PUBLIC and unauthenticated -- anyone can
    // POST directly to it, bypassing the web form's own client-side validatePhoneNumber()
    // entirely, regardless of the BookingBasicFields.tsx / usePublicBookingCreation.tsx fixes
    // on the client. Previously customer_phone only went through sanitizeBookingText (XSS/
    // control-char stripping + length cap), never a real phone-format check, so a direct API
    // caller could write ANY string into bookings.customer_phone, including the exact bare
    // local-format shape (e.g. "0612345678"/"0687654321"/"0470123456") that caused the
    // NL/UK/FR/BE mis-normalization bug class at the WhatsApp send boundary. This validates +
    // normalizes to E.164 server-side, the real trust boundary for this write path, and rejects
    // (400) a genuinely ambiguous/invalid number rather than silently guessing a country or
    // storing garbage. See _shared/phoneValidation.ts for why it never defaults to NL here (a
    // bare local number is unresolvable at this boundary with no country hint available).
    const phoneResult = validatePhoneServerSide(bookingData.customerPhone);
    if (!phoneResult.valid) {
      return new Response(
        JSON.stringify({ error: phoneResult.error || "Invalid phone number" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sanitize all text inputs
    const sanitized = {
      ...bookingData,
      customerName: sanitizeBookingText(bookingData.customerName),
      customerEmail: bookingData.customerEmail.toLowerCase().trim(),
      // customerPhone is now the server-validated E.164 value (or undefined/null), never
      // the raw client-supplied string. sanitizeBookingText is no longer needed for phone:
      // a value that passed validatePhoneServerSide is already digits + a single leading
      // "+", nothing an XSS/control-char strip would ever need to touch.
      customerPhone: phoneResult.value ?? null,
      notes: bookingData.notes ? sanitizeBookingText(bookingData.notes) : null,
    };

    // After sanitizing, the name could be reduced to empty (e.g. a paste of only
    // control characters or angle brackets). Reject it cleanly rather than insert an
    // empty-name booking.
    if (!sanitized.customerName) {
      return new Response(
        JSON.stringify({ error: "Invalid customer name" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // One atomic server-authoritative commit. No caller-supplied end time, price or
    // payment-policy default crosses this boundary.
    const { data: commitResult, error: commitError } = await supabaseClient
      .rpc("commit_public_booking", {
        p_calendar_slug: sanitized.calendarSlug,
        p_service_type_id: sanitized.serviceTypeId,
        p_start_time: startTime.toISOString(),
        p_customer_name: sanitized.customerName,
        p_customer_email: sanitized.customerEmail,
        p_customer_phone: sanitized.customerPhone,
        p_notes: sanitized.notes,
        p_customer_country: normalizeCountry(bookingData.customerCountry),
        p_customer_vat_id: normalizeVatId(bookingData.customerVatId),
        p_customer_locale: normalizeLocale(bookingData.customerLocale),
      });

    if (commitError) throw commitError;
    const commit = parsePublicBookingCommitResult(commitResult);
    if (!commit.ok) {
      return new Response(
        JSON.stringify({ error: commit.reason, code: commit.code }),
        {
          status: commit.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const booking = commit.booking;
    const paymentRequired = commit.paymentRequired;

    // LR-R57: stuur de klant een bevestigingsmail. Web-klanten hebben geen
    // WhatsApp-chat waarin de agent bevestigt, dus zonder dit krijgen ze niets.
    // Fire-and-forget: een mailfout mag de geslaagde boeking nooit breken.
    // PAY & BOOK: bij een verplichte betaling is de boeking nog NIET definitief,
    // de bevestiging volgt pas na een geslaagde betaling, dus hier NIET mailen.
    if (!paymentRequired) {
      try {
        const { data: mailResult, error: mailError } = await supabaseClient
          .functions.invoke("send-booking-confirmation", {
            body: { booking_id: booking.id },
          });
        if (mailError || mailResult?.success !== true) {
          console.error(
            "Bevestigingsmail niet afgeleverd; status is duurzaam vastgelegd",
            {
              booking_id: booking.id,
              code: mailResult?.delivery_status ?? "DELIVERY_FAILED",
            },
          );
        }
      } catch (mailErr) {
        console.error("Bevestigingsmail-aanroep mislukt (niet-fataal)", {
          booking_id: booking.id,
          error: mailErr instanceof Error ? mailErr.name : "unknown",
        });
      }
    }

    // payment_required vertelt de frontend dat de boeking nog betaald moet worden
    // (betaal-flow) i.p.v. 'Boeking aangemaakt' te tonen. De boeking bestaat al
    // (pending) zodat create-booking-payment er via id + confirmation_token op kan haken.
    return new Response(
      JSON.stringify({
        success: true,
        payment_required: paymentRequired,
        booking,
      }),
      {
        headers: {
          ...corsHeaders,
          ...RateLimiter.getRateLimitHeaders(rateLimitResult),
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Booking creation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
