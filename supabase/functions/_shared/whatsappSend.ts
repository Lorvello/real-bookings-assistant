// Outbound WhatsApp text via the Meta Graph API.
// Used by the whatsapp-agent edge function to reply to customers. The n8n agent
// previously owned all sends; this is the native replacement (port off n8n).
//
// Secrets used: WHATSAPP_ACCESS_TOKEN (Meta permanent/system-user token).
// phoneNumberId defaults to the live BA number (audit-confirmed) but can be
// overridden via WHATSAPP_PHONE_NUMBER_ID.

const GRAPH_VERSION = "v22.0";
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "1204872446033001";

export interface WhatsAppSendResult {
  ok: boolean;
  status: number;
  messageId?: string;
  error?: string;
}

// SEQP1R9 (P1-9-PHONE, sev-3 reopened by R8 verify): `bookings.customer_phone` reaches this
// module's `to` param in at least 3 structurally different unnormalized shapes depending on
// which write path created the row:
//   - WhatsApp-origin (whatsapp-agent/tools.ts): `ctx.phone` = Meta's own inbound `contact.wa_id`,
//     already bare-digits international (e.g. "31612345678"). Safe as-is.
//   - Web-booking-form (create-booking/index.ts via usePublicBookingCreation.tsx): the
//     frontend's validatePhoneNumber() normally produces E.164-with-"+" (e.g. "+31612345678"),
//     but create-booking itself does ZERO phone validation/normalization server-side (only
//     sanitizeBookingText's XSS/control-char strip), so a direct API caller (bypassing the
//     frontend entirely) can put ANYTHING in this column.
//   - Installment-payment (create-installment-payment/index.ts): `customerData.phone` is a
//     raw request-body field written straight to `bookings.customer_phone` with NO validation
//     of any kind, not even the frontend's.
// Since `bookings` has 0 rows in production today (no historical data to migrate) and a
// DB-level trigger would face the exact same "is this ambiguous local number Dutch or not"
// judgment call as this function (relocating the risk, not removing it), the fix lives at the
// one place that actually talks to Meta: right before every Graph API `to` field is built.
// This closes the gap for all 3 write paths (and any future one) at a single choke point,
// mirroring R50's DB-trigger philosophy but applied at the layer where the format actually
// matters (Meta's `to` field), not the storage layer.
//
// Deliberately mirrors whatsapp-webhook/index.ts's `normalizePhone` for the one case that is
// genuinely unambiguous (NL national format, single leading "0"), but adds a documented
// prior bug's exact anti-pattern as a hard NO: usePublicBookingCreation.tsx carries a comment
// (P1-COUNTRYCODE-BOOKING) describing a real shipped bug where a UK customer's bare national-
// format number was silently mis-normalized as Dutch by a naive "assume NL if it doesn't look
// international" heuristic. This function refuses to repeat that shape of guess: a bare
// national-format number for anything OTHER than the single-leading-zero NL case is
// UNRESOLVABLE without a country hint this function does not have, so it fails closed
// (returns null) rather than assuming any default country.
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
  } else if (/^0\d{9}$/.test(digits)) {
    // Exactly 10 digits, single leading "0": the one genuinely unambiguous case for this
    // NL-based product (NL national format, e.g. "0612345678" -> "31612345678"). Mirrors
    // whatsapp-webhook/index.ts's normalizePhone. Deliberately narrow: does NOT extend to
    // "starts with 0" in general (a UK bare-national number, e.g. "07911123456", ALSO starts
    // with a single "0" and is 11 digits, not 10: the length check plus this being the one
    // documented-safe case is the guard against repeating the prior bug).
    candidate = "31" + digits.slice(1);
  } else if (/^[1-9]\d{9,14}$/.test(digits)) {
    // No "+"/"00"/leading-0: already looks like a bare international MSISDN with a country
    // code baked in (e.g. Meta's own wa_id shape "31612345678", or "4479..." etc), 10-15
    // digits, no leading 0. Trust as-is (this is exactly the WhatsApp-origin shape).
    candidate = digits;
  } else {
    // Ambiguous or implausible (e.g. a bare local number for a country whose national format
    // isn't the single-leading-zero NL case, too short, too long, all-zero, garbage). Fail
    // closed rather than guess a default country: this is the exact class of bug (silent
    // UK-as-Dutch mis-normalization) this function exists to never repeat.
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
