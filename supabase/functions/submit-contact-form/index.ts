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

    // Rate limiting: 3 requests per 5 minutes for contact form
    const rateLimiter = new RateLimiter(supabaseClient, {
      endpoint: 'contact_form',
      maxRequests: 3,
      windowSeconds: 300,
      blockDurationSeconds: 1800,
      enableCaptchaThreshold: 2
    });

    const rateLimitResult = await rateLimiter.checkLimit(ipAddress);

    if (!rateLimitResult.allowed) {
      return RateLimiter.createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { 
      name, 
      email, 
      phone,
      company, 
      subject,
      budget,
      platform,
      message, 
      requestMeeting,
      formType = 'general' 
    } = await req.json();

    // Validate required fields
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

    if (!subject || subject.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Invalid subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the submission
    console.log('Contact form submission:', {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      subject: subject.trim(),
      budget: budget || null,
      platform: platform || null,
      message: message.trim().substring(0, 100) + '...', // Log first 100 chars only
      requestMeeting: requestMeeting || false,
      formType,
      ipAddress
    });

    // Store in security_events_log for tracking
    await supabaseClient
      .from('security_events_log')
      .insert({
        event_type: 'contact_form_submission',
        ip_address: ipAddress,
        event_data: { 
          form_type: formType,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone?.trim() || null,
          company: company?.trim() || null,
          subject: subject.trim(),
          budget: budget || null,
          platform: platform || null,
          message: message.trim(),
          request_meeting: requestMeeting || false
        },
        severity: requestMeeting ? 'warn' : 'info' // Higher priority if meeting requested
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
