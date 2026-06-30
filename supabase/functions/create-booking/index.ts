import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { RateLimiter, getClientIp } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    .replace(/[<>]/g, '')
    // deno-lint-ignore no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
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
  if (typeof raw !== 'string') return null;
  const c = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
};
// VAT-ID: 2-letter country prefix + 2..12 alphanumerics (Stripe eu_vat shape) -> uppercase,
// stripped of spaces/dots/hyphens, else null. Format only; Stripe runs the real check.
const normalizeVatId = (raw: unknown): string | null => {
  if (typeof raw !== 'string') return null;
  const v = raw.toUpperCase().replace(/[\s.\-]/g, '');
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v) ? v : null;
};
// E-4: capture the visitor's UI language so the reminder body (process-booking-reminders)
// can be NL or EN. Whitelist to the two supported locales; anything else (incl. absent)
// -> null, which is treated as 'nl' downstream. No free text reaches the DB.
const normalizeLocale = (raw: unknown): 'nl' | 'en' | null => {
  if (typeof raw !== 'string') return null;
  const l = raw.trim().toLowerCase().slice(0, 2);
  return l === 'en' ? 'en' : l === 'nl' ? 'nl' : null;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Service role: this is a controlled public endpoint that does its own thorough
    // validation below (validate_booking_security + calendar/service + future-time
    // checks, input sanitization and IP rate limiting). The anon client is blocked by
    // the bookings public-insert RLS policy (a BEFORE-insert trigger rewrites the row
    // before WITH CHECK runs), so a valid public booking 500s. The function's own
    // validation is the security gate here, mirroring create-booking-payment et al.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ipAddress = getClientIp(req);

    // Rate limiting: 5 requests per minute
    const rateLimiter = new RateLimiter(supabaseClient, {
      endpoint: 'booking_creation',
      maxRequests: 5,
      windowSeconds: 60,
      blockDurationSeconds: 300,
      enableCaptchaThreshold: 3
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
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side validation
    if (!bookingData.customerName || bookingData.customerName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid customer name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateBookingEmail(bookingData.customerEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate time is in future
    const startTime = new Date(bookingData.startTime);
    if (startTime <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Booking time must be in future' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize all text inputs
    const sanitized = {
      ...bookingData,
      customerName: sanitizeBookingText(bookingData.customerName),
      customerEmail: bookingData.customerEmail.toLowerCase().trim(),
      // customer_phone came straight from ...bookingData (raw, uncapped) while
      // name/notes were sanitized, so sanitize it too for consistency: strips <>,
      // strips control chars, and caps length (defense-in-depth + prevents bloat).
      customerPhone: bookingData.customerPhone ? sanitizeBookingText(bookingData.customerPhone) : null,
      notes: bookingData.notes ? sanitizeBookingText(bookingData.notes) : null
    };

    // After sanitizing, the name could be reduced to empty (e.g. a paste of only
    // control characters or angle brackets). Reject it cleanly rather than insert an
    // empty-name booking.
    if (!sanitized.customerName) {
      return new Response(
        JSON.stringify({ error: 'Invalid customer name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get calendar ID
    const { data: calendar, error: calendarError } = await supabaseClient
      .from('calendars')
      .select('id')
      .eq('slug', sanitized.calendarSlug)
      .eq('is_active', true)
      .single();

    if (calendarError || !calendar) {
      return new Response(
        JSON.stringify({ error: 'Calendar not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call database validation function
    const { data, error } = await supabaseClient
      .rpc('validate_booking_security', {
        p_calendar_slug: sanitized.calendarSlug,
        p_service_type_id: sanitized.serviceTypeId,
        p_start_time: sanitized.startTime,
        p_end_time: sanitized.endTime,
        p_customer_email: sanitized.customerEmail
      });

    if (error || !data?.valid) {
      return new Response(
        JSON.stringify({ error: data?.errors || 'Validation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PAY & BOOK AFDWINGING (autoritatief, server-side). Lees de payment-settings van
    // deze kalender. Heeft de ondernemer 'beveiligd betalen' + 'betaling verplicht'
    // aanstaan (en is betaling niet optioneel), dan mag dit endpoint GEEN gratis,
    // bevestigd-ogende boeking opleveren: de boeking wordt als ONBETAALD (pending)
    // vastgehouden en de bevestigingsmail volgt pas NA betaling, niet hier. Anders
    // verliest de ondernemer de vooruitbetaling + de platform-fee, en wekt de
    // boeking valselijk de indruk bevestigd te zijn (audit CRITICAL, Pay & Book).
    const { data: paymentSettings } = await supabaseClient
      .from('payment_settings')
      .select('secure_payments_enabled, payment_required_for_booking, payment_optional')
      .eq('calendar_id', calendar.id)
      .maybeSingle();

    const paymentRequired =
      paymentSettings?.secure_payments_enabled === true &&
      paymentSettings?.payment_required_for_booking === true &&
      paymentSettings?.payment_optional !== true;

    // Create booking in database
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .insert({
        calendar_id: calendar.id,
        service_type_id: sanitized.serviceTypeId,
        customer_name: sanitized.customerName,
        customer_email: sanitized.customerEmail,
        customer_phone: sanitized.customerPhone,
        start_time: sanitized.startTime,
        end_time: sanitized.endTime,
        notes: sanitized.notes,
        // Cross-border (X3a): persist the customer billing country + optional EU VAT-ID
        // (X1 columns). Format-validated above; null when absent/malformed. in_person
        // bookings simply leave these null (no regression). create-booking-payment reads
        // them off this row to drive the Stripe Tax calc + persist onto booking_payments.
        customer_country: normalizeCountry(bookingData.customerCountry),
        customer_vat_id: normalizeVatId(bookingData.customerVatId),
        // E-4: visitor UI language -> reminder body locale. Null when absent (=> NL).
        customer_locale: normalizeLocale(bookingData.customerLocale),
        status: 'pending',
        confirmation_token: crypto.randomUUID(),
        // Markeer de boeking expliciet als onbetaald wanneer betaling vereist is, zodat
        // de betaal-flow (create-booking-payment) + eventuele auto-cancel-unpaid hierop
        // kunnen acteren en de boeking niet als 'klaar' telt.
        ...(paymentRequired ? { payment_required: true, payment_status: 'pending' } : {})
      })
      .select()
      .single();

    if (bookingError) {
      // The bookings_no_overlap exclusion constraint rejects an overlapping
      // booking (the slot was taken between availability display and submit).
      // Return a clean, actionable 409 instead of a generic 500.
      if (bookingError.code === '23P01' || /no_overlap|exclusion/i.test(bookingError.message || '')) {
        return new Response(
          JSON.stringify({ error: 'This time slot is no longer available. Please choose another time.', code: 'SLOT_TAKEN' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw bookingError;
    }

    // LR-R57: stuur de klant een bevestigingsmail. Web-klanten hebben geen
    // WhatsApp-chat waarin de agent bevestigt, dus zonder dit krijgen ze niets.
    // Fire-and-forget: een mailfout mag de geslaagde boeking nooit breken.
    // PAY & BOOK: bij een verplichte betaling is de boeking nog NIET definitief,
    // de bevestiging volgt pas na een geslaagde betaling, dus hier NIET mailen.
    if (!paymentRequired) {
      try {
        await supabaseClient.functions.invoke('send-booking-confirmation', {
          body: { booking_id: booking.id },
        });
      } catch (mailErr) {
        console.error('Bevestigingsmail mislukt (niet-fataal):', mailErr);
      }
    }

    // payment_required vertelt de frontend dat de boeking nog betaald moet worden
    // (betaal-flow) i.p.v. 'Boeking aangemaakt' te tonen. De boeking bestaat al
    // (pending) zodat create-booking-payment er via id + confirmation_token op kan haken.
    return new Response(
      JSON.stringify({ success: true, payment_required: paymentRequired, booking }),
      {
        headers: {
          ...corsHeaders,
          ...RateLimiter.getRateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Booking creation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
