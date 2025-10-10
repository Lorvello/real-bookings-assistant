import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "https://deno.land/std@0.224.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Security configuration
const RATE_LIMIT_WINDOW = 60; // seconds
const MAX_REQUESTS_PER_WINDOW = 100;
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'your_verify_token';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET');

// Helper: Validate WhatsApp signature
async function validateSignature(payload: string, signature: string | null): Promise<boolean> {
  if (!APP_SECRET || !signature) {
    console.warn('Signature validation skipped: missing APP_SECRET or signature header');
    return true; // Allow if not configured yet
  }

  try {
    const expectedSignature = signature.replace('sha256=', '');
    const hmac = createHmac("sha256", APP_SECRET);
    hmac.update(payload);
    const calculatedSignature = Array.from(hmac.digest())
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return calculatedSignature === expectedSignature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// Helper: Check rate limit
async function checkRateLimit(supabaseClient: any, identifier: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW * 1000);

  // Get or create rate limit record
  const { data: existingLimit } = await supabaseClient
    .from('webhook_rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .single();

  if (!existingLimit) {
    await supabaseClient
      .from('webhook_rate_limits')
      .insert({
        identifier,
        request_count: 1,
        window_start: now.toISOString(),
        last_request_at: now.toISOString()
      });
    return { allowed: true };
  }

  // Check if window has expired
  const windowStartTime = new Date(existingLimit.window_start);
  if (now.getTime() - windowStartTime.getTime() > RATE_LIMIT_WINDOW * 1000) {
    // Reset window
    await supabaseClient
      .from('webhook_rate_limits')
      .update({
        request_count: 1,
        window_start: now.toISOString(),
        last_request_at: now.toISOString(),
        blocked_until: null
      })
      .eq('identifier', identifier);
    return { allowed: true };
  }

  // Check if blocked
  if (existingLimit.blocked_until && new Date(existingLimit.blocked_until) > now) {
    return { 
      allowed: false, 
      reason: `Rate limited until ${existingLimit.blocked_until}` 
    };
  }

  // Check if limit exceeded
  if (existingLimit.request_count >= MAX_REQUESTS_PER_WINDOW) {
    const blockUntil = new Date(now.getTime() + 5 * 60 * 1000); // Block for 5 minutes
    await supabaseClient
      .from('webhook_rate_limits')
      .update({
        blocked_until: blockUntil.toISOString(),
        total_blocks: (existingLimit.total_blocks || 0) + 1
      })
      .eq('identifier', identifier);

    return { 
      allowed: false, 
      reason: `Rate limit exceeded. Blocked until ${blockUntil.toISOString()}` 
    };
  }

  // Increment counter
  await supabaseClient
    .from('webhook_rate_limits')
    .update({
      request_count: existingLimit.request_count + 1,
      last_request_at: now.toISOString()
    })
    .eq('identifier', identifier);

  return { allowed: true };
}

// Helper: Log security event
async function logSecurityEvent(
  supabaseClient: any,
  eventType: string,
  severity: string,
  details: any,
  ipAddress?: string
) {
  await supabaseClient
    .from('webhook_security_logs')
    .insert({
      event_type: eventType,
      severity,
      ip_address: ipAddress,
      event_data: details,
      created_at: new Date().toISOString()
    });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  try {
    // WhatsApp webhook verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        await logSecurityEvent(
          supabaseClient,
          'webhook_verification_success',
          'info',
          { mode, ip_address: ipAddress },
          ipAddress
        );
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      } else {
        console.log('Webhook verification failed');
        await logSecurityEvent(
          supabaseClient,
          'webhook_verification_failed',
          'high',
          { mode, token_match: token === VERIFY_TOKEN },
          ipAddress
        );
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Process incoming webhook data (POST request)
    if (req.method === 'POST') {
      // 1. Validate signature
      const signature = req.headers.get('x-hub-signature-256');
      const rawBody = await req.text();
      
      const isValidSignature = await validateSignature(rawBody, signature);
      if (!isValidSignature) {
        console.error('Invalid webhook signature');
        await logSecurityEvent(
          supabaseClient,
          'invalid_signature',
          'critical',
          { signature_provided: !!signature },
          ipAddress
        );
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = JSON.parse(rawBody);
      
      // 2. Rate limiting
      const businessPhoneId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || 'unknown';
      const rateLimitCheck = await checkRateLimit(supabaseClient, `${ipAddress}:${businessPhoneId}`);
      
      if (!rateLimitCheck.allowed) {
        console.warn('Rate limit exceeded:', rateLimitCheck.reason);
        await logSecurityEvent(
          supabaseClient,
          'rate_limit_exceeded',
          'high',
          { reason: rateLimitCheck.reason, business_phone_id: businessPhoneId },
          ipAddress
        );
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Received valid WhatsApp webhook:', JSON.stringify(payload, null, 2));

      // Bepaal webhook type op basis van payload structuur
      let webhookType = 'message';
      
      if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
        webhookType = 'message';
      } else if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
        webhookType = 'status';
      } else if (payload.entry?.[0]?.changes?.[0]?.value?.contacts) {
        webhookType = 'contact_update';
      }

      // Voeg webhook toe aan queue voor verwerking
      const { error } = await supabaseClient
        .from('whatsapp_webhook_queue')
        .insert([{
          webhook_type: webhookType,
          payload: payload
        }]);

      if (error) {
        console.error('Error adding webhook to queue:', error);
        await logSecurityEvent(
          supabaseClient,
          'queue_insert_failed',
          'high',
          { error: error.message, webhook_type: webhookType },
          ipAddress
        );
        return new Response(JSON.stringify({ error: 'Failed to queue webhook' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log successful webhook processing
      await logSecurityEvent(
        supabaseClient,
        'webhook_processed',
        'info',
        { webhook_type: webhookType, business_phone_id: businessPhoneId },
        ipAddress
      );

      // Voor messages, probeer direct te verwerken
      if (webhookType === 'message') {
        try {
          const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
          const contacts = payload.entry?.[0]?.changes?.[0]?.value?.contacts;
          
          if (messages && messages.length > 0 && contacts && contacts.length > 0) {
            const message = messages[0];
            const contact = contacts[0];
            
            // Parse tracking code uit bericht (nieuwe format: "Code: XXX")
            const messageText = message.text?.body || '';
            const trackingMatch = messageText.match(/Code:\s*([A-F0-9]{8})/i);
            const trackingCode = trackingMatch ? trackingMatch[1].toLowerCase() : null;
            
            if (!trackingCode) {
              console.log('No tracking code found in message, skipping calendar lookup');
            } else {
              // Find calendar via tracking code (eerste 8 karakters van user_id)
              const { data: calendarData } = await supabaseClient
                .from('users')
                .select('id, business_name, calendars!inner(id)')
                .ilike('id', `${trackingCode}%`)
                .limit(1)
                .single();

              const calendarId = calendarData?.calendars?.[0]?.id;
              
              if (calendarId && message.type === 'text') {
                console.log(`Routing message to calendar ${calendarId} for tracking code ${trackingCode}`);
                await supabaseClient.rpc('process_whatsapp_message', {
                  p_phone_number: contact.wa_id,
                  p_message_id: message.id,
                  p_message_content: messageText,
                  p_calendar_id: calendarId
                });
              } else {
                console.log(`No calendar found for tracking code ${trackingCode}`);
              }
            }
          }
        } catch (processError) {
          console.error('Error processing message:', processError);
          // Continue - webhook is queued for retry
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
