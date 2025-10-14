import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { RateLimiter, getClientIp } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const ipAddress = getClientIp(req);

    // Rate limiting: 3 requests per 5 minutes
    const rateLimiter = new RateLimiter(supabaseClient, {
      endpoint: 'waitlist_signup',
      maxRequests: 3,
      windowSeconds: 300,
      blockDurationSeconds: 900,
      enableCaptchaThreshold: 2
    });

    const rateLimitResult = await rateLimiter.checkLimit(ipAddress);

    if (!rateLimitResult.allowed) {
      return RateLimiter.createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { 
      calendarSlug, 
      serviceTypeId, 
      customerName, 
      customerEmail, 
      preferredDate,
      preferredTimeStart,
      preferredTimeEnd,
      flexibility = 'anytime'
    } = await req.json();

    if (!calendarSlug || !serviceTypeId || !customerName || !customerEmail || !preferredDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data, error } = await supabaseClient.rpc('add_to_waitlist', {
      p_calendar_slug: calendarSlug,
      p_service_type_id: serviceTypeId,
      p_customer_name: customerName.trim().substring(0, 100),
      p_customer_email: customerEmail.toLowerCase().trim(),
      p_preferred_date: preferredDate,
      p_preferred_time_start: preferredTimeStart,
      p_preferred_time_end: preferredTimeEnd,
      p_flexibility: flexibility
    });

    if (error) {
      console.error('Waitlist error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to add to waitlist' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        headers: { 
          ...corsHeaders, 
          ...RateLimiter.getRateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Waitlist endpoint error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
