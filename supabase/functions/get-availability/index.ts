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
    const url = new URL(req.url);
    const calendarSlug = url.searchParams.get('calendarSlug');
    const serviceTypeId = url.searchParams.get('serviceTypeId');
    const startDate = url.searchParams.get('startDate');
    const days = parseInt(url.searchParams.get('days') || '14');

    if (!calendarSlug) {
      return new Response(
        JSON.stringify({ error: 'calendarSlug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (days < 1 || days > 90) {
      return new Response(
        JSON.stringify({ error: 'days must be between 1 and 90' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: 20 requests per minute per IP + calendar
    const rateLimiter = new RateLimiter(supabaseClient, {
      endpoint: 'availability_check',
      maxRequests: 20,
      windowSeconds: 60,
      blockDurationSeconds: 180,
      enableCaptchaThreshold: 5
    });

    const rateLimitResult = await rateLimiter.checkLimit(ipAddress, calendarSlug);

    if (!rateLimitResult.allowed) {
      return RateLimiter.createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { data, error } = await supabaseClient.rpc('get_business_available_slots', {
      p_calendar_slug: calendarSlug,
      p_service_type_id: serviceTypeId || null,
      p_start_date: startDate || new Date().toISOString().split('T')[0],
      p_days: days
    });

    if (error) {
      console.error('Availability query error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch availability' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, slots: data }),
      { 
        headers: { 
          ...corsHeaders, 
          ...RateLimiter.getRateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60'
        } 
      }
    );

  } catch (error) {
    console.error('Availability endpoint error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
