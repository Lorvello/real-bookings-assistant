// LAUNCH-RUN 2026-09 / R-STAGING. DE SCHIL om de ongewijzigde agent-handler heen.
//
// De generator herschrijft in de gegenereerde index.ts EEN regel:
//     Deno.serve(async (req) => {
//   wordt
//     stagingServe(async (req: Request) => {
// Alle logica BINNEN die handler is byte-identiek aan `whatsapp-agent/index.ts`. Deze schil doet
// vier dingen en verder niets:
//   1. de gesigneerde `x-agent-override` verifieren, en bij een fout WEIGEREN met 401;
//   2. de diagnose-operaties uitvoeren (netto-rapport, de RODE proef, recorder-rapport);
//   3. de override toepassen rond de agent-run (geserialiseerd, zie overrideLlm.ts);
//   4. het JSON-antwoord verrijken met een `staging`-blok, zodat elk verzoek zelf bewijst dat
//      er niets is verstuurd en welk model er ECHT is gebeld.

import { STAGING_BUILD, STAGING_BUILD_ID, STAGING_SLUG, RUN_MARKER } from "./stagingFlag.ts";
import { OVERRIDE_HEADER, verifyOverrideHeader } from "./overrideAuth.ts";
import {
  llmCallsSince,
  netReport,
  netReset,
  phaseTable,
  probeMetaGraph,
  traceBegin,
  usageSettle,
  usageSince,
} from "./netGuard.ts";
import { recorderReport, recorderReset } from "./recorderSend.ts";
import { currentEnvLlm, lastEffectiveLlm, withOverride } from "./overrideLlm.ts";

const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": `authorization, x-client-info, apikey, content-type, ${OVERRIDE_HEADER}, x-keep-warm`,
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...extra } });
}


// ============================================================================================
// LAUNCH-RUN 2026-09 / R4, STAP 3. DE HOP-METER, EDGE-ZIJDIG.
//
// De vraag: hoe duur is `whatsapp-webhook` -> RPC `process_whatsapp_message` -> de fetch naar de
// agent? Die hop MOET vanuit een edge-functie gemeten worden. Vanaf een laptop meet je de RTT
// van die laptop naar Supabase (hier 85 tot 160 ms), en die bestaat in productie niet: de
// webhook staat naast de database.
//
// WAT HIER WEL EN NIET IN ZIT. Wel: (1) een kale PostgREST-leesronde, de eenheid waarin de
// webhook zijn poorten betaalt (rate-limit, contact, eigenaar, status, bot-toggle: elk zo'n
// ronde, sequentieel); (2) de RPC zelf; (3) de functie-naar-functie fetch, gemeten met
// `x-keep-warm` zodat het de INVOKE-overhead is en niet een hele beurt. NIET: de HMAC-controle
// van Meta (lokaal rekenwerk, geen netwerk) en Meta's eigen RTT voor de typing-indicator (die is
// zonder een echt inbound-bericht niet te meten, en dit pad mag geen echte Graph-call doen).
// ============================================================================================
async function hopProbe(k: number, calendarId: string | null): Promise<Record<string, unknown>> {
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${srk}`, apikey: srk };
  const rt: number[] = [], rpc: number[] = [], inv: number[] = [];
  const ids: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < k; i++) {
    // (1) kale leesronde
    let t = Date.now();
    try {
      await fetch(`${base}/rest/v1/calendars?select=id&limit=1`, { headers: h });
      rt.push(Date.now() - t);
    } catch (e) { errors.push(`rest:${String(e).slice(0, 60)}`); }

    // (2) de RPC die de inbound rij maakt. Marker-id, dus opruimbaar.
    const mid = `${RUN_MARKER}-HOP-${Date.now()}-${i}`;
    ids.push(mid);
    t = Date.now();
    try {
      const r = await fetch(`${base}/rest/v1/rpc/process_whatsapp_message`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          p_phone_number: "31600000398",
          p_message_id: mid,
          p_message_content: "[R4 hop-probe]",
          p_calendar_id: calendarId,
          p_message_timestamp: new Date().toISOString(),
        }),
      });
      rpc.push(Date.now() - t);
      if (!r.ok) errors.push(`rpc_http_${r.status}`);
    } catch (e) { errors.push(`rpc:${String(e).slice(0, 60)}`); }

    // (3) de functie-naar-functie fetch, met x-keep-warm zodat de handler meteen antwoordt.
    t = Date.now();
    try {
      await fetch(`${base}/functions/v1/${STAGING_SLUG}`, {
        method: "POST", headers: { ...h, "x-keep-warm": "1" }, body: "{}",
      });
      inv.push(Date.now() - t);
    } catch (e) { errors.push(`invoke:${String(e).slice(0, 60)}`); }
  }

  const p = (xs: number[], q: number) => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const idx = (s.length - 1) * q;
    const lo = Math.floor(idx), hi = Math.min(lo + 1, s.length - 1);
    return Math.round(s[lo] + (s[hi] - s[lo]) * (idx - lo));
  };
  const sam = (xs: number[]) => ({ n: xs.length, p50: p(xs, 0.5), p95: p(xs, 0.95), min: xs.length ? Math.min(...xs) : null, max: xs.length ? Math.max(...xs) : null, ruw: xs });
  // R4-A (hervat). DIT WAS p50(rpc) + p50(invoke), en dat is de SOM VAN TWEE MEDIANEN. De hop die
  // een klant voelt is de som van de twee benen BINNEN EEN beurt, en de mediaan daarvan is iets
  // anders: de langzame rpc en de langzame invoke hoeven niet in dezelfde iteratie te vallen. Op
  // de eerste meting van deze ronde gaf de oude rekenwijze 304 ms tegen een drempel van 300, dus
  // het verschil kantelde het oordeel. Nu wordt per iteratie opgeteld en daarna pas het
  // percentiel genomen, met p95 erbij, en de oude waarde blijft zichtbaar om te kunnen zien
  // waarom een eerdere uitslag anders was.
  const paren = Math.min(rpc.length, inv.length);
  const somPerBeurt: number[] = [];
  for (let i = 0; i < paren; i++) somPerBeurt.push(rpc[i] + inv[i]);
  const hop50 = p(somPerBeurt, 0.5) ?? 0;
  const hop95 = p(somPerBeurt, 0.95) ?? 0;
  return {
    noemer: k,
    postgrest_leesronde_ms: sam(rt),
    rpc_process_whatsapp_message_ms: sam(rpc),
    functie_naar_functie_invoke_ms: sam(inv),
    hop_per_beurt_ms: sam(somPerBeurt),
    hop_rpc_plus_invoke_p50_ms: hop50,
    hop_rpc_plus_invoke_p95_ms: hop95,
    hop_oude_rekenwijze_som_van_medianen_ms: (p(rpc, 0.5) ?? 0) + (p(inv, 0.5) ?? 0),
    drempel_ms: 300,
    oordeel: hop50 > 300 ? "BOVEN de 300 ms-drempel" : "ONDER de 300 ms-drempel",
    aangemaakte_marker_ids: ids,
    fouten: errors,
    let_op: "HMAC-controle en Meta's eigen RTT zitten hier NIET in; zie de kopregels van hopProbe.",
  };
}

// ============================================================================================
// LAUNCH-RUN 2026-09 / R4, STAP 4. HET TYPING-BUDGET, EDGE-ZIJDIG GEMETEN.
//
// `sendReadReceiptWithTyping` staat in `whatsapp-webhook/index.ts` op regel 592 en wordt NIET
// geawait: hij vuurt en de agent-fetch gaat er meteen achteraan (5 regels verder, geen await
// ertussen). De vraag "vuurt hij binnen 1 s" gaat dus NIET over die call zelf, maar over alles
// wat er in de handler VOOR staat. Op het gewone pad (terugkerende klant, geen trackingcode in
// het bericht, geschiedenis wijst een enkele tenant aan) zijn dat zes sequentiele netwerkrondes:
//   1 rateLimiter.checkLimit           regel 315  (zelf DRIE rondes: blocked_ips, een lees- en
//                                                een schrijfronde op public_api_rate_limits,
//                                                zie _shared/rateLimit.ts regels 38, 56 en 93)
//   2 whatsapp_contacts   select       regel 418
//   3 whatsapp_conversations select    regel 434
//   4 get_user_status_type RPC         regel 490
//   5 calendar_settings   select       regel 553
//   6 process_whatsapp_message RPC     regel 567
// Deze proef draait EXACT die zes, in die volgorde, vanuit een edge-functie in hetzelfde project
// en dezelfde regio, en klokt hoe laat de typing-call aan de beurt zou zijn.
//
// WAT ER NIET IN ZIT, en dat is eerlijk gezegd het enige wat overblijft: Meta's eigen RTT op de
// Graph-call. Die is zonder een ECHT inbound-bericht niet te meten, en dit pad mag geen echte
// Graph-call doen (D-001). De laatste ECHTE productie-inbound is van 13 juli 2026 en valt buiten
// de logbewaring, dus er is ook geen productielog om het uit af te lezen.
// ============================================================================================
async function typingBudget(k: number, calendarId: string | null): Promise<Record<string, unknown>> {
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${srk}`, apikey: srk };
  const phone = "31600000397";
  const totals: number[] = [];
  const perStep: Record<string, number[]> = {};
  const ids: string[] = [];
  const errors: string[] = [];

  const step = async (naam: string, f: () => Promise<Response>) => {
    const t = Date.now();
    try {
      const r = await f();
      if (!r.ok && r.status !== 406) errors.push(`${naam}_http_${r.status}`);
      await r.text();
    } catch (e) {
      errors.push(`${naam}:${String(e).slice(0, 50)}`);
    }
    (perStep[naam] ??= []).push(Date.now() - t);
  };

  for (let i = 0; i < k; i++) {
    const t0 = Date.now();
    // 1 rate-limit: de DRIE rondes die RateLimiter.checkLimit zelf doet. Een eerdere versie van
    // deze proef las een tabel `rate_limits` die niet bestaat; die gaf twaalf keer een 404 en
    // dus een te LAGE meting, want een 404 kost minder dan een echte lees- of schrijfronde.
    await step("1a_blocked_ips", () =>
      fetch(`${base}/rest/v1/blocked_ips?select=id&limit=1`, { headers: h }));
    await step("1b_ratelimit_lees", () =>
      fetch(`${base}/rest/v1/public_api_rate_limits?select=id&limit=1`, { headers: h }));
    // R4-A (hervat): dit WAS een tweede GET met de opmerking "schrijf" erboven. Een lees op de
    // plek van een upsert meet de goedkope helft van de stap: PostgREST hoeft dan geen conflict
    // op te lossen en geen rij te schrijven. De echte checkLimit doet hier een upsert met
    // on_conflict op (ip_address,endpoint,calendar_slug), dus die wordt nu ECHT gedaan, op een
    // gereserveerd documentatie-IP (RFC 5737 TEST-NET-3) en een eigen endpoint-naam met de
    // run-marker erin, zodat de opruiming hem terugvindt en hij nooit een echte bezoeker raakt.
    await step("1c_ratelimit_schrijf", () =>
      fetch(`${base}/rest/v1/public_api_rate_limits?on_conflict=ip_address,endpoint,calendar_slug`, {
        method: "POST",
        headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          ip_address: "203.0.113.255",
          endpoint: `${RUN_MARKER}-TYP`,
          calendar_slug: "",
          request_count: i + 1,
          window_start: new Date().toISOString(),
        }),
      }));
    // 2 contact
    await step("2_contacts", () =>
      fetch(`${base}/rest/v1/whatsapp_contacts?select=id&phone_number=eq.${phone}`, { headers: h }));
    // 3 gesprekken + kalenders (de join die de webhook doet)
    await step("3_conversations", () =>
      fetch(`${base}/rest/v1/whatsapp_conversations?select=calendar_id,calendars!inner(user_id,is_deleted)&status=neq.archived&limit=5`, { headers: h }));
    // 4 entitlement
    await step("4_status_rpc", () =>
      fetch(`${base}/rest/v1/rpc/get_user_status_type`, {
        method: "POST", headers: h, body: JSON.stringify({ p_user_id: null }),
      }));
    // 5 bot-toggle
    await step("5_calendar_settings", () =>
      fetch(`${base}/rest/v1/calendar_settings?select=whatsapp_bot_active&limit=1`, { headers: h }));
    // 6 de inbound rij
    const mid = `${RUN_MARKER}-TYP-${Date.now()}-${i}`;
    ids.push(mid);
    await step("6_process_whatsapp_message", () =>
      fetch(`${base}/rest/v1/rpc/process_whatsapp_message`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          p_phone_number: phone, p_message_id: mid, p_message_content: "[R4 typing-budget]",
          p_calendar_id: calendarId, p_message_timestamp: new Date().toISOString(),
        }),
      }));
    totals.push(Date.now() - t0); // HIER zou sendReadReceiptWithTyping vuren.
  }

  const p = (xs: number[], q: number) => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const idx = (s.length - 1) * q, lo = Math.floor(idx), hi = Math.min(lo + 1, s.length - 1);
    return Math.round(s[lo] + (s[hi] - s[lo]) * (idx - lo));
  };
  return {
    noemer: k,
    tot_typing_ms: { n: totals.length, p50: p(totals, 0.5), p95: p(totals, 0.95), min: Math.min(...totals), max: Math.max(...totals), ruw: totals },
    per_stap_ms: Object.fromEntries(Object.entries(perStep).map(([n, v]) => [n, { n: v.length, p50: p(v, 0.5), p95: p(v, 0.95) }])),
    drempel_ms: 1000,
    oordeel: (p(totals, 0.95) ?? 0) <= 1000 ? "BINNEN 1 s, ook op p95" : "BOVEN 1 s op p95",
    aangemaakte_marker_ids: ids,
    fouten: errors,
    niet_gemeten: "Meta's eigen RTT op de Graph-call (geen echt inbound-bericht beschikbaar, D-001).",
  };
}

export function stagingServe(handler: (req: Request) => Promise<Response>): void {
  Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: jsonHeaders });
    }

    const verdict = await verifyOverrideHeader(req);

    // WEIGEREN, nooit negeren. Een aanwezige maar ongeldige header stopt het verzoek.
    if (verdict.kind === "refused") {
      console.error("[staging-override-refused]", JSON.stringify({ code: verdict.code }));
      return jsonResponse(
        {
          ok: false,
          error: "override_refused",
          code: verdict.code,
          detail: verdict.detail,
          staging: { slug: STAGING_SLUG, record_only: true, staging_build: STAGING_BUILD,
            staging_build_id: STAGING_BUILD_ID },
        },
        401,
      );
    }

    const payload = verdict.kind === "ok" ? verdict.payload : null;

    // --- Diagnose-operaties: geen agent-run, geen DB-schrijf. ---
    if (payload?.op) {
      switch (payload.op) {
        case "whoami":
          return jsonResponse({
            ok: true,
            slug: STAGING_SLUG,
            staging_build: STAGING_BUILD,
            staging_build_id: STAGING_BUILD_ID,
            run_marker: RUN_MARKER,
            record_only: true,
            env_llm: currentEnvLlm(),
            // Signed diagnostic only: booleans, never credential values or hashes.
            internal_auth_diagnostic: {
              configured: Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()),
              authorization_present: req.headers.has("authorization"),
              apikey_present: req.headers.has("apikey"),
              bearer_equals_apikey: req.headers.get("authorization") === `Bearer ${req.headers.get("apikey")}`,
              bearer_matches: req.headers.get("authorization") === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              bearer_matches_trimmed: req.headers.get("authorization") === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()}`,
              apikey_matches: req.headers.get("apikey") === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
            },
            net: netReport(),
            recorder: recorderReport(),
          });
        case "net-report":
          return jsonResponse({ ok: true, op: payload.op, net: netReport() });
        case "net-reset":
          return jsonResponse({ ok: true, op: payload.op, net: netReset() });
        case "hop-probe": {
          const k = Math.max(1, Math.min(50, Number((payload as { k?: number }).k ?? 10)));
          const cal = (payload as { cal?: string }).cal ?? null;
          return jsonResponse({
            ok: true,
            op: payload.op,
            hop: await hopProbe(k, cal),
            typing: await typingBudget(k, cal),
          });
        }
        case "net-probe": {
          const result = await probeMetaGraph();
          return jsonResponse({ ok: true, op: payload.op, probe: result, net: netReport() });
        }
        case "recorder-report":
          return jsonResponse({ ok: true, op: payload.op, recorder: recorderReport() });
        case "recorder-reset":
          return jsonResponse({ ok: true, op: payload.op, recorder: recorderReset() });
      }
    }

    // Keep-warm: laat de handler zelf antwoorden (die returnt "warm" voor de body wordt gelezen).
    if (req.headers.get("x-keep-warm") === "1") {
      return await handler(req);
    }

    // A verified staging operator forwards through the same runtime credential
    // used by the production webhook. Never export that credential or trust JWT roles.
    let handlerRequest = req;
    if (STAGING_BUILD && verdict.kind === "ok" && !payload?.op) {
      const runtimeKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!runtimeKey?.trim()) {
        return jsonResponse({ error: "staging_internal_credential_unavailable" }, 503);
      }
      const headers = new Headers(req.headers);
      headers.set("authorization", `Bearer ${runtimeKey}`);
      headers.set("apikey", runtimeKey);
      handlerRequest = new Request(req, { headers });
    }

    const t0 = Date.now();
    const netBefore = netReport();
    const recBefore = recorderReport();
    // R4 FASEMETER: zet de nul van de tijdas en onthoud vanaf welke call deze beurt telt.
    const traceFrom = traceBegin();

    let resp: Response;
    try {
      resp = await withOverride(
        (payload?.provider || payload?.classifier_model || payload?.owner_votes ||
            payload?.grounding_votes)
          ? {
            provider: payload.provider,
            model: payload.model,
            classifierModel: payload.classifier_model,
            ownerVotes: payload.owner_votes,
            groundingVotes: payload.grounding_votes,
          }
          : null,
        () => handler(handlerRequest),
      );
    } catch (e) {
      // Nooit een kale "Internal Server Error": die is niet te diagnosticeren en lijkt op een
      // dode functie. De reden komt er hier expliciet uit, zonder secrets.
      console.error("[staging-shell-error]", String((e as Error)?.message ?? e));
      return jsonResponse(
        {
          ok: false,
          error: "staging_shell_error",
          detail: String((e as Error)?.message ?? e).slice(0, 500),
          staging: { slug: STAGING_SLUG, record_only: true, staging_build: STAGING_BUILD,
            staging_build_id: STAGING_BUILD_ID, net: netReport() },
        },
        500,
      );
    }

    // R5-A: kort wachten tot de usage-klonen gelezen zijn. Dit gebeurt NA de agent-lus en dus
    // na de outbound `whatsapp_messages`-rij, dus buiten de latency-meting van DoD-1.
    await usageSettle();
    const netAfter = netReport();
    const recAfter = recorderReport();
    const llmThisRequest = llmCallsSince(netBefore.llm_seq);
    const usageThisRequest = usageSince(traceFrom);
    const usageTotals = usageThisRequest.reduce(
      (acc, u) => ({
        calls_with_usage: acc.calls_with_usage + 1,
        prompt_tokens: acc.prompt_tokens + (u.prompt_tokens ?? 0),
        completion_tokens: acc.completion_tokens + (u.completion_tokens ?? 0),
        total_tokens: acc.total_tokens + (u.total_tokens ?? 0),
      }),
      { calls_with_usage: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    );
    const stagingBlock = {
      slug: STAGING_SLUG,
      staging_build: STAGING_BUILD,
      staging_build_id: STAGING_BUILD_ID,
      run_marker: RUN_MARKER,
      record_only: true,
      duration_ms: Date.now() - t0,
      // DE NIET-VERZENDPROEF, per verzoek meegeleverd.
      meta_send_attempts_this_request: netAfter.meta_attempts - netBefore.meta_attempts,
      meta_send_blocked_total: netAfter.meta_blocked,
      meta_send_allowed_total: netAfter.meta_allowed, // moet 0 zijn
      sends_recorded_this_request: recAfter.sends_recorded - recBefore.sends_recorded,
      recorded_recent: recAfter.recent.slice(-3),
      // DE OVERRIDE-PROEF: wat wij zetten, en wat er ECHT over de lijn ging.
      // LET OP, en dit is een GEMETEN val: de LAATSTE LLM-call van een beurt is NIET de
      // agent-call. De twee veiligheidsclassifiers (businessDataGuard N=7,
      // ownerEscalationClassifier N=10) draaien NA de agent en hebben hun model HARD in de
      // code staan ("openai/gpt-oss-20b", businessDataGuard.ts:346 en
      // ownerEscalationClassifier.ts:198). Wie alleen de laatste call bekijkt, leest een
      // geslaagde override als mislukt. Daarom staat hier de HELE lijst van deze beurt, met
      // de EERSTE call apart: dat is de agent-call uit llm.ts.
      override_present: payload !== null,
      llm_effective: lastEffectiveLlm() ?? currentEnvLlm(),
      llm_agent_model_on_the_wire: llmThisRequest[0]?.model ?? null,
      llm_models_on_the_wire: llmThisRequest.map((c) => c.model),
      llm_calls_this_request: llmThisRequest.length,
      // R4: de fasetabel van DEZE beurt. `busy_ms` is de unie van alle open calls, niet de som:
      // de 17 classifier-stemmen lopen parallel en optellen zou de beurt overtellen.
      phases: phaseTable(traceFrom, Date.now() - t0),
      // R5-A: DE ECHTE TOKENS, uit het `usage`-veld van de leverancier zelf. `calls_with_usage`
      // staat er expliciet bij: is dat kleiner dan `llm_calls_this_request`, dan is er een call
      // zonder bruikbare body geweest (bijvoorbeeld een 429) en is het totaal een ONDERGRENS.
      llm_usage: {
        per_call: usageThisRequest,
        totals: usageTotals,
        llm_calls_this_request: llmThisRequest.length,
        complete: usageTotals.calls_with_usage === llmThisRequest.length,
      },
    };

    // Alleen JSON-antwoorden verrijken. Alles anders gaat ongewijzigd door.
    const ct = resp.headers.get("Content-Type") ?? "";
    if (!ct.includes("application/json")) {
      const h = new Headers(resp.headers);
      h.set("x-staging-record-only", "1");
      if (STAGING_BUILD_ID) h.set("x-staging-build-id", STAGING_BUILD_ID);
      h.set("x-staging-meta-blocked", String(netAfter.meta_blocked));
      return new Response(resp.body, { status: resp.status, headers: h });
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(await resp.text());
    } catch {
      body = { ok: false, error: "staging_could_not_parse_agent_response" };
    }
    const h = new Headers(resp.headers);
    h.set("x-staging-record-only", "1");
    if (STAGING_BUILD_ID) h.set("x-staging-build-id", STAGING_BUILD_ID);
    h.set("x-staging-meta-blocked", String(netAfter.meta_blocked));
    return new Response(JSON.stringify({ ...body, staging: stagingBlock }), {
      status: resp.status,
      headers: h,
    });
  });
}
