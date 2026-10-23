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

import { STAGING_BUILD, STAGING_SLUG, RUN_MARKER } from "./stagingFlag.ts";
import { OVERRIDE_HEADER, verifyOverrideHeader } from "./overrideAuth.ts";
import { llmCallsSince, netReport, netReset, probeMetaGraph } from "./netGuard.ts";
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
          staging: { slug: STAGING_SLUG, record_only: true, staging_build: STAGING_BUILD },
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
            run_marker: RUN_MARKER,
            record_only: true,
            env_llm: currentEnvLlm(),
            net: netReport(),
            recorder: recorderReport(),
          });
        case "net-report":
          return jsonResponse({ ok: true, op: payload.op, net: netReport() });
        case "net-reset":
          return jsonResponse({ ok: true, op: payload.op, net: netReset() });
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

    const t0 = Date.now();
    const netBefore = netReport();
    const recBefore = recorderReport();

    let resp: Response;
    try {
      resp = await withOverride(
        payload?.provider ? { provider: payload.provider, model: payload.model } : null,
        () => handler(req),
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
          staging: { slug: STAGING_SLUG, record_only: true, net: netReport() },
        },
        500,
      );
    }

    const netAfter = netReport();
    const recAfter = recorderReport();
    const llmThisRequest = llmCallsSince(netBefore.llm_seq);
    const stagingBlock = {
      slug: STAGING_SLUG,
      staging_build: STAGING_BUILD,
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
    };

    // Alleen JSON-antwoorden verrijken. Alles anders gaat ongewijzigd door.
    const ct = resp.headers.get("Content-Type") ?? "";
    if (!ct.includes("application/json")) {
      const h = new Headers(resp.headers);
      h.set("x-staging-record-only", "1");
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
    h.set("x-staging-meta-blocked", String(netAfter.meta_blocked));
    return new Response(JSON.stringify({ ...body, staging: stagingBlock }), {
      status: resp.status,
      headers: h,
    });
  });
}
