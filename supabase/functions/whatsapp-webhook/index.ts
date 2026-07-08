import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { createHmac } from "node:crypto"
import { RateLimiter, getClientIp } from '../_shared/rateLimit.ts';
import { sendWhatsAppText, sendReadReceiptWithTyping } from '../_shared/whatsappSend.ts';
import { resolveSenderGate, checkEntitlementGate, checkBotToggleGate, countDistinctHistoryOwners, type OwnerHistoryRow } from './gateLogic.ts';

// Normalise a phone to wa_id form (country code, digits only). Dutch 06… → 316…; strips +.
function normalizePhone(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '31' + d.slice(1);
  return d;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Run heavy work (persist + the multi-second agent run) AFTER the 200 to Meta. Meta
// re-delivers a webhook until it gets a timely 200; awaiting the full agent before
// replying invited retries (= duplicate answers). waitUntil keeps the worker alive
// for the background promise. Falls back to fire-and-forget if the runtime lacks it.
function runInBackground(p: Promise<unknown>): void {
  const er = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(p.catch((e) => console.error('bg task error:', e)));
  else p.catch((e) => console.error('bg task error:', e));
}

// Security configuration
const RATE_LIMIT_WINDOW = 60; // seconds
const MAX_REQUESTS_PER_WINDOW = 100;
// Fail-secure: no insecure default. If WHATSAPP_VERIFY_TOKEN is unset, GET
// verification can never succeed (the guard below requires VERIFY_TOKEN to be set).
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET');

// Module-scope service-role client (B2 latency quick-win). Built ONCE per warm isolate rather
// than per request, so warm invokes reuse the client + its kept-alive connections (the keep-warm
// cron holds this isolate hot). Safe to share: stateless service-role, no per-request auth state.
// createClient opens no socket by itself, and the keep-warm ping early-returns above this point.
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

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
// (R113, 2026-07-05) Fire-and-forget by design: must never delay or fail the actual
// webhook response to Meta. But a silent insert failure here previously meant the
// ENTIRE security/audit trail vanished with zero trace (missing ip_address column,
// no .select(), no error-checking; fixed in migration 20260705063300_R113_F-R113-1).
// Added error-checking so a future schema drift surfaces in edge-function logs
// instead of disappearing again; still not awaited by callers beyond this function,
// and still never throws.
async function logSecurityEvent(
  supabaseClient: any,
  eventType: string,
  severity: string,
  details: any,
  ipAddress?: string
) {
  const { error } = await supabaseClient
    .from('webhook_security_logs')
    .insert({
      event_type: eventType,
      severity,
      ip_address: ipAddress,
      event_data: details,
      created_at: new Date().toISOString()
    });
  if (error) {
    console.error(`logSecurityEvent insert failed [${eventType}]:`, error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Keep-warm ping (pg_cron, every few min). Return immediately, BEFORE any
  // signature validation, DB work or agent invoke. A scheduled ping keeps this
  // function's isolate + module graph warm so the first real "hallo" of the day
  // does not pay a deep cold start (~2.2s measured). Harmless if hit by anyone:
  // it processes nothing, touches no data and reveals nothing.
  if (req.headers.get('x-keep-warm') === '1') {
    return new Response('warm', { status: 200, headers: corsHeaders })
  }

  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  try {
    // WhatsApp webhook verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
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

      // (F4, 2026-06-18) De whatsapp_webhook_queue-insert is hier VERWIJDERD. Die queue
      // was vestigiaal: het echte verwerken gebeurt INLINE in het ACCESS-GATED AGENT
      // INVOKE-blok hieronder (port off n8n, 2026-06-17). Niets consumeerde de queue —
      // de enige "processor" (RPC process_whatsapp_webhook_queue) is een no-op stub die
      // alleen processed=true zet. De insert groeide dus oneindig (220 ongelezen rijen)
      // EN het faal-pad gaf 500 terug, waardoor een dode audit-write de live agent kon
      // blokkeren. (R31, 2026-06-19) De whatsapp_webhook_queue-tabel + de processor-RPC
      // process_whatsapp_webhook_queue + de trigger + de dev WhatsAppWebhookManager/-hooks
      // zijn nu volledig GEDROPT/verwijderd (migratie 20260619120000). Niets verwijst er nog naar.

      // Log successful webhook processing
      await logSecurityEvent(
        supabaseClient,
        'webhook_processed',
        'info',
        { webhook_type: webhookType, business_phone_id: businessPhoneId },
        ipAddress
      );

      // (Legacy "direct verwerken"-blok verwijderd 2026-06-17: het persisteerde het
      // bericht zonder de agent aan te roepen en gebruikte dezelfde kapotte uuid-ILIKE.
      // De ACCESS-GATED AGENT INVOKE hieronder doet persisteren + agent in één, correct.)

      // ACCESS-GATED AGENT INVOKE (port off n8n, 2026-06-17). In plaats van het rauwe
      // payload naar n8n te forwarden, roepen we de Supabase `whatsapp-agent` edge
      // function aan (de native AI-agent). Flow: resolve de business-eigenaar → check
      // WhatsApp-toegang (lapsed/gratis → niet aanroepen) → check bot-toggle → persisteer
      // de inbound + invoke de agent. Behoudt de access-gating (sluit task_f2e05c8b).
      if (webhookType === 'message') {
        // Deferred so Meta gets its 200 immediately (no retry-doubles); the agent runs
        // in the background via waitUntil. Persist + agent are all inside this promise.
        runInBackground((async () => {
        try {
          const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
          const contacts = payload.entry?.[0]?.changes?.[0]?.value?.contacts;
          if (messages && messages.length > 0 && contacts && contacts.length > 0) {
            const message = messages[0];
            const contact = contacts[0];
            const messageText = message.text?.body || '';
            // IUX R100 (F-R79-2 fix): Meta sends the customer's TRUE send time as
            // message.timestamp (unix seconds, string). Previously read nowhere and
            // discarded, history was ordered purely by DB insert time, so an
            // out-of-order-delivered message (flaky connection, or two fast customer
            // messages arriving reversed) could not be distinguished from a normal one.
            // Parsed defensively: an absent/non-numeric value yields null, never throws,
            // and process_whatsapp_message's new param defaults to NULL either way.
            const metaTimestampRaw = message.timestamp;
            const metaTimestampSeconds = metaTimestampRaw != null ? Number(metaTimestampRaw) : NaN;
            const messageTimestampIso = Number.isFinite(metaTimestampSeconds)
              ? new Date(metaTimestampSeconds * 1000).toISOString()
              : null;

            // 1. Resolve owner user_id + calendar_id: via tracking-code, anders via bestaande
            // conversatie, anders owner-self-test. The DECISION lives in gateLogic.ts's
            // resolveSenderGate (WHATSAPP_E2E_TEST_INFRA Item 2, unit-tested there); this block
            // only performs the real DB round-trips and hands the results in.
            const tm = messageText.match(/Code:\s*([A-F0-9]{8})/i);
            let trackingCodeMatch: { ownerId: string; calendarId: string | null } | null = null;
            if (tm) {
              // RPC cast de uuid->text (users.id ILIKE faalt rauw: geen uuid ~~* text-operator).
              const { data: rc, error: rcErr } = await supabaseClient
                .rpc('resolve_owner_calendar_by_code', { p_code: tm[1].toLowerCase() });
              if (rcErr) console.error('resolve_owner_calendar_by_code faalde:', rcErr);
              const row = Array.isArray(rc) ? rc[0] : rc;
              const oid = (row as any)?.owner_id ?? null;
              if (oid) trackingCodeMatch = { ownerId: oid, calendarId: (row as any)?.calendar_id ?? null };
            }
            // SEV-1 fix (cross-tenant fallback misroute): the single shared WhatsApp number
            // means a phone's conversation history can span MULTIPLE distinct tenants. The old
            // logic here picked the single MOST-RECENTLY-ACTIVE conversation across ANY tenant
            // with no further check, so a code-less follow-up genuinely meant for Tenant Z could
            // silently attach to Tenant X's conversation/booking/pending-verification state
            // merely because X was more recently active. Fix: fetch ALL of this phone's
            // conversations (not just the top one); resolveSenderGate only auto-resolves when
            // they all belong to the SAME owner (the overwhelmingly common single-tenant-history
            // case: zero added friction, identical behavior to before). The instant 2+ DISTINCT
            // owners are present, resolution is genuinely ambiguous from the message alone (no
            // tracking code to disambiguate); resolveSenderGate leaves ownerId/calendarId unset so
            // this falls through to the SAME fail-closed codeless-stranger path below (D-2) rather
            // than guessing.
            let historyRows: OwnerHistoryRow[] = [];
            if (!trackingCodeMatch && contact.wa_id) {
              // returning customer (geen code): phone → contact → ALLE conversaties → distinct owners
              const { data: ct } = await supabaseClient
                .from('whatsapp_contacts').select('id').eq('phone_number', contact.wa_id).maybeSingle();
              if (ct?.id) {
                // R135: filter out soft-deleted calendars from the ambiguity check. Without
                // this, a customer with exactly ONE active tenant plus stale history at a
                // since-closed (is_deleted=true) tenant would show 2 distinct owners here and
                // incorrectly trip the fail-closed ambiguity path below, even though there is
                // really only one active tenant this customer could mean. calendars!inner
                // still requires the join to exist (calendar_id not null); adding is_deleted
                // just excludes rows whose calendar has since been soft-deleted.
                const { data: convs } = await supabaseClient
                  .from('whatsapp_conversations')
                  .select('calendar_id, calendars!inner(user_id, is_deleted)')
                  .eq('contact_id', ct.id)
                  .eq('calendars.is_deleted', false)
                  .order('last_message_at', { ascending: false });
                const rows = (convs as Array<{ calendar_id: string; calendars: { user_id: string } }> | null) ?? [];
                historyRows = rows
                  .map((r) => ({ calendarId: r.calendar_id, ownerId: r.calendars?.user_id }))
                  .filter((r): r is OwnerHistoryRow => !!r.ownerId);
              }
            }
            // Owner self-test (D-5): the business owner texting in from their OWN
            // registered number (no code, no prior conversation). Route to their own
            // default calendar so they experience the agent exactly as a customer would.
            // Skipped when history already resolved a single tenant (same query-efficiency as
            // before this extraction); still runs in the ambiguous-history case, matching the
            // original fall-through (resolveSenderGate decides precedence, not this fetch-gate).
            const historySingleTenantResolved = countDistinctHistoryOwners(historyRows) === 1;
            let ownerTestPhoneMatch: { ownerId: string; defaultCalendarId: string | null } | null = null;
            if (!trackingCodeMatch && !historySingleTenantResolved && contact.wa_id) {
              const norm = normalizePhone(contact.wa_id);
              const { data: ownerByTest } = await supabaseClient
                .from('users').select('id').eq('owner_test_phone', norm).maybeSingle();
              if (ownerByTest?.id) {
                const { data: oc } = await supabaseClient
                  .from('calendars').select('id').eq('user_id', ownerByTest.id)
                  .order('is_default', { ascending: false }).limit(1).maybeSingle();
                ownerTestPhoneMatch = { ownerId: ownerByTest.id, defaultCalendarId: (oc as any)?.id ?? null };
              }
            }

            const senderResult = resolveSenderGate({ trackingCodeMatch, historyRows, ownerTestPhoneMatch });
            const ownerId: string | null = senderResult.ownerId;
            const calendarId: string | null = senderResult.calendarId;
            if (senderResult.ambiguousMultiTenant) {
              console.log(`Meerdere tenants (${senderResult.distinctOwnerCount}) in geschiedenis voor dit nummer, geen code, fail-closed, niet auto-resolven.`);
              await logSecurityEvent(
                supabaseClient,
                'whatsapp_ambiguous_tenant_inbound',
                'high',
                { from: contact.wa_id, distinct_owner_count: senderResult.distinctOwnerCount },
                ipAddress,
              );
            }
            if (senderResult.matchedVia === 'owner_self_test') {
              console.log(`Owner self-test herkend (eigenaar ${ownerId}, calendar ${calendarId}) via owner_test_phone.`);
            }

            // 2. Access-gating: alleen forwarden als de eigenaar WhatsApp-toegang heeft.
            let entitled = false;
            if (ownerId) {
              const { data: status } = await supabaseClient.rpc('get_user_status_type', { p_user_id: ownerId });
              entitled = checkEntitlementGate(status as string | null);
              if (!entitled) {
                console.log(`WhatsApp-agent NIET geforward: eigenaar ${ownerId} heeft status '${status}' (geen WhatsApp-toegang)`);
                await logSecurityEvent(supabaseClient, 'whatsapp_forward_gated', 'info', { owner: ownerId, status }, ipAddress);
              }
            } else {
              console.log('Kon business-eigenaar niet resolven → niet forwarden (veilig).');
              // Code-less stranger fallback (D-2), ALSO now the fail-closed landing spot for the
              // genuinely-ambiguous multi-tenant-history case above (SEV-1 fix): either a sender
              // we cannot tie to any business at all (no tracking code, no prior conversation), or
              // one whose history spans 2+ distinct tenants with no code to disambiguate. Both get
              // the SAME safe treatment: never silently forwarded to any tenant. Nudge them to scan
              // the QR / send their code instead of silently dropping.
              // Guarded behind WHATSAPP_CODELESS_FALLBACK so the outward send stays
              // OFF until Mathew verifies it once with a real WhatsApp number (a blind
              // unverifiable outward send is not shipped live). Flip the secret to
              // 'on' to enable. The detection + logging ship now regardless.
              // (Ambiguous-history case already logged its own whatsapp_ambiguous_tenant_inbound
              // event above with the distinct-owner count; this generic event still fires too so
              // every no-forward path remains visible under the one existing counter.)
              // WHATSAPP_E2E_TEST_INFRA Item 3 (gate-rejection visibility): a codeless-stranger
              // drop is genuinely not tenant-attributable (that's the whole reason it's codeless),
              // so it cannot show on any one business's dashboard. Instead, a phone that keeps
              // getting dropped this way escalates to 'high' severity, the same treatment as the
              // ambiguous-tenant case, so a repeat offender (exactly the class of silent failure
              // that went unnoticed for days before this initiative) is no longer indistinguishable
              // from a one-off in the security log.
              let codelessRepeatCount = 0;
              if (contact.wa_id) {
                const { count } = await supabaseClient
                  .from('webhook_security_logs')
                  .select('id', { count: 'exact', head: true })
                  .eq('event_type', 'whatsapp_codeless_inbound')
                  .eq('event_data->>from', contact.wa_id)
                  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
                codelessRepeatCount = count ?? 0;
              }
              const codelessSeverity = codelessRepeatCount >= 2 ? 'high' : 'info';
              await logSecurityEvent(
                supabaseClient,
                'whatsapp_codeless_inbound',
                codelessSeverity,
                { from: contact.wa_id, repeat_count_24h: codelessRepeatCount },
                ipAddress,
              );
              if (Deno.env.get('WHATSAPP_CODELESS_FALLBACK') === 'on' && contact.wa_id) {
                try {
                  await sendWhatsAppText(
                    contact.wa_id,
                    'Hoi! Om te kunnen helpen met boeken heb ik je code nodig. Scan de QR-code van het bedrijf of stuur het opslaan-bericht met je code om te beginnen. 🙂',
                  );
                } catch (fbErr) {
                  console.error('codeless fallback send error:', fbErr);
                }
              }
            }

            // 2b. Bot-toggle: een business die z'n WhatsApp-bot UIT zet mag niet
            // geforward worden (anders is de aan/uit-toggle puur decoratief). Alleen
            // droppen bij een EXPLICIETE false; ontbrekende setting -> niet blokkeren.
            let botActive = true;
            if (entitled && calendarId) {
              const { data: cs } = await supabaseClient
                .from('calendar_settings').select('whatsapp_bot_active').eq('calendar_id', calendarId).maybeSingle();
              botActive = checkBotToggleGate(cs?.whatsapp_bot_active as boolean | null | undefined);
              if (!botActive) {
                console.log(`WhatsApp-agent NIET geforward: bot staat UIT voor calendar ${calendarId}`);
                await logSecurityEvent(supabaseClient, 'whatsapp_forward_bot_off', 'info', { calendar: calendarId }, ipAddress);
              }
            }

            // 3. Persisteer de inbound (contact/conversatie/bericht) + roep de agent aan.
            if (entitled && botActive && calendarId) {
              // process_whatsapp_message upsert't contact + conversatie en slaat het
              // inbound bericht op, zodat de agent de history kan laden. service-role.
              // De RPC-fout NIET stil negeren: een mislukte persist betekent geen history.
              const { data: pwmData, error: pwmErr } = await supabaseClient.rpc('process_whatsapp_message', {
                p_phone_number: contact.wa_id,
                p_message_id: message.id,
                p_message_content: messageText,
                p_calendar_id: calendarId,
                p_message_timestamp: messageTimestampIso,
              });
              if (pwmErr) console.error('process_whatsapp_message faalde:', pwmErr);
              else if ((pwmData as { success?: boolean } | null)?.success === false)
                console.error('process_whatsapp_message gaf success=false:', pwmData);

              // Idempotentie tegen Meta-retries: Meta her-levert een webhook zolang het
              // geen tijdige 200 krijgt, en deze handler AWAIT de volledige agent-run
              // (LLM + tools, meerdere seconden) vóór de 200. Bij een her-levering van
              // hetzelfde message.id meldt process_whatsapp_message duplicate=true
              // (ON CONFLICT DO NOTHING op de UNIQUE message_id) → sla de agent over,
              // anders krijgt de klant een tweede antwoord op één bericht.
              const isDuplicate = (pwmData as { duplicate?: boolean } | null)?.duplicate === true;
              if (isDuplicate) {
                console.log(`process_whatsapp_message: duplicaat message ${message.id} — agent overgeslagen (Meta-retry)`);
              } else {
                // Read receipt + "typing..." indicator: fire immediately (NOT awaited) so
                // the bubble shows within ~150ms while the agent runs, turning the multi-
                // second turn into visible activity instead of silence. Best-effort; awaited
                // at the end of this branch only to keep it alive inside the background task.
                const typingDone = sendReadReceiptWithTyping(message.id);
                // De agent via een directe fetch aanroepen (NIET functions.invoke: dat
                // voerde de agent-function in praktijk niet uit vanuit deze edge function).
                const agentUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-agent`;
                const srk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
                try {
                  const ares = await fetch(agentUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${srk}`, 'apikey': srk },
                    body: JSON.stringify({
                      phone: contact.wa_id,
                      calendar_id: calendarId,
                      message: messageText,
                      contact_name: contact?.profile?.name,
                    }),
                  });
                  const abody = await ares.text();
                  if (!ares.ok) console.error(`whatsapp-agent faalde [${ares.status}]: ${abody.slice(0, 300)}`);
                  else console.log(`whatsapp-agent OK (eigenaar ${ownerId}, calendar ${calendarId}): ${abody.slice(0, 200)}`);
                } catch (agentErr) {
                  console.error('whatsapp-agent fetch error:', agentErr);
                }
                await typingDone.catch(() => {});
              }
            }
          }
        } catch (fwdError) {
          console.error('Error bij verwerken WhatsApp-bericht:', fwdError);
          // Niet fatal — de 200 is al terug naar Meta; dit draait op de achtergrond.
        }
        })());
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
    return new Response(JSON.stringify({ error: (error as Error)?.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
