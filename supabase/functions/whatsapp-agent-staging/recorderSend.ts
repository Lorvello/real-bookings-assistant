// LAUNCH-RUN 2026-09 / R-STAGING. DE RECORDER die de Meta-send VERVANGT.
//
// Dit bestand is een drop-in vervanging voor `../_shared/whatsappSend.ts`. De generator
// (`build_staging.py`) herschrijft in de gegenereerde `index.ts` precies EEN importregel:
//     import { sendWhatsAppText } from "../_shared/whatsappSend.ts";
//   wordt
//     import { sendWhatsAppText } from "./recorderSend.ts";
// Daarmee is de weg naar `graph.facebook.com` in deze build FYSIEK AFWEZIG in de module-graaf
// van de agent: er is geen vlag die je kunt vergeten, want de code die kan versturen wordt
// niet meer meegebundeld.
//
// De signatuur en het retourcontract zijn IDENTIEK aan het origineel (`WhatsAppSendResult`),
// zodat alle vervolglogica in index.ts (status 'sent'/'failed', message_id op de outbound rij,
// de `[bg-send-failed]`-logregel) exact hetzelfde loopt als in productie.
//
// De reply wordt NIET hier in de database gezet. Dat doet index.ts zelf, ongewijzigd, met de
// message_id die deze recorder teruggeeft. Zo blijft de outbound-rij precies zo ontstaan als
// in productie en meet de latency-meter een echt paar.

import { RUN_MARKER, STAGING_OUTBOUND_PREFIX, STAGING_SLUG } from "./stagingFlag.ts";

export const EXTERNAL_SEND_TIMEOUT_MS = 45_000;

export interface WhatsAppSendResult {
  ok: boolean;
  status: number;
  messageId?: string;
  error?: string;
}

export interface RecordedSend {
  at: string;
  kind: "text" | "template" | "read_receipt_typing";
  to_suffix: string; // nooit het hele nummer in het bewijs
  body_len: number;
  body_head: string;
  message_id: string;
}

const recorded: RecordedSend[] = [];
let counter = 0;

function newMessageId(): string {
  counter++;
  // Uniek per isolate-invocatie: tijd + teller + toeval. UNIQUE-botsing op
  // whatsapp_messages.message_id is daarmee praktisch uitgesloten.
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${STAGING_OUTBOUND_PREFIX}${Date.now()}-${counter}-${rnd}`;
}

function record(kind: RecordedSend["kind"], to: string, body: string, messageId: string) {
  const item: RecordedSend = {
    at: new Date().toISOString(),
    kind,
    to_suffix: String(to ?? "").slice(-4),
    body_len: String(body ?? "").length,
    body_head: String(body ?? "").slice(0, 160),
    message_id: messageId,
  };
  recorded.push(item);
  while (recorded.length > 100) recorded.shift();
  console.log(
    "[staging-record-only]",
    JSON.stringify({ slug: STAGING_SLUG, marker: RUN_MARKER, kind, to_suffix: item.to_suffix, body_len: item.body_len, message_id: messageId }),
  );
}

export function recorderReport() {
  return {
    record_only: true,
    graph_module_present: false,
    sends_recorded: recorded.length,
    recent: recorded.slice(-10),
  };
}

export function recorderReset() {
  recorded.length = 0;
  counter = 0;
  return recorderReport();
}

// Overgenomen uit het origineel (byte-identiek gedrag), zodat een onnormaliseerbaar nummer
// hier net zo hard faalt als in productie en de suite dat verschil niet maskeert.
export function normalizePhoneForMeta(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const hadPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");
  const had00 = !hadPlus && digitsOnly.startsWith("00");
  const cleanedRaw = (hadPlus || had00) ? trimmed.replace(/\(0\)/g, "") : trimmed;
  let digits = cleanedRaw.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (had00) digits = digits.slice(2);
  let candidate: string;
  if (hadPlus || had00) {
    candidate = digits;
  } else if (/^[1-9]\d{9,14}$/.test(digits)) {
    // Kale internationale MSISDN (de wa_id-vorm van Meta), zoals het origineel.
    candidate = digits;
  } else {
    // Bare-local: het origineel faalt hier bewust dicht (SEQP1R10), geen landgok.
    return null;
  }
  if (!/^[1-9]\d{9,14}$/.test(candidate)) return null;
  return candidate;
}

export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppSendResult> {
  // Dezelfde vroege afwijzingen als het origineel, zodat de agent-logica identiek loopt.
  if (!to || !body) return { ok: false, status: 0, error: "missing_to_or_body" };
  const normalizedTo = normalizePhoneForMeta(to);
  if (!normalizedTo) {
    console.error(`[staging-record-only] send geweigerd: nummer niet normaliseerbaar (...${String(to).slice(-4)})`);
    return { ok: false, status: 0, error: "invalid_phone_format" };
  }
  const messageId = newMessageId();
  record("text", normalizedTo, body, messageId);
  // status 200 en ok:true, zodat de outbound rij status 'sent' krijgt en de latency-meting
  // hetzelfde paar ziet als in productie. Er is geen netwerkcall gedaan.
  return await Promise.resolve({ ok: true, status: 200, messageId });
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  _languageCode: "nl" | "en",
  bodyParams: string[],
): Promise<WhatsAppSendResult> {
  if (!to || !templateName) return { ok: false, status: 0, error: "missing_to_or_template" };
  const normalizedTo = normalizePhoneForMeta(to);
  if (!normalizedTo) return { ok: false, status: 0, error: "invalid_phone_format" };
  const messageId = newMessageId();
  record("template", normalizedTo, `${templateName}(${bodyParams.join("|")})`, messageId);
  return await Promise.resolve({ ok: true, status: 200, messageId });
}

export async function sendReadReceiptWithTyping(inboundMessageId: string): Promise<void> {
  if (!inboundMessageId) return;
  record("read_receipt_typing", "", inboundMessageId, `${STAGING_OUTBOUND_PREFIX}typing`);
  return await Promise.resolve();
}
