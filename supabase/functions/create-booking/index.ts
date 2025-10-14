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
  return text.trim().replace(/[<>]/g, '').substring(0, 500);
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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

    const bookingData = await req.json();

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
      notes: bookingData.notes ? sanitizeBookingText(bookingData.notes) : null
    };

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
        status: 'pending',
        confirmation_token: crypto.randomUUID()
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    return new Response(
      JSON.stringify({ success: true, booking }),
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
