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
