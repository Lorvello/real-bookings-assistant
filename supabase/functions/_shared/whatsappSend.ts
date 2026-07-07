// Outbound WhatsApp text via the Meta Graph API.
// Used by the whatsapp-agent edge function to reply to customers. The n8n agent
// previously owned all sends; this is the native replacement (port off n8n).
//
// Secrets used: WHATSAPP_ACCESS_TOKEN (Meta permanent/system-user token).
// phoneNumberId defaults to the live BA number (audit-confirmed) but can be
// overridden via WHATSAPP_PHONE_NUMBER_ID.

const GRAPH_VERSION = "v22.0";
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "1204872446033001";

// SEQP1R48 (fix for R47-1): the reminder claim mechanism (SEQP1R42, claim_booking_reminder's
// claimed_at lease) uses a 3-minute TTL specifically to distinguish "a crashed invocation"
// from "a still-genuinely-in-flight send", but that distinction only holds if a real send can
// never legitimately approach 3 minutes. Before this fix, NEITHER the Resend client nor these
// Meta Graph API fetch() calls carried any explicit timeout, so a stalled DNS/TLS handshake or
// a degraded upstream could let a single item's send genuinely still be running when the lease
// expired, letting a second invocation validly re-claim and also send (reproduced live,
// evidence/SEQ_P1_r47.md + r48.md). EXTERNAL_SEND_TIMEOUT_MS bounds every outbound Resend/Meta
// call to comfortably under the 3-minute lease: once this fires, the calling code's own
// try/catch (process-booking-reminders/index.ts) treats the abort as a normal send failure and
// commits a definite record_booking_reminder_result outcome (sent, or a retryable/terminal
// failure) well before the lease window closes, so a call can no longer sit in an ambiguous
// "still might be in-flight" state all the way out to 3 minutes. Exported so index.ts's own
// resend.emails.send() call uses the exact same bound (one source of truth), mirroring the
// existing STRIPE_CHECK_TIMEOUT_MS pattern in _shared/stripeRefundCheck.ts (a single, named,
// per-call timeout constant, no SDK-level retries hidden behind it).
//
// Residual, explicitly accepted (same trade-off SEQP1R45 already documented for a Resend
// client-side error surfacing after the request was already accepted): aborting the client's
// wait does not retroactively un-send a message Meta/Resend had already started processing
// server-side before the abort fired. This fix closes the reproduced gap (a call silently
// outliving its own lease with no bound at all); it does not claim to make external delivery
// itself exactly-once, which no client-side timeout can guarantee against an at-least-once
// upstream with no dedup key.
export const EXTERNAL_SEND_TIMEOUT_MS = 45_000;

export interface WhatsAppSendResult {
  ok: boolean;
  status: number;
  messageId?: string;
  error?: string;
}

// SEQP1R9/SEQP1R9-VERIFY/SEQP1R10 (P1-9-PHONE, reopened twice as P1-9-PHONE2): `bookings.
// customer_phone` reaches this module's `to` param from 3 write paths (WhatsApp-origin via
// whatsapp-agent/tools.ts, web/dashboard booking forms, create-installment-payment).
//
// HISTORY: R9 first fixed this by normalizing at THIS send boundary, including a bare-local
// "assume NL" guess for the single case it believed was unambiguous (10 digits, single leading
// "0"). R9's own independent verify round reopened it (P1-9-PHONE2): that guess is NOT actually
// unambiguous, a French mobile ("06XXXXXXXX") and a Belgian mobile ("04XXXXXXXX") are both also
// exactly 10 digits with a single leading "0", byte-identical in shape to a Dutch "06" number,
// and were silently mis-tagged as Dutch too, the exact same bug class as the earlier documented
// UK mis-normalization.
//
// SEQP1R10 FIX: retired the bare-local NL-guess branch entirely rather than narrowing it
// further. Root-caused instead: the web/dashboard booking form (BookingBasicFields.tsx)
// computed a correct, disambiguated E.164 value via libphonenumber-js and then discarded it,
// storing raw ambiguous text; create-booking and create-installment-payment did zero
// server-side phone validation at all. All 3 write paths now validate/normalize BEFORE the row
// is ever written (BookingBasicFields.tsx stores result.value; create-booking and
// create-installment-payment run _shared/phoneValidation.ts's validatePhoneServerSide; a DB
// CHECK constraint, migration 20260706170000_SEQP1R10, backstops all of them). Given this is
// pre-launch with 0 production rows (confirmed live at fix time) and every write path is now
// fixed, there is no remaining route by which a genuinely ambiguous bare-local number should
// ever reach this function for a NEW booking, so this function fails closed (returns null) for
// ANY bare-local-format number rather than keeping a narrowed guess as a "last resort": a
// narrowed guess is still a guess, and the whole point of this round is to stop guessing.
// Residual risk: if some future write path is added without going through the shared
// validator, a bare-local number could still reach here and would now be REJECTED (fail
// closed into invalid_phone_format) rather than silently mis-tagged, which is the intentionally
// safe failure mode. This function only ever trusts a number that already declares its own
// country via an explicit "+" or "00" international-dialing prefix, or is already a bare
// international MSISDN with no leading "0" (the WhatsApp-origin wa_id shape, e.g. "31612345678",
// which is Meta's own confirmed contact id, never a locally-typed local-format number).
//
// Returns the bare-digits Meta wa_id-style string (no "+", no leading "0", digits only) on
// success, matching what Meta's own webhook `contact.wa_id` looks like (the one format this
// codebase has actually observed working end-to-end, P1-9-VERIFY-1). Returns null (with the
// caller expected to log the reason and fail the send rather than guess) when the input is
// not confidently resolvable to a plausible international MSISDN.
export function normalizePhoneForMeta(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const hadPlus = trimmed.startsWith("+");
  // "00" international-dialing prefix (common in NL/EU convention) is equivalent to "+".
  // Detected on DIGITS (not the raw string) so it is immune to formatting noise before the
  // "00" (a code-review catch: detecting had00 only after stripping "(0)" from the raw string
  // missed the had00 case entirely, since the original code only ever stripped "(0)" when
  // hadPlus was already true, silently corrupting a "00"-prefixed number that also carried a
  // "(0)" trunk marker, e.g. "0044 (0)7911 123456"; computing had00 up front here and applying
  // the SAME "(0)" strip for both prefix styles below closes that gap).
  const digitsOnly = trimmed.replace(/\D/g, "");
  const had00 = !hadPlus && digitsOnly.startsWith("00");

  // International-dialing "(0)" trunk-prefix convention (e.g. "+44 (0)7911 123456" or
  // "0044 (0)7911 123456" both mean "drop the (0), it's the national trunk prefix, not part
  // of the number"): strip it from the raw string BEFORE the blanket digit-strip below,
  // otherwise its "0" would get kept as a real digit and corrupt an otherwise-valid
  // international number. Applied whenever the input already declared itself international
  // via EITHER "+" or "00" (never used to GUESS a country for an ambiguous bare-local number).
  const cleanedRaw = (hadPlus || had00) ? trimmed.replace(/\(0\)/g, "") : trimmed;

  // Strip everything except digits (drops "+", spaces, hyphens, parens, dots: all of which
  // Meta's own docs list as tolerated-but-ignorable punctuation anyway).
  let digits = cleanedRaw.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (had00) digits = digits.slice(2);

  let candidate: string;
  if (hadPlus || had00) {
    // Already explicitly international per the customer's own input. Trust it as-is: Meta
    // itself round-trips whatever country the customer supplied, and second-guessing an
    // explicit "+"/"00" prefix with our own country heuristic is exactly the kind of
    // overreach that caused the documented UK mis-normalization bug (that bug was about
    // GUESSING a country for an AMBIGUOUS bare-local number, not about a number that already
    // told us its country via "+"). Just validate plausible MSISDN shape below.
    candidate = digits;
  } else if (/^[1-9]\d{9,14}$/.test(digits)) {
    // No "+"/"00"/leading-0: already looks like a bare international MSISDN with a country
    // code baked in (e.g. Meta's own wa_id shape "31612345678", or "4479..." etc), 10-15
    // digits, no leading 0. Trust as-is (this is exactly the WhatsApp-origin shape).
    candidate = digits;
  } else {
    // Ambiguous or implausible: a bare local-format number of ANY country's shape (NL, UK,
    // FR, BE, or otherwise), too short, too long, all-zero, or garbage. SEQP1R10: no bare-local
    // shape gets a country guess anymore, not even the single-leading-zero NL case R9 believed
    // was safe (it collides with real FR/BE mobile shapes, see the SEQP1R10 header comment).
    // Fail closed rather than guess any default country: this is the exact class of bug
    // (silent wrong-country mis-normalization) this function exists to never repeat.
    return null;
  }

  // Final plausibility gate on the resolved candidate: a real MSISDN (country code +
  // subscriber number) is a minimum of 10 digits total (matches the bare-international
  // branch's own 10-15 bound above, a code-review catch: this gate used to allow 8-9 digits,
  // which was LOOSER than the bare-digits branch a few lines up and was the only guard the
  // hadPlus/had00 branch had, so the two paths disagreed on what counts as plausible). E.164
  // max is 15 digits. Applies uniformly to every branch above, closing that inconsistency.
  if (!/^[1-9]\d{9,14}$/.test(candidate)) return null;

  return candidate;
}

// Mark an inbound message as read AND show a "typing..." indicator in ONE Graph
// call (WhatsApp Cloud API typing-indicators, GA 2025). The bubble shows for up
// to 25s or until we send our reply, whichever comes first, so firing this the
// instant an inbound arrives turns the multi-second agent turn into visible
// activity (blue ticks + typing) instead of dead silence. Best-effort: it never
// throws and is not on the reply's critical path. Needs the inbound message id
// (wamid). Docs: developers.facebook.com/docs/whatsapp/cloud-api/typing-indicators
export async function sendReadReceiptWithTyping(inboundMessageId: string): Promise<void> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!token || !inboundMessageId) return;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: inboundMessageId,
        typing_indicator: { type: "text" },
      }),
      // SEQP1R48 (fix for R47-1): bound this call so it can never legitimately outlive the
      // claim_booking_reminder lease (irrelevant to this specific reminder-adjacent helper's
      // own call site today, but this module's fetch calls are a single shared choke point;
      // see EXTERNAL_SEND_TIMEOUT_MS's own comment above for the full reasoning).
      signal: AbortSignal.timeout(EXTERNAL_SEND_TIMEOUT_MS),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      console.error("WhatsApp typing/read mislukt", resp.status, JSON.stringify(data).slice(0, 200));
    }
  } catch (e) {
    console.error("WhatsApp typing/read exception:", e);
  }
}

// SEQP1R8 (Sequenced Roadmap Phase 1, round 8, P1-9): business-initiated template send.
// A free-form text message (sendWhatsAppText above) is ONLY deliverable within Meta's 24h
// customer-service window (the customer messaged us recently). A proactive reminder for an
// upcoming appointment is sent OUTSIDE that window by definition, so it must go through an
// APPROVED Meta message template (see launch-ready-loop/META_TEMPLATE_REMINDER.md for the
// staged template text/category/variables). This function is dead code with no caller until
// process-booking-reminders/index.ts's WHATSAPP_REMINDER_TEMPLATE_LIVE flag is flipped on,
// which only happens once Mathew has a real Meta-approved template name to configure.
//
// Security: Meta template parameters are plain-text substitution only (no HTML/script
// interpretation on Meta's side), but Meta's Graph API rejects a send (400) if a parameter
// contains a newline/tab or is empty. bodyParams are sanitized here (defense-in-depth, not
// because Meta would silently misrender otherwise) so a customer_name or business_name with
// control characters or excessive whitespace can never break the template payload build.
function sanitizeTemplateParam(value: string, maxLen = 512): string {
  const collapsed = (value ?? "")
    .replace(/[\n\r\t]+/g, " ")
    .replace(/ {5,}/g, "    ") // Meta disallows >4 consecutive spaces in a param
    .trim();
  const safe = collapsed.length > 0 ? collapsed : "-"; // Meta rejects empty string params
  return safe.slice(0, maxLen);
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: "nl" | "en",
  bodyParams: string[],
): Promise<WhatsAppSendResult> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!token) {
    console.error("WHATSAPP_ACCESS_TOKEN ontbreekt, kan geen template versturen");
    return { ok: false, status: 0, error: "missing_access_token" };
  }
  if (!to || !templateName) {
    return { ok: false, status: 0, error: "missing_to_or_template" };
  }

  // SEQP1R9 (P1-9-PHONE): fail closed on an unresolvable phone rather than sending an
  // obviously-wrong `to` to Meta. See normalizePhoneForMeta's own comment for the full
  // reasoning; the caller (sendWhatsAppReminder) is expected to translate this specific
  // "invalid_phone_format" error into its own distinct terminal state, never conflating it
  // with a Meta-template-approval-pending outcome.
  const normalizedTo = normalizePhoneForMeta(to);
  if (!normalizedTo) {
    console.error(`WhatsApp template send geweigerd: telefoonnummer niet betrouwbaar te normaliseren (origineel eindigt op ...${to.slice(-4)})`);
    return { ok: false, status: 0, error: "invalid_phone_format" };
  }

  const safeParams = bodyParams.map((p) => sanitizeTemplateParam(p));
  // Meta's WhatsApp locale codes use underscore, not hyphen (e.g. en_US), but the plain
  // "nl" / "en" codes used at template-submission time (see META_TEMPLATE_REMINDER.md) are
  // also valid Graph API language codes for a template with no region-specific variant.
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: "body",
              parameters: safeParams.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
      // SEQP1R48 (fix for R47-1): this is the reminder-send Meta call. Bounding it well under
      // claim_booking_reminder's 3-minute lease is the core of the fix: a call that would
      // otherwise still be genuinely in-flight when the lease expires now fails fast instead,
      // so process-booking-reminders/index.ts's own try/catch always commits a definite
      // record_booking_reminder_result outcome long before a second invocation could validly
      // re-claim the same row. See EXTERNAL_SEND_TIMEOUT_MS's comment above for the full
      // reasoning and the accepted residual.
      signal: AbortSignal.timeout(EXTERNAL_SEND_TIMEOUT_MS),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("WhatsApp template send mislukt", resp.status, JSON.stringify(data).slice(0, 400));
      return { ok: false, status: resp.status, error: data?.error?.message || "template_send_failed" };
    }
    return { ok: true, status: resp.status, messageId: data?.messages?.[0]?.id };
  } catch (e) {
    console.error("WhatsApp template send exception:", e);
    return { ok: false, status: 0, error: String((e as Error)?.message || e) };
  }
}

export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppSendResult> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!token) {
    console.error("🚨 WHATSAPP_ACCESS_TOKEN ontbreekt — kan niet antwoorden");
    return { ok: false, status: 0, error: "missing_access_token" };
  }
  if (!to || !body) {
    return { ok: false, status: 0, error: "missing_to_or_body" };
  }

  // SEQP1R9 (P1-9-PHONE): today's only live caller (whatsapp-agent) always passes Meta's own
  // inbound `contact.wa_id` straight back, which is already the exact shape this normalizer
  // accepts as-is, so this is a no-op in the current live path (verified, not assumed: see
  // evidence/SEQ_P1_r9.md). Applied anyway at this shared boundary as defense-in-depth against
  // any future caller that passes a less-trusted phone value into a free-form text send.
  const normalizedTo = normalizePhoneForMeta(to);
  if (!normalizedTo) {
    console.error(`WhatsApp text send geweigerd, telefoonnummer niet betrouwbaar te normaliseren (origineel eindigt op ...${to.slice(-4)})`);
    return { ok: false, status: 0, error: "invalid_phone_format" };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedTo,
        type: "text",
        text: { preview_url: false, body: body.slice(0, 4096) },
      }),
      // SEQP1R48 (fix for R47-1): not on the reminder-claim path today (this is the free-form
      // customer-chat reply, sendWhatsAppTemplate above is the reminder sender), bounded anyway
      // since this module's fetch calls are treated as a single shared choke point. See
      // EXTERNAL_SEND_TIMEOUT_MS's comment above for the full reasoning.
      signal: AbortSignal.timeout(EXTERNAL_SEND_TIMEOUT_MS),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("WhatsApp send mislukt", resp.status, JSON.stringify(data).slice(0, 400));
      return { ok: false, status: resp.status, error: data?.error?.message || "send_failed" };
    }
    return { ok: true, status: resp.status, messageId: data?.messages?.[0]?.id };
  } catch (e) {
    console.error("WhatsApp send exception:", e);
    return { ok: false, status: 0, error: String((e as Error)?.message || e) };
  }
}
