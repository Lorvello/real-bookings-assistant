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

// ============================================================================================
// LAUNCH-RUN 2026-09 / R5-A. DE TOKENTELLER, uit het `usage`-veld van de LEVERANCIER ZELF.
//
// De bake-off moet de KOSTEN per boekingsconversatie melden. Een schatting uit promptlengte is
// geen meting, en de emmer-delta van Groq's rate-limit-headers is in R4-A GEMETEN als 17x
// spreidend op een vaste instelling en daarom VERWORPEN. Het enige eerlijke getal is wat de
// leverancier zelf terugmeldt: `usage.prompt_tokens` / `usage.completion_tokens` (OpenAI-vorm,
// die Groq deelt) of `usageMetadata.promptTokenCount` (Gemini-vorm).
//
// HOE: het antwoord wordt GEKLOOND en de kloon wordt apart uitgelezen. De originele stream gaat
// ongewijzigd naar de agent, dus de agent-lus merkt hier niets van en de gemeten latency blijft
// de latency van de agent. Het uitlezen is fire-and-forget; `usageSettle()` wacht aan het EIND
// van het verzoek kort tot de laatste kloon gelezen is, dus na de outbound DB-rij en dus buiten
// de latency-meting van DoD-1 (die ankert op `whatsapp_messages.created_at`).
// ============================================================================================
export interface LlmUsage {
  seq: number;
  label: string;
  host: string;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  status: number | null;
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
  traces: FetchTrace[]; // R4: elke uitgaande call met zijn EIGEN duur (laatste 400)
  traceSeq: number;
  usage: LlmUsage[]; // R5-A: het `usage`-veld van de leverancier (laatste 400)
  usagePending: number; // hoeveel klonen er nog gelezen worden
}

// ============================================================================================
// LAUNCH-RUN 2026-09 / R4. DE FASEMETER.
//
// R4 mag niets optimaliseren voordat er een tabel per fase ligt (anders repareer je de
// verkeerde post). Bijna elke fase van een beurt IS een uitgaande call: de DB-prefetch en elke
// tool gaan via PostgREST, de agent-call en elke classifier-stem gaan via Groq. Die lopen
// allemaal langs deze ene wachter, dus hier meten kost NUL wijzigingen in de agent-logica: de
// gegenereerde index.ts blijft byte-identiek aan productie op de 24 herschreven regels na.
//
// Wat NIET langs fetch gaat (promptbouw, guards, regex-werk, JSON) is het verschil tussen de
// totale beurt en de netto-tijd waarin er minstens EEN call open stond. Dat verschil wordt
// apart gerapporteerd als `local_compute_ms`, zodat de tabel optelt en er geen post ontbreekt.
// ============================================================================================
export interface FetchTrace {
  seq: number;
  label: string; // db.rpc:<fn> | db.rest:<tabel> | llm.agent | clf.owner | clf.grounding | net:<host>
  host: string;
  path: string;
  method: string;
  model: string | null; // welk model er ECHT over de lijn ging (uit de body, niet uit onze bedoeling)
  t0: number; // ms sinds de epoch die het verzoek zette (traceEpoch)
  dur_ms: number;
  status: number | null; // null = worp (netwerkfout/abort)
  error: string | null;
}

let traceEpoch = 0;

// Waar de LABELS vandaan komen. Bewust op de ECHTE payload, niet op de hostnaam alleen: de
// twee classifiers en de agent-call gaan alle drie naar api.groq.com en zijn alleen uit elkaar
// te houden aan hun body. De discriminator is de EERSTE regel van het user-bericht
// ("MESSAGE: " voor de owner-classifier, "BUSINESS_DATA:" voor de grounding-guard) plus de
// aanwezigheid van `tools` (alleen de agent-lus stuurt tool-definities mee).
function labelFor(u: URL, init?: RequestInit): string {
  const h = u.hostname.toLowerCase();
  if (h.endsWith("supabase.co") || h.endsWith("supabase.in") || h.endsWith("supabase.net")) {
    const m = u.pathname.match(/^\/rest\/v1\/rpc\/([^/?]+)/);
    if (m) return `db.rpc:${m[1]}`;
    const t = u.pathname.match(/^\/rest\/v1\/([^/?]+)/);
    if (t) return `db.rest:${t[1]}`;
    if (u.pathname.startsWith("/functions/v1/")) return `fn:${u.pathname.split("/")[3] ?? "?"}`;
    return "db.other";
  }
  if (h === "api.groq.com" || h === "api.openai.com" || h === "api.cerebras.ai" || h === "api.anthropic.com") {
    try {
      const b = init?.body;
      if (typeof b === "string") {
        const j = JSON.parse(b);
        const msgs = Array.isArray(j?.messages) ? j.messages : [];
        const user = msgs.length > 1 ? String(msgs[msgs.length - 1]?.content ?? "") : "";
        if (user.startsWith("MESSAGE: ")) return "clf.owner";
        if (user.startsWith("BUSINESS_DATA:")) return "clf.grounding";
        if (Array.isArray(j?.tools) && j.tools.length > 0) return "llm.agent";
        return "llm.other";
      }
    } catch { /* labelen mag nooit de call breken */ }
    return "llm.other";
  }
  if (h.endsWith("generativelanguage.googleapis.com")) return "llm.agent";
  return `net:${h}`;
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
  traces: [],
  traceSeq: 0,
  usage: [],
  usagePending: 0,
};

/** Leest het `usage`-veld van een LLM-antwoord uit een KLOON. Nooit uit het origineel. */
function captureUsage(resp: Response, seq: number, label: string, host: string, model: string | null) {
  let clone: Response;
  try {
    clone = resp.clone();
  } catch {
    return; // een antwoord dat niet te klonen is, wordt gewoon niet geteld
  }
  state.usagePending++;
  clone.json().then((j: Record<string, unknown>) => {
    const u = (j?.usage ?? null) as Record<string, number> | null;
    const g = (j?.usageMetadata ?? null) as Record<string, number> | null;
    const row: LlmUsage = {
      seq,
      label,
      host,
      model: (typeof j?.model === "string" ? j.model : null) ?? model,
      prompt_tokens: u ? (u.prompt_tokens ?? null) : (g ? (g.promptTokenCount ?? null) : null),
      completion_tokens: u
        ? (u.completion_tokens ?? null)
        : (g ? (g.candidatesTokenCount ?? null) : null),
      total_tokens: u ? (u.total_tokens ?? null) : (g ? (g.totalTokenCount ?? null) : null),
      status: resp.status,
    };
    push(state.usage, row, 400);
  }).catch(() => {
    // Een antwoord zonder JSON-body (429 met tekst, netwerkfout) telt niet mee. Dat wordt
    // zichtbaar als een LLM-call ZONDER usage-rij, en dat is precies wat het is.
  }).finally(() => {
    state.usagePending--;
  });
}

/** Wacht kort tot de klonen gelezen zijn. Aanroepen NA de agent-lus, nooit ervoor. */
export async function usageSettle(maxMs = 250): Promise<void> {
  const t0 = Date.now();
  while (state.usagePending > 0 && Date.now() - t0 < maxMs) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

export function usageSince(seq: number): LlmUsage[] {
  return state.usage.filter((u) => u.seq > seq);
}

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
    // R4 FASEMETER: de echte call, met zijn EIGEN duur. Bewust hier en niet in de agent-code,
    // zodat er geen enkele regel agent-logica voor de meting hoeft te veranderen.
    if (!u) return originalFetch(input as RequestInfo | URL, init);
    state.traceSeq++;
    const seq = state.traceSeq;
    const method = (init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
    const label = labelFor(u, init);
    const traceModel = hostMatches(u.hostname, LLM_SUFFIXES)
      ? (readModelFromInit(init) ?? (u.pathname.match(/models\/([^:/]+)/)?.[1] ?? null))
      : null;
    const t0 = Date.now() - traceEpoch;
    const started = Date.now();
    return originalFetch(input as RequestInfo | URL, init).then(
      (resp) => {
        push(state.traces, {
          seq, label, host: u.hostname, path: u.pathname, method, model: traceModel,
          t0, dur_ms: Date.now() - started, status: resp.status, error: null,
        }, 400);
        // R5-A: alleen bij een LLM-host, en alleen op een KLOON.
        if (hostMatches(u.hostname, LLM_SUFFIXES)) {
          captureUsage(resp, seq, label, u.hostname, traceModel);
        }
        return resp;
      },
      (err) => {
        push(state.traces, {
          seq, label, host: u.hostname, path: u.pathname, method, model: traceModel,
          t0, dur_ms: Date.now() - started, status: null,
          error: String((err as Error)?.name ?? err).slice(0, 60),
        }, 400);
        throw err;
      },
    );
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
  state.traces = [];
  state.traceSeq = 0;
  state.usage = [];
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


// ============================================================================================
// R4 FASEMETER, de leeskant.
// ============================================================================================

/** Zet de nul van de tijdas voor DIT verzoek en geeft de trace-seq terug om vanaf te snijden. */
export function traceBegin(): number {
  traceEpoch = Date.now();
  return state.traceSeq;
}

export function tracesSince(seq: number): FetchTrace[] {
  return state.traces.filter((t) => t.seq > seq);
}

/**
 * De fasetabel van EEN beurt.
 *
 * `busy_ms` is de UNIE van de intervallen waarin er minstens een call open stond (niet de som:
 * de 17 classifier-stemmen lopen parallel, dus optellen zou de beurt drie keer overtellen en
 * een post laten winnen die in wandkloktijd bijna niets kost). `local_compute_ms` is
 * total - busy, dus alles wat geen netwerk is: promptbouw, guards, regex, JSON.
 */
export function phaseTable(seq: number, totalMs: number) {
  const items = tracesSince(seq);
  const by = new Map<string, { n: number; sum_ms: number; max_ms: number; wall_ms: number; first_t0: number; last_end: number; models: string[] }>();
  for (const t of items) {
    const cur = by.get(t.label) ?? { n: 0, sum_ms: 0, max_ms: 0, wall_ms: 0, first_t0: t.t0, last_end: t.t0 + t.dur_ms, models: [] as string[] };
    cur.n++;
    cur.sum_ms += t.dur_ms;
    cur.max_ms = Math.max(cur.max_ms, t.dur_ms);
    if (t.model && !cur.models.includes(t.model)) cur.models.push(t.model);
    cur.first_t0 = Math.min(cur.first_t0, t.t0);
    cur.last_end = Math.max(cur.last_end, t.t0 + t.dur_ms);
    by.set(t.label, cur);
  }
  // wall_ms per label = unie van de eigen intervallen (parallelle stemmen tellen EEN keer).
  for (const [label, cur] of by) {
    const iv = items.filter((t) => t.label === label)
      .map((t) => [t.t0, t.t0 + t.dur_ms] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    let wall = 0, s0 = -1, e0 = -1;
    for (const [a, b] of iv) {
      if (s0 < 0) { s0 = a; e0 = b; continue; }
      if (a > e0) { wall += e0 - s0; s0 = a; e0 = b; } else { e0 = Math.max(e0, b); }
    }
    if (s0 >= 0) wall += e0 - s0;
    cur.wall_ms = wall;
  }
  // busy = unie over ALLE labels heen.
  const all = items.map((t) => [t.t0, t.t0 + t.dur_ms] as [number, number]).sort((a, b) => a[0] - b[0]);
  let busy = 0, s1 = -1, e1 = -1;
  for (const [a, b] of all) {
    if (s1 < 0) { s1 = a; e1 = b; continue; }
    if (a > e1) { busy += e1 - s1; s1 = a; e1 = b; } else { e1 = Math.max(e1, b); }
  }
  if (s1 >= 0) busy += e1 - s1;
  return {
    total_ms: totalMs,
    busy_ms: busy,
    local_compute_ms: Math.max(0, totalMs - busy),
    calls_total: items.length,
    per_label: Object.fromEntries(
      [...by.entries()].sort((a, b) => b[1].wall_ms - a[1].wall_ms).map(([k, v]) => [k, v]),
    ),
    calls: items,
  };
}
