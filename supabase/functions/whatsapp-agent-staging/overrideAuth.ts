// LAUNCH-RUN 2026-09 / R-STAGING. DE GESIGNEERDE OVERRIDE-HEADER.
//
// Supabase-secrets zijn projectbreed, dus een bake-off kan het model niet per functie via een
// secret zetten zonder productie te raken. Daarom accepteert DEZE build (en alleen deze build,
// zie stagingFlag.ts) een provider/model-override in de header `x-agent-override`.
//
// VORM
//   x-agent-override: <payload_b64url>.<hmac_sha256_hex>
//   payload_b64url   = base64url( JSON.stringify(payload) )   (geen padding)
//   hmac             = HMAC-SHA256( key = INTERNAL_FUNCTION_SECRET, msg = payload_b64url ), hex
//
// PAYLOAD
//   { "exp": <unix seconds, verplicht>,
//     "provider": "groq" | "openai" | "gemini",     (optioneel)
//     "model": "<modelnaam>",                        (optioneel, alleen met provider)
//     "op": "net-report"|"net-reset"|"net-probe"|"recorder-report"|"recorder-reset"|"whoami" }
//                                                    (optioneel diagnose-commando)
//
// WEIGEREN, NOOIT NEGEREN. Elke header die aanwezig is maar niet klopt levert HTTP 401 met een
// reden-code op. "Negeren" zou betekenen dat een bake-off-ronde stilletjes op het verkeerde model
// draait en dat de uitkomst een verkeerd etiket krijgt.

import { STAGING_BUILD } from "./stagingFlag.ts";

export const OVERRIDE_HEADER = "x-agent-override";

export type OverrideProvider = "groq" | "openai" | "gemini";

export interface OverridePayload {
  exp: number;
  provider?: OverrideProvider;
  model?: string;
  op?: string;
  note?: string;
}

export type OverrideVerdict =
  | { kind: "absent" }
  | { kind: "ok"; payload: OverridePayload }
  | { kind: "refused"; code: string; detail: string };

const VALID_PROVIDERS: OverrideProvider[] = ["groq", "openai", "gemini"];
const VALID_OPS = ["net-report", "net-reset", "net-probe", "recorder-report", "recorder-reset", "whoami"];

// Maximale toegestane geldigheidsduur vooruit. Een handtekening die een jaar geldig is, is een
// permanente sleutel in een logregel.
const MAX_TTL_S = 900; // 15 minuten

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constante-tijd vergelijking: een vroege return op het eerste verschillende teken lekt
// informatie over de handtekening.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

export async function verifyOverrideHeader(req: Request): Promise<OverrideVerdict> {
  const raw = req.headers.get(OVERRIDE_HEADER);
  if (raw === null || raw.trim() === "") return { kind: "absent" };

  // De vlag zit in de BUILD. Draait deze code ooit in een niet-staging build, dan is een
  // override per definitie ongeldig, ook met een geldige handtekening.
  if (!STAGING_BUILD) {
    return { kind: "refused", code: "not_a_staging_build", detail: "override alleen geldig in de staging-build" };
  }

  const secret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
  if (secret === "") {
    // Fail closed: zonder sleutel kan niets geverifieerd worden, dus wordt er niets vertrouwd.
    return { kind: "refused", code: "no_secret_configured", detail: "INTERNAL_FUNCTION_SECRET ontbreekt in deze omgeving" };
  }

  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot === raw.length - 1) {
    return { kind: "refused", code: "malformed_header", detail: "verwacht <payload_b64url>.<hmac_hex>" };
  }
  const payloadPart = raw.slice(0, dot);
  const sigPart = raw.slice(dot + 1).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sigPart)) {
    return { kind: "refused", code: "malformed_signature", detail: "handtekening is geen 64 hex-tekens" };
  }

  const expected = await hmacHex(secret, payloadPart);
  if (!timingSafeEqual(expected, sigPart)) {
    return { kind: "refused", code: "bad_signature", detail: "HMAC komt niet overeen met INTERNAL_FUNCTION_SECRET" };
  }

  let payload: OverridePayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadPart));
  } catch {
    return { kind: "refused", code: "malformed_payload", detail: "payload is geen geldige base64url-JSON" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    return { kind: "refused", code: "missing_exp", detail: "payload.exp (unix seconds) is verplicht" };
  }
  if (payload.exp <= now) {
    return { kind: "refused", code: "expired", detail: `exp ${payload.exp} ligt in het verleden (nu ${now})` };
  }
  if (payload.exp - now > MAX_TTL_S) {
    return { kind: "refused", code: "ttl_too_long", detail: `exp ligt meer dan ${MAX_TTL_S}s vooruit` };
  }

  if (payload.provider !== undefined && !VALID_PROVIDERS.includes(payload.provider)) {
    return { kind: "refused", code: "bad_provider", detail: `provider moet een van ${VALID_PROVIDERS.join(", ")} zijn` };
  }
  if (payload.model !== undefined) {
    if (typeof payload.model !== "string" || payload.model.length === 0 || payload.model.length > 120) {
      return { kind: "refused", code: "bad_model", detail: "model moet een niet-lege string zijn (max 120)" };
    }
    if (payload.provider === undefined) {
      return { kind: "refused", code: "model_without_provider", detail: "model zonder provider is dubbelzinnig" };
    }
  }
  if (payload.op !== undefined && !VALID_OPS.includes(payload.op)) {
    return { kind: "refused", code: "bad_op", detail: `op moet een van ${VALID_OPS.join(", ")} zijn` };
  }

  return { kind: "ok", payload };
}
