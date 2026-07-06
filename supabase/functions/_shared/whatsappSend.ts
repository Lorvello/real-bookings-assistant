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
        to,
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
        to,
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
