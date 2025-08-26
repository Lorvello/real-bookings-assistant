import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Security helpers
function getClientIP(req: Request): string {
  // Try various headers for client IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    // X-Forwarded-For can be a comma-separated list, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  return cfConnectingIP || realIP || '0.0.0.0';
}

function getUserAgent(req: Request): string {
  return req.headers.get('user-agent') || 'unknown';
}

function getCountryCode(req: Request): string | null {
  // Cloudflare provides country code in CF-IPCountry header
  return req.headers.get('cf-ipcountry') || null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentRequest {
  booking_id: string;
  amount_cents: number;
  currency?: string;
  customer_email?: string;
  customer_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const {
      booking_id,
      amount_cents,
      currency = 'eur',
      customer_email,
      customer_name
    }: CreatePaymentRequest = await req.json();

    // Extract security context
    const clientIP = getClientIP(req);
    const userAgent = getUserAgent(req);
    const countryCode = getCountryCode(req);

    console.log('Payment attempt from IP:', clientIP, 'Amount:', amount_cents, 'Email:', customer_email);

    // Get booking details first to get calendar_id
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        calendars!inner(
          id,
          name,
          business_stripe_accounts!inner(
            stripe_account_id,
            charges_enabled
          )
        ),
        service_types(name, price)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      // Log failed booking lookup
      await supabaseClient.rpc('record_payment_attempt', {
        p_ip_address: clientIP,
        p_calendar_id: null,
        p_success: false
      });
      
      await supabaseClient
        .from('payment_security_logs')
        .insert({
          event_type: 'booking_not_found',
          ip_address: clientIP,
          user_agent: userAgent,
          request_data: { booking_id, amount_cents },
          block_reason: 'Invalid booking ID',
          severity: 'medium'
        });
      
      throw new Error('Booking not found');
    }

    const calendarId = booking.calendar_id;

    // 1. Check rate limiting first
    const { data: rateLimitResult } = await supabaseClient.rpc('check_payment_rate_limit', {
      p_ip_address: clientIP,
      p_calendar_id: calendarId
    });

    if (!rateLimitResult?.allowed) {
      console.log('Payment blocked due to rate limiting:', rateLimitResult);
      
      await supabaseClient
        .from('payment_security_logs')
        .insert({
          event_type: 'rate_limit_blocked',
          ip_address: clientIP,
          booking_id: booking_id,
          amount_cents: amount_cents,
          user_agent: userAgent,
          request_data: rateLimitResult,
          block_reason: `Rate limit exceeded: ${rateLimitResult.reason}`,
          severity: 'high'
        });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too many payment attempts. Please try again later.',
          blocked_until: rateLimitResult.blocked_until
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      );
    }

    // 2. Validate payment security
    const { data: securityValidation } = await supabaseClient.rpc('validate_payment_security', {
      p_ip_address: clientIP,
      p_calendar_id: calendarId,
      p_amount_cents: amount_cents,
      p_currency: currency,
      p_user_email: customer_email || '',
      p_user_agent: userAgent,
      p_country_code: countryCode
    });

    if (!securityValidation?.valid) {
      console.log('Payment blocked due to security validation:', securityValidation);
      
      await supabaseClient.rpc('record_payment_attempt', {
        p_ip_address: clientIP,
        p_calendar_id: calendarId,
        p_success: false
      });

      await supabaseClient
        .from('payment_security_logs')
        .insert({
          event_type: 'security_validation_failed',
          ip_address: clientIP,
          booking_id: booking_id,
          amount_cents: amount_cents,
          user_agent: userAgent,
          request_data: securityValidation,
          block_reason: 'Failed security validation',
          severity: 'high'
        });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment cannot be processed due to security restrictions.',
          validation_errors: securityValidation.warnings
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Log suspicious activity warnings
    if (securityValidation.warnings && securityValidation.warnings.length > 0) {
      console.log('Payment has security warnings but proceeding:', securityValidation.warnings);
    }

    const stripeAccount = booking.calendars.business_stripe_accounts[0];
    if (!stripeAccount?.charges_enabled) {
      await supabaseClient.rpc('record_payment_attempt', {
        p_ip_address: clientIP,
        p_calendar_id: calendarId,
        p_success: false
      });
      
      throw new Error('Payment processing not enabled for this business');
    }

    // Get payment settings
    const { data: paymentSettings } = await supabaseClient
      .from('payment_settings')
      .select('platform_fee_percentage')
      .eq('calendar_id', booking.calendar_id)
      .single();

    const platformFeePercentage = paymentSettings?.platform_fee_percentage || 2.50;
    const platformFeeCents = Math.round(amount_cents * (platformFeePercentage / 100));

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: currency,
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },
      metadata: {
        booking_id: booking_id,
        calendar_id: booking.calendar_id,
        service_name: booking.service_types?.name || 'Service',
      },
      description: `Payment for ${booking.service_types?.name || 'Service'} - ${booking.calendars.name}`,
      receipt_email: customer_email,
    });

    // Store payment record
    await supabaseClient
      .from('booking_payments')
      .insert({
        booking_id: booking_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_account_id: stripeAccount.stripe_account_id,
        amount_cents: amount_cents,
        currency: currency,
        platform_fee_cents: platformFeeCents,
        status: 'pending',
        customer_email: customer_email,
        customer_name: customer_name,
      });

    // Update booking status
    await supabaseClient
      .from('bookings')
      .update({
        payment_status: 'pending',
        payment_required: true,
        total_amount_cents: amount_cents,
        payment_currency: currency,
        payment_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .eq('id', booking_id);

    // Record successful payment attempt
    await supabaseClient.rpc('record_payment_attempt', {
      p_ip_address: clientIP,
      p_calendar_id: calendarId,
      p_success: true
    });

    // Log successful payment creation
    await supabaseClient
      .from('payment_security_logs')
      .insert({
        event_type: 'payment_created',
        ip_address: clientIP,
        booking_id: booking_id,
        amount_cents: amount_cents,
        currency: currency,
        user_agent: userAgent,
        request_data: {
          payment_intent_id: paymentIntent.id,
          customer_email: customer_email,
          country_code: countryCode
        },
        severity: 'low'
      });

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent: {
          id: paymentIntent.id,
          amount: amount_cents,
          currency: currency,
          status: paymentIntent.status,
          client_secret: paymentIntent.client_secret,
        },
        payment_url: `https://checkout.stripe.com/pay/${paymentIntent.client_secret}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in create-booking-payment:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});