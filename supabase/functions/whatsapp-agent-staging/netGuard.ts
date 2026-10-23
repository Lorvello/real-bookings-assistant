// LAUNCH-RUN 2026-09 / R-STAGING. DE WACHTER OP DE UITGAANDE LIJN.
//
// WAAROM DIT BESTAAT
// ------------------
// De record-only-eis is niet "vergeet niet de vlag te zetten". Er zijn twee sloten:
//   SLOT 1 (compile-time): de generator vervangt de import van `../_shared/whatsappSend.ts`
//           door `./recorderSend.ts`. In deze build BESTAAT de weg naar de Graph-API dus niet
//           meer in de module-graaf van de agent-code zelf.
//   SLOT 2 (runtime, dit bestand): `globalThis.fetch` wordt vervangen. Elke uitgaande call naar
//           een Meta/WhatsApp-host wordt ONDERSCHEPT, GETELD en met een fout GEWEIGERD.
//
// Slot 2 bestaat omdat slot 1 alleen dekt wat de generator ziet. Een module die morgen wordt
// toegevoegd, een dynamische import, een SDK die zelf een URL bouwt: die komen allemaal langs
// `fetch`. Een poort die alleen meldt stopt niets (memory: a_gate_that_only_reports), dus deze
// wachter GOOIT.
//
// EN OMGEKEERD BEWEZEN: een teller die op 0 staat bewijst niets als hij kapot is. Daarom kent
// deze wachter de operatie `probeMetaGraph()`: die dwingt in de ECHTE gedeployde functie een
// Graph-call af en laat zien dat de wachter hem onderschept, telt en weigert (de RODE proef).
//
// WAT NIET geblokkeerd wordt: Supabase, Groq, OpenAI, Google/Gemini, Stripe, Resend. Anders
// meet je de agent niet meer. Van die calls wordt WEL het model gelezen (zie `llmCalls`), zodat
// de override-proef kan laten zien welk model er ECHT over de lijn ging, niet welk model wij
// dachten te sturen.

import { STAGING_SLUG } from "./stagingFlag.ts";

// Hosts die een WhatsApp-bericht kunnen laten ontstaan of Meta-state kunnen wijzigen.
// Suffix-match op de hostnaam, dus `graph.facebook.com` en `www.facebook.com` vallen er beide in,
// en `notfacebook.com` niet.
const BLOCKED_SUFFIXES = [
  "facebook.com",
  "facebook.net",
  "fbcdn.net",
  "fb.com",
  "fbsbx.com",
  "whatsapp.com",
  "whatsapp.net",
  "wa.me",
  "instagram.com",
  "meta.com",
];

// Hosts waarvan we het `model`-veld uit de body lezen (alleen om te KUNNEN AANTONEN welk model
// er echt is gebeld). De body wordt nooit opgeslagen, alleen host + modelnaam.
const LLM_SUFFIXES = [
  "api.groq.com",
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "api.anthropic.com",
  "api.cerebras.ai",
];

export interface BlockedAttempt {
  at: string;
  method: string;
  host: string;
  path: string;
  via: string;
}

export interface LlmCall {
  seq: number;
  at: string;
  host: string;
  model: string | null;
}

interface GuardState {
  installed: boolean;
  attempts_total: number; // elke fetch die deze isolate deed
  meta_attempts: number; // pogingen naar een geblokkeerde host
  meta_blocked: number; // daarvan geweigerd (moet altijd gelijk zijn aan meta_attempts)
  meta_allowed: number; // moet ALTIJD 0 zijn; een 1 hier is een defect in de wachter zelf
  blocked: BlockedAttempt[]; // laatste 50
  llmCalls: LlmCall[]; // laatste 50
  llmSeq: number; // monotoon, zodat een verzoek ZIJN EIGEN calls kan uitsnijden
}

const state: GuardState = {
  installed: false,
  attempts_total: 0,
  meta_attempts: 0,
  meta_blocked: 0,
  meta_allowed: 0,
  blocked: [],
  llmCalls: [],
  llmSeq: 0,
};

export class MetaSendBlockedError extends Error {
  readonly host: string;
  constructor(host: string, path: string) {
    super(
      `[staging-netguard] GEWEIGERD: uitgaande call naar Meta-host '${host}${path}' vanuit ` +
        `${STAGING_SLUG}. Deze build is record-only (D-001): bulk raakt nooit de productie-Graph.`,
    );
    this.name = "MetaSendBlockedError";
    this.host = host;
  }
}

function hostMatches(host: string, suffixes: string[]): boolean {
  const h = host.toLowerCase();
  return suffixes.some((s) => h === s || h.endsWith("." + s));
}

function urlOf(input: Request | URL | string): URL | null {
  try {
    if (typeof input === "string") return new URL(input);
    if (input instanceof URL) return input;
    return new URL((input as Request).url);
  } catch {
    return null;
  }
}

function push<T>(arr: T[], item: T, max = 50) {
  arr.push(item);
  while (arr.length > max) arr.shift();
}

// `model` uit een JSON-body lezen zonder de body te consumeren voor de echte call.
// Init.body is bij deze codebase altijd een string (JSON.stringify), dus dit is veilig.
function readModelFromInit(init?: RequestInit): string | null {
  try {
    const b = init?.body;
    if (typeof b !== "string") return null;
    const j = JSON.parse(b);
    const m = j?.model;
    return typeof m === "string" ? m : null;
  } catch {
    return null;
  }
}

const originalFetch: typeof fetch = globalThis.fetch;

export function installNetGuard(): void {
  if (state.installed) return;
  state.installed = true;

  const guarded: typeof fetch = (input, init) => {
    state.attempts_total++;
    const u = urlOf(input as Request | URL | string);
    if (u) {
      if (hostMatches(u.hostname, BLOCKED_SUFFIXES)) {
        state.meta_attempts++;
        state.meta_blocked++;
        const method = (init?.method || (input instanceof Request ? input.method : "GET") || "GET")
          .toUpperCase();
        push(state.blocked, {
          at: new Date().toISOString(),
          method,
          host: u.hostname,
          path: u.pathname,
          via: "fetch",
        });
        console.error(
          "[staging-netguard-blocked]",
          JSON.stringify({ host: u.hostname, path: u.pathname, method, total_blocked: state.meta_blocked }),
        );
        // GOOIEN, niet melden. Een afgewezen belofte is wat elke caller in deze codebase
        // als "de send is mislukt" behandelt, dus de agent loopt netjes door zonder te sturen.
        return Promise.reject(new MetaSendBlockedError(u.hostname, u.pathname));
      }
      if (hostMatches(u.hostname, LLM_SUFFIXES)) {
        state.llmSeq++;
        push(state.llmCalls, {
          seq: state.llmSeq,
          at: new Date().toISOString(),
          host: u.hostname,
          model: readModelFromInit(init) ??
            // Gemini zet het model in het PAD, niet in de body.
            (u.pathname.match(/models\/([^:/]+)/)?.[1] ?? null),
        });
      }
    }
    return originalFetch(input as RequestInfo | URL, init);
  };

  globalThis.fetch = guarded;
  console.log(`[staging-netguard] geinstalleerd in ${STAGING_SLUG}; record-only actief.`);
}

export function netReport() {
  return {
    installed: state.installed,
    fetch_is_guarded: globalThis.fetch !== originalFetch,
    attempts_total: state.attempts_total,
    meta_attempts: state.meta_attempts,
    meta_blocked: state.meta_blocked,
    meta_allowed: state.meta_allowed,
    blocked_recent: state.blocked.slice(-10),
    llm_seq: state.llmSeq,
    llm_calls_recent: state.llmCalls.slice(-10),
  };
}

// Alle LLM-calls die NA `seq` zijn gedaan. Zo kan een verzoek precies zijn eigen calls tonen.
// Nodig omdat de laatste call van een beurt NIET de agent-call is: de twee veiligheids-
// classifiers (businessDataGuard N=7, ownerEscalationClassifier N=10) draaien erna en hebben
// hun model HARD in de code staan (openai/gpt-oss-20b). Alleen naar de laatste call kijken
// zou dus een geslaagde override als mislukt laten lezen.
export function llmCallsSince(seq: number): LlmCall[] {
  return state.llmCalls.filter((c) => c.seq > seq);
}

export function netReset() {
  state.attempts_total = 0;
  state.meta_attempts = 0;
  state.meta_blocked = 0;
  state.meta_allowed = 0;
  state.blocked = [];
  state.llmCalls = [];
  state.llmSeq = 0;
  return netReport();
}

export function lastLlmCall(): LlmCall | null {
  return state.llmCalls.length > 0 ? state.llmCalls[state.llmCalls.length - 1] : null;
}

// DE RODE PROEF, in de echte gedeployde functie.
// Dwingt een Graph-call af langs precies het pad dat de productiecode gebruikt en rapporteert
// wat de wachter deed. Slaagt de wachter, dan is `sent` false, `blocked` true en is de teller
// met 1 opgehoogd. Gaat de call WEL door, dan is dat hier zichtbaar als `sent: true` en telt
// `meta_allowed` op: dan is de wachter kapot en mag niemand de groene proef geloven.
export async function probeMetaGraph(): Promise<Record<string, unknown>> {
  const before = netReport();
  const url = "https://graph.facebook.com/v22.0/1204872446033001/messages";
  let outcome: Record<string, unknown>;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "447700900123", // fictief nummer, zou sowieso nooit een echte klant bereiken
        type: "text",
        text: { preview_url: false, body: "[RSTG RODE PROEF] dit mag NOOIT verstuurd worden" },
      }),
    });
    // Als we hier komen is de wachter NIET gesprongen: dat is een defect, en het wordt geteld.
    state.meta_allowed++;
    outcome = { sent: true, blocked: false, http_status: resp.status, verdict: "WACHTER-DEFECT" };
  } catch (e) {
    const isGuard = e instanceof MetaSendBlockedError || String((e as Error)?.name) === "MetaSendBlockedError";
    outcome = {
      sent: false,
      blocked: isGuard,
      error_name: String((e as Error)?.name ?? "unknown"),
      error_message: String((e as Error)?.message ?? e).slice(0, 300),
      verdict: isGuard ? "WACHTER-GREEP-IN" : "GEBLOKKEERD-MAAR-ANDERE-FOUT",
    };
  }
  const after = netReport();
  return {
    probe: "meta-graph-post-messages",
    url,
    outcome,
    teller_voor: { meta_attempts: before.meta_attempts, meta_blocked: before.meta_blocked, meta_allowed: before.meta_allowed },
    teller_na: { meta_attempts: after.meta_attempts, meta_blocked: after.meta_blocked, meta_allowed: after.meta_allowed },
  };
}

// Meteen installeren bij het laden van deze module. De gegenereerde index.ts importeert dit
// bestand als ALLEREERSTE regel, dus de wachter staat er voordat er ook maar iets anders draait.
installNetGuard();
