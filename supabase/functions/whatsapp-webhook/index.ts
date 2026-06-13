import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from "node:crypto"
import { RateLimiter, getClientIp } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Security configuration
const RATE_LIMIT_WINDOW = 60; // seconds
const MAX_REQUESTS_PER_WINDOW = 100;
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'your_verify_token';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET');

// Critical security check on initialization
if (!APP_SECRET) {
  console.error(`
╔════════════════════════════════════════════════════════════╗
║  🚨 CRITICAL SECURITY WARNING                              ║
║  WHATSAPP_APP_SECRET is NOT configured!                    ║
║  All webhook requests will be REJECTED until configured.   ║
║                                                             ║
║  Configure in Supabase Dashboard:                          ║
║  Settings → Edge Functions → Add Secret:                   ║
║  Name: WHATSAPP_APP_SECRET                                 ║
║  Value: [Your WhatsApp App Secret from Meta Dashboard]     ║
╚════════════════════════════════════════════════════════════╝
  `);
}

// Helper: Validate WhatsApp signature
async function validateSignature(payload: string, signature: string | null): Promise<boolean> {
  if (!APP_SECRET) {
    console.error('🚨 WHATSAPP_APP_SECRET not configured - rejecting webhook');
    return false; // FAIL SECURE
  }

  if (!signature) {
    console.error('❌ Missing X-Hub-Signature-256 header');
    return false; // FAIL SECURE
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
        console.error('🚨 WEBHOOK SIGNATURE VALIDATION FAILED', {
          has_signature: !!signature,
          has_app_secret: !!APP_SECRET,
          ip: ipAddress
        });
        
        await logSecurityEvent(
          supabaseClient,
          'invalid_signature',
          'critical',
          { 
            signature_provided: !!signature,
            app_secret_configured: !!APP_SECRET,
            payload_size: rawBody.length,
            ip_address: ipAddress,
            timestamp: new Date().toISOString()
          },
          ipAddress
        );
        
        return new Response(JSON.stringify({ 
          error: 'Forbidden',
          message: 'Webhook signature validation failed'
        }), {
          status: 403,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-Webhook-Status': 'signature_invalid'
          },
        });
      }

      const payload = JSON.parse(rawBody);
      
      // Log successful signature validation
      await logSecurityEvent(
        supabaseClient,
        'signature_validated',
        'info',
        { 
          payload_size: rawBody.length,
          ip_address: ipAddress
        },
        ipAddress
      );
      
      // 2. Rate limiting
      const businessPhoneId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || 'unknown';
      
      const rateLimiter = new RateLimiter(supabaseClient, {
        endpoint: 'whatsapp_webhook',
        maxRequests: 100,
        windowSeconds: 60,
        blockDurationSeconds: 600,
        enableCaptchaThreshold: 10
      });

      const rateLimitResult = await rateLimiter.checkLimit(ipAddress, businessPhoneId);

      if (!rateLimitResult.allowed) {
        return RateLimiter.createRateLimitResponse(rateLimitResult, corsHeaders);
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

      // OPTIE B (LR-R52): access-gated forward naar de n8n-agent.
      // INERT tot N8N_WHATSAPP_FORWARD_URL is gezet → verandert niets aan de huidige
      // situatie tot het Rinkel-nummer live is en de env-var bewust wordt gezet.
      // Flow: resolve de business-eigenaar → check WhatsApp-toegang (lapsed/gratis →
      // NIET forwarden = agent draait niet, sluit access-gating-gat task_f2e05c8b) →
      // forward het RAUWE payload + Meta-signature naar de n8n WhatsApp Trigger.
      const N8N_FORWARD_URL = Deno.env.get('N8N_WHATSAPP_FORWARD_URL');
      if (webhookType === 'message' && N8N_FORWARD_URL) {
        try {
          const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
          const contacts = payload.entry?.[0]?.changes?.[0]?.value?.contacts;
          if (messages && messages.length > 0 && contacts && contacts.length > 0) {
            const message = messages[0];
            const contact = contacts[0];
            const messageText = message.text?.body || '';

            // 1. Resolve owner user_id + calendar_id: via tracking-code, anders via bestaande conversatie
            let ownerId: string | null = null;
            let calendarId: string | null = null;
            const tm = messageText.match(/Code:\s*([A-F0-9]{8})/i);
            if (tm) {
              const { data: u } = await supabaseClient
                .from('users').select('id, calendars!inner(id)').ilike('id', `${tm[1].toLowerCase()}%`).limit(1).maybeSingle();
              ownerId = u?.id ?? null;
              calendarId = (u as any)?.calendars?.[0]?.id ?? null;
            }
            if (!ownerId && contact.wa_id) {
              // returning customer (geen code): phone → contact → laatste conversatie → calendar → owner
              const { data: ct } = await supabaseClient
                .from('whatsapp_contacts').select('id').eq('phone_number', contact.wa_id).maybeSingle();
              if (ct?.id) {
                const { data: conv } = await supabaseClient
                  .from('whatsapp_conversations')
                  .select('calendar_id, calendars!inner(user_id)')
                  .eq('contact_id', ct.id)
                  .order('last_message_at', { ascending: false })
                  .limit(1).maybeSingle();
                ownerId = (conv as any)?.calendars?.user_id ?? null;
                calendarId = (conv as any)?.calendar_id ?? null;
              }
            }

            // 2. Access-gating: alleen forwarden als de eigenaar WhatsApp-toegang heeft.
            let entitled = false;
            if (ownerId) {
              const { data: status } = await supabaseClient.rpc('get_user_status_type', { p_user_id: ownerId });
              entitled = ['active_trial', 'paid_subscriber', 'canceled_but_active', 'missed_payment_grace'].includes(status as string);
              if (!entitled) {
                console.log(`WhatsApp-agent NIET geforward: eigenaar ${ownerId} heeft status '${status}' (geen WhatsApp-toegang)`);
                await logSecurityEvent(supabaseClient, 'whatsapp_forward_gated', 'info', { owner: ownerId, status }, ipAddress);
              }
            } else {
              console.log('Kon business-eigenaar niet resolven → niet forwarden (veilig).');
            }

            // 2b. Bot-toggle: een business die z'n WhatsApp-bot UIT zet mag niet
            // geforward worden (anders is de aan/uit-toggle puur decoratief). Alleen
            // droppen bij een EXPLICIETE false; ontbrekende setting -> niet blokkeren.
            let botActive = true;
            if (entitled && calendarId) {
              const { data: cs } = await supabaseClient
                .from('calendar_settings').select('whatsapp_bot_active').eq('calendar_id', calendarId).maybeSingle();
              if (cs && cs.whatsapp_bot_active === false) {
                botActive = false;
                console.log(`WhatsApp-agent NIET geforward: bot staat UIT voor calendar ${calendarId}`);
                await logSecurityEvent(supabaseClient, 'whatsapp_forward_bot_off', 'info', { calendar: calendarId }, ipAddress);
              }
            }

            // 3. Forward het rauwe payload + Meta-signature naar n8n (agent vuurt).
            if (entitled && botActive) {
              const sigHeader = req.headers.get('x-hub-signature-256') || req.headers.get('x-hub-signature') || '';
              const fwd = await fetch(N8N_FORWARD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': sigHeader },
                body: rawBody,
              });
              console.log(`Forwarded naar n8n-agent (HTTP ${fwd.status}) voor eigenaar ${ownerId}`);
            }
          }
        } catch (fwdError) {
          console.error('Error bij forward naar n8n:', fwdError);
          // Niet fatal — bericht staat al in de queue.
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 
          ...corsHeaders, 
          ...RateLimiter.getRateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json' 
        },
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
