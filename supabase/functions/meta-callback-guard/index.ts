import {
  ALERT_RECHECK_WINDOW_MINUTES,
  CHECK_FAILED_FAILURE_CLASS,
  DRIFT_FAILURE_CLASS,
  detectedByFor,
  evaluateSubscriptions,
  type GraphProbe,
  type GuardVerdict,
  SELFHEAL_FAILURE_CLASS,
  selfhealEnabled,
  shouldWriteAlert,
  TARGET_FIELD,
  TARGET_OBJECT,
} from "./metaCallbackGuard.ts";

// LAUNCH-RUN 2026-09 / R1 "DE INGANG" - the Meta callback watchdog.
//
// WHAT IT DOES, every 5 minutes on pg_cron:
//   1. GET https://graph.facebook.com/v21.0/{APP_ID}/subscriptions with the app token.
//   2. Compare the callback_url of object `whatsapp_business_account` / field `messages` with the
//      Supabase webhook URL.
//   3. ALWAYS write a row to public.meta_callback_guard_runs - also when everything is fine, so
//      "the watchdog is running" is a thing you can query instead of a thing you assume.
//   4. On drift: write public.monitoring_alerts (failure_class meta_callback_drift) carrying BOTH
//      the measured URL and the expected URL, so the alert names the CAUSE. The existing
//      monitoring-alert-dispatcher (pg_cron, every 5 min) mails it; no new delivery path is built.
//   5. When the Supabase secret META_CALLBACK_SELFHEAL is exactly "on": repair via
//      POST /{APP_ID}/subscriptions, then READ BACK with a fresh GET and write a second row with
//      the read-back verdict. A repair is not believed because the POST returned success; it is
//      believed because the next GET says so.
//
// GATING: invoked by pg_cron via pg_net, which cannot mint a JWT, so verify_jwt=false in
// config.toml and the app layer checks x-internal-secret against MONITORING_ALERT_DISPATCH_SECRET
// (the same monitoring-cron secret the dispatcher uses, already present in Supabase secrets AND in
// vault as `monitoring_alert_dispatch_secret`). Fails closed when the secret is missing or wrong.
//
// SECRET HYGIENE: the app token is `{app_id}|{app_secret}`. It is never logged, never stored in a
// row, and never returned in the response. Only the token-free endpoint path is recorded.

const GRAPH_VERSION = "v21.0";
const DEFAULT_APP_ID = "1298968711868462"; // app "bookingsassistant", WHATSAPP_META_CREDENTIALS.md
const GRAPH_TIMEOUT_MS = 15_000;

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

// NO REMOTE IMPORTS. Measured on 2026-09-05 (evidence R01/B2c): a FRESH deploy of this repo's
// standard `https://esm.sh/@supabase/supabase-js@2.50.0` import no longer boots on this project's
// edge runtime (supabase-edge-runtime-1.74.3 / Deno 2.1.4) - the worker dies before its first log
// line and every call answers HTTP 500 WORKER_ERROR, while the function still reads ACTIVE. A
// byte-identical probe with zero imports booted and answered 200. A watchdog that exists to catch
// a silent outage must not itself be able to die silently on a third-party CDN rebuild, so this
// function talks to PostgREST over plain fetch and uses Deno.serve.
const REST = `${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1`;
const restHeaders: Record<string, string> = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function restInsert(table: string, row: Record<string, unknown>): Promise<{ id: string | null; error: string | null }> {
  try {
    const res = await fetch(`${REST}/${table}`, {
      method: "POST",
      headers: { ...restHeaders, Prefer: "return=representation" },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) return { id: null, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
    const parsed = JSON.parse(text);
    const id = Array.isArray(parsed) && parsed.length ? String(parsed[0].id ?? "") : "";
    return { id: id || null, error: null };
  } catch (e) {
    return { id: null, error: String((e as Error)?.message ?? e) };
  }
}

async function restSelectOne(table: string, query: string): Promise<{ row: Record<string, unknown> | null; error: string | null }> {
  try {
    const res = await fetch(`${REST}/${table}?${query}`, {
      method: "GET",
      headers: restHeaders,
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) return { row: null, error: `HTTP ${res.status}: ${text.slice(0, 300)}` };
    const parsed = JSON.parse(text);
    return { row: Array.isArray(parsed) && parsed.length ? parsed[0] : null, error: null };
  } catch (e) {
    return { row: null, error: String((e as Error)?.message ?? e) };
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function expectedCallbackUrl(): string {
  const override = Deno.env.get("META_CALLBACK_EXPECTED_URL");
  if (override && override.trim()) return override.trim();
  const base = SUPABASE_URL.trim().replace(/\/+$/, "");
  if (base) return `${base}/functions/v1/whatsapp-webhook`;
  return "https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/whatsapp-webhook";
}

function appId(): string {
  return (Deno.env.get("META_APP_ID") ?? DEFAULT_APP_ID).trim();
}

function appToken(): string | null {
  const secret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!secret || !secret.trim()) return null;
  return `${appId()}|${secret.trim()}`;
}

async function probeSubscriptions(token: string): Promise<GraphProbe> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${appId()}/subscriptions` +
    `?access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS) });
    const rawText = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = null;
    }
    return { ok: res.ok, httpStatus: res.status, body, transportError: null, rawText: rawText.slice(0, 2000) };
  } catch (e) {
    return { ok: false, httpStatus: null, body: null, transportError: String((e as Error)?.message ?? e) };
  }
}

async function repairSubscription(token: string, callbackUrl: string, verifyToken: string) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${appId()}/subscriptions`;
  const form = new URLSearchParams({
    object: TARGET_OBJECT,
    fields: TARGET_FIELD,
    callback_url: callbackUrl,
    verify_token: verifyToken,
    access_token: token,
  });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    });
    const rawText = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = null;
    }
    const success = res.ok && typeof body === "object" && body !== null &&
      (body as Record<string, unknown>).success === true;
    return { httpStatus: res.status, success, body, rawText: rawText.slice(0, 2000), transportError: null as string | null };
  } catch (e) {
    return {
      httpStatus: null as number | null,
      success: false,
      body: null,
      rawText: null,
      transportError: String((e as Error)?.message ?? e),
    };
  }
}

async function writeRun(row: Record<string, unknown>): Promise<string | null> {
  const { id, error } = await restInsert("meta_callback_guard_runs", row);
  if (error) console.error("meta-callback-guard: run row insert failed:", error);
  return id;
}

/**
 * Marker-aware dedupe. A marked test row must never be able to silence a real production alert,
 * so the "is there a recent one" lookup is scoped to the same marker-ness as the row we are about
 * to write. Window mirrors scan_monitoring_heartbeat's recheck_window pattern.
 */
async function writeAlertDeduped(
  failureClass: string,
  details: Record<string, unknown>,
  runMarker: string | null,
): Promise<{ written: boolean; id: string | null; suppressedBecauseOf: string | null }> {
  const since = new Date(Date.now() - ALERT_RECHECK_WINDOW_MINUTES * 60_000).toISOString();
  const markerFilter = runMarker
    ? `details->>run_marker=eq.${encodeURIComponent(runMarker)}`
    : `details->>run_marker=is.null`;
  const query =
    `select=id,created_at&failure_class=eq.${encodeURIComponent(failureClass)}` +
    `&created_at=gte.${encodeURIComponent(since)}&${markerFilter}` +
    `&order=created_at.desc&limit=1`;

  const { row: recent, error: recentErr } = await restSelectOne("monitoring_alerts", query);
  if (recentErr) {
    console.error("meta-callback-guard: dedupe lookup failed, writing anyway:", recentErr);
  }
  const lastAt = (recent?.created_at as string | undefined) ?? null;
  if (!recentErr && !shouldWriteAlert(lastAt)) {
    return { written: false, id: null, suppressedBecauseOf: lastAt };
  }

  const { id, error } = await restInsert("monitoring_alerts", {
    failure_class: failureClass,
    conversation_id: null,
    contact_phone: null,
    turn_id: null,
    details,
    detected_by: detectedByFor(runMarker),
  });
  if (error) {
    console.error("meta-callback-guard: alert insert failed:", error);
    return { written: false, id: null, suppressedBecauseOf: null };
  }
  return { written: true, id, suppressedBecauseOf: null };
}

function alertDetails(
  verdict: GuardVerdict,
  extra: Record<string, unknown>,
  runMarker: string | null,
): Record<string, unknown> {
  return {
    reason: verdict.reason,
    // The two numbers the 3am reader needs, side by side. This is what the 54 days of
    // monitor_heartbeat_missing alerts never contained.
    measured_callback_url: verdict.measuredUrl,
    expected_callback_url: verdict.expectedUrl,
    graph_object: TARGET_OBJECT,
    graph_field: TARGET_FIELD,
    graph_version: GRAPH_VERSION,
    app_id: appId(),
    message: verdict.human,
    checked_at: new Date().toISOString(),
    run_marker: runMarker,
    evidence: verdict.evidence,
    ...extra,
  };
}

async function runGuard(runMarker: string | null) {
  const expectedUrl = expectedCallbackUrl();
  const selfhealRaw = Deno.env.get("META_CALLBACK_SELFHEAL");
  const selfheal = selfhealEnabled(selfhealRaw);
  const token = appToken();
  const startedAt = new Date().toISOString();

  if (!token) {
    // No app secret means the check cannot be performed. That is an error, never an ok.
    const verdict: GuardVerdict = {
      status: "error",
      reason: "graph_transport_error",
      measuredUrl: null,
      expectedUrl,
      human: "The Meta callback could NOT be checked: the Supabase secret WHATSAPP_APP_SECRET is missing.",
      evidence: { missing_secret: "WHATSAPP_APP_SECRET" },
    };
    const runId = await writeRun({
      status: "error",
      reason: verdict.reason,
      phase: "check",
      measured_url: null,
      expected_url: expectedUrl,
      selfheal_enabled: selfheal,
      selfheal_attempted: false,
      selfheal_ok: null,
      http_status: null,
      run_marker: runMarker,
      detected_by: detectedByFor(runMarker),
      details: { message: verdict.human, started_at: startedAt },
    });
    const alert = await writeAlertDeduped(CHECK_FAILED_FAILURE_CLASS, alertDetails(verdict, {}, runMarker), runMarker);
    return { verdict, runId, alert, selfheal, selfhealResult: null, readback: null };
  }

  const probe = await probeSubscriptions(token);
  const verdict = evaluateSubscriptions(probe, expectedUrl);

  const runId = await writeRun({
    status: verdict.status,
    reason: verdict.reason,
    phase: "check",
    measured_url: verdict.measuredUrl,
    expected_url: expectedUrl,
    selfheal_enabled: selfheal,
    selfheal_attempted: false,
    selfheal_ok: null,
    http_status: probe.httpStatus,
    run_marker: runMarker,
    detected_by: detectedByFor(runMarker),
    details: {
      message: verdict.human,
      started_at: startedAt,
      graph_version: GRAPH_VERSION,
      graph_endpoint: `https://graph.facebook.com/${GRAPH_VERSION}/${appId()}/subscriptions`,
      evidence: verdict.evidence,
    },
  });

  let alert = { written: false, id: null as string | null, suppressedBecauseOf: null as string | null };
  if (verdict.status === "drift") {
    alert = await writeAlertDeduped(DRIFT_FAILURE_CLASS, alertDetails(verdict, {}, runMarker), runMarker);
  } else if (verdict.status === "error") {
    alert = await writeAlertDeduped(CHECK_FAILED_FAILURE_CLASS, alertDetails(verdict, {}, runMarker), runMarker);
  }

  // ---- self-heal ---------------------------------------------------------------------------
  if (verdict.status !== "drift" || !selfheal) {
    return { verdict, runId, alert, selfheal, selfhealResult: null, readback: null };
  }

  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
  if (!verifyToken.trim()) {
    const details = alertDetails(verdict, {
      selfheal_attempted: false,
      selfheal_blocked_by: "WHATSAPP_VERIFY_TOKEN missing; Meta refuses a subscription POST without it",
    }, runMarker);
    const healAlert = await writeAlertDeduped(SELFHEAL_FAILURE_CLASS, details, runMarker);
    return { verdict, runId, alert, selfheal, selfhealResult: { blocked: true }, readback: null, healAlert };
  }

  const repair = await repairSubscription(token, expectedUrl, verifyToken.trim());

  // The POST saying success is NOT the proof. A fresh GET is.
  const readbackProbe = await probeSubscriptions(token);
  const readback = evaluateSubscriptions(readbackProbe, expectedUrl);

  const readbackRunId = await writeRun({
    status: readback.status,
    reason: readback.reason,
    phase: "readback",
    measured_url: readback.measuredUrl,
    expected_url: expectedUrl,
    selfheal_enabled: true,
    selfheal_attempted: true,
    selfheal_ok: readback.status === "ok",
    http_status: readbackProbe.httpStatus,
    run_marker: runMarker,
    detected_by: detectedByFor(runMarker),
    details: {
      message: readback.human,
      repair_http_status: repair.httpStatus,
      repair_reported_success: repair.success,
      repair_transport_error: repair.transportError,
      repair_body: repair.body,
      before_url: verdict.measuredUrl,
      evidence: readback.evidence,
    },
  });

  const healAlert = await writeAlertDeduped(
    SELFHEAL_FAILURE_CLASS,
    alertDetails(readback, {
      selfheal_attempted: true,
      selfheal_repaired: readback.status === "ok",
      repair_http_status: repair.httpStatus,
      repair_reported_success: repair.success,
      url_before: verdict.measuredUrl,
      url_after_readback: readback.measuredUrl,
      message: readback.status === "ok"
        ? `Self-heal repaired the Meta ${TARGET_FIELD} callback: it pointed at ${verdict.measuredUrl}, ` +
          `a fresh read-back now shows ${readback.measuredUrl}.`
        : `Self-heal FAILED: the callback still does not point at ${expectedUrl} after the repair POST ` +
          `(read-back says ${readback.measuredUrl ?? "unreadable"}). Human action needed.`,
    }, runMarker),
    runMarker,
  );

  return {
    verdict,
    runId,
    alert,
    selfheal,
    selfhealResult: {
      repair_http_status: repair.httpStatus,
      repair_reported_success: repair.success,
      repair_transport_error: repair.transportError,
    },
    readback: { status: readback.status, reason: readback.reason, measuredUrl: readback.measuredUrl, runId: readbackRunId },
    healAlert,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expectedSecret = Deno.env.get("MONITORING_ALERT_DISPATCH_SECRET");
  if (!expectedSecret || req.headers.get("x-internal-secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let runMarker: string | null = null;
  try {
    const body = await req.json();
    const m = (body as Record<string, unknown>)?.run_marker;
    if (typeof m === "string" && m.trim()) runMarker = m.trim();
  } catch {
    // no body / not JSON: a plain cron invocation
  }

  try {
    const result = await runGuard(runMarker);
    return new Response(
      JSON.stringify({
        success: true,
        status: result.verdict.status,
        reason: result.verdict.reason,
        measured_callback_url: result.verdict.measuredUrl,
        expected_callback_url: result.verdict.expectedUrl,
        message: result.verdict.human,
        selfheal_enabled: result.selfheal,
        selfheal: result.selfhealResult,
        readback: result.readback,
        run_row_id: result.runId,
        alert_written: result.alert.written,
        alert_id: result.alert.id,
        alert_suppressed_because_of: result.alert.suppressedBecauseOf,
        selfheal_alert: (result as { healAlert?: unknown }).healAlert ?? null,
        run_marker: runMarker,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("meta-callback-guard error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String((error as Error)?.message ?? error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};

Deno.serve(handler);
