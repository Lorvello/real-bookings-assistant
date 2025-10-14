import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { RateLimiter, getClientIp } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const ipAddress = getClientIp(req);

    // Rate limiting: 2 requests per 5 minutes
    const rateLimiter = new RateLimiter(supabaseClient, {
      endpoint: 'contact_form',
      maxRequests: 2,
      windowSeconds: 300,
      blockDurationSeconds: 1800,
      enableCaptchaThreshold: 1
    });

    const rateLimitResult = await rateLimiter.checkLimit(ipAddress);

    if (!rateLimitResult.allowed) {
      return RateLimiter.createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { name, email, company, message, formType = 'general' } = await req.json();

    if (!name || name.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!message || message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Invalid message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Contact form submission:', {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      company: company?.trim(),
      message: message.trim(),
      formType,
      ipAddress
    });

    await supabaseClient
      .from('security_events_log')
      .insert({
        event_type: 'contact_form_submission',
        ip_address: ipAddress,
        event_data: { form_type: formType, email },
        severity: 'info'
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Form submitted successfully' }),
      { 
        headers: { 
          ...corsHeaders, 
          ...RateLimiter.getRateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
