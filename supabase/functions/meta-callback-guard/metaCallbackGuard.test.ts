// LAUNCH-RUN 2026-09 / R1 - proof for the Meta callback watchdog's verdict.
//
// The drift fixture is not invented: it is the LITERAL body measured from Graph on 2026-09-05T22:38Z
// (evidence: ~/Bookings Assistant/.reliability/launch_run_2026_09/R01/A2_rollback_voorwaarde_20260906.txt
// and R00/meta_callback_20260906.txt). The healthy fixture is the same body with only the
// callback_url swapped, so the two differ in exactly the one property under test.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  ALERT_RECHECK_WINDOW_MINUTES,
  detectedByFor,
  evaluateSubscriptions,
  type GraphProbe,
  normalizeUrl,
  selfhealEnabled,
  shouldWriteAlert,
  urlsMatch,
} from "./metaCallbackGuard.ts";

const EXPECTED = "https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/whatsapp-webhook";
const N8N = "https://n8n-yls3.onrender.com/webhook/fa7601bc-948c-45d3-8d54-d6c9c62f586c/webhook";

/** The body Graph actually returned on 2026-09-05T22:38:15Z, verbatim. */
const MEASURED_DRIFT_BODY = {
  data: [
    {
      object: "whatsapp_business_account",
      callback_url: N8N,
      active: true,
      fields: [{ name: "messages", version: "v23.0" }],
    },
    { object: "user", callback_url: EXPECTED, active: true },
  ],
};

/** Same body, callback_url swapped to the Supabase webhook. This is what "healed" looks like. */
const HEALED_BODY = {
  data: [
    {
      object: "whatsapp_business_account",
      callback_url: EXPECTED,
      active: true,
      fields: [{ name: "messages", version: "v23.0" }],
    },
    { object: "user", callback_url: EXPECTED, active: true },
  ],
};

function ok200(body: unknown): GraphProbe {
  return { ok: true, httpStatus: 200, body, transportError: null, rawText: JSON.stringify(body) };
}

// ---------------------------------------------------------------- 1. DRIFT IS SEEN

Deno.test("drift: the real measured n8n callback is reported as drift, with both URLs", () => {
  const v = evaluateSubscriptions(ok200(MEASURED_DRIFT_BODY), EXPECTED);
  assertEquals(v.status, "drift");
  assertEquals(v.reason, "callback_url_mismatch");
  assertEquals(v.measuredUrl, N8N);
  assertEquals(v.expectedUrl, EXPECTED);
  // The alarm must name the CAUSE, not the consequence.
  assertStringIncludes(v.human, N8N);
  assertStringIncludes(v.human, EXPECTED);
});

Deno.test("drift: the Supabase URL sitting under object=user does NOT rescue the verdict", () => {
  // This is the exact trap in the live data: the right URL is present in the response, but under
  // the `user` object, which carries no `messages` field and therefore no inbound message.
  const v = evaluateSubscriptions(ok200(MEASURED_DRIFT_BODY), EXPECTED);
  assertEquals(v.status, "drift");
  assert(JSON.stringify(v.evidence).includes("n8n-yls3"), "evidence must carry the measured entry");
});

Deno.test("drift: no whatsapp_business_account subscription at all is drift, not an error", () => {
  const v = evaluateSubscriptions(ok200({ data: [{ object: "user", callback_url: EXPECTED }] }), EXPECTED);
  assertEquals(v.status, "drift");
  assertEquals(v.reason, "subscription_missing");
  assertEquals(v.measuredUrl, null);
});

Deno.test("drift: right URL but the messages field is gone", () => {
  const v = evaluateSubscriptions(
    ok200({ data: [{ object: "whatsapp_business_account", callback_url: EXPECTED, active: true, fields: [] }] }),
    EXPECTED,
  );
  assertEquals(v.status, "drift");
  assertEquals(v.reason, "messages_field_missing");
});

Deno.test("drift: right URL, right field, but the subscription is inactive", () => {
  const v = evaluateSubscriptions(
    ok200({
      data: [{
        object: "whatsapp_business_account",
        callback_url: EXPECTED,
        active: false,
        fields: [{ name: "messages", version: "v23.0" }],
      }],
    }),
    EXPECTED,
  );
  assertEquals(v.status, "drift");
  assertEquals(v.reason, "subscription_inactive");
});

// ------------------------------------------------- 2. NO DRIFT (the fixture WITHOUT the defect)

Deno.test("no drift: the healed callback is reported ok", () => {
  const v = evaluateSubscriptions(ok200(HEALED_BODY), EXPECTED);
  assertEquals(v.status, "ok");
  assertEquals(v.reason, "callback_matches_expected");
  assertEquals(v.measuredUrl, EXPECTED);
});

Deno.test("no drift: a trailing slash is not drift", () => {
  const v = evaluateSubscriptions(
    ok200({
      data: [{
        object: "whatsapp_business_account",
        callback_url: EXPECTED + "/",
        active: true,
        fields: [{ name: "messages", version: "v23.0" }],
      }],
    }),
    EXPECTED,
  );
  assertEquals(v.status, "ok");
});

Deno.test("no drift: a different host IS drift even when the path matches", () => {
  const v = evaluateSubscriptions(
    ok200({
      data: [{
        object: "whatsapp_business_account",
        callback_url: "https://evil.example.com/functions/v1/whatsapp-webhook",
        active: true,
        fields: [{ name: "messages", version: "v23.0" }],
      }],
    }),
    EXPECTED,
  );
  assertEquals(v.status, "drift");
  assertEquals(v.reason, "callback_url_mismatch");
});

// ------------------------------- 3. A FAILED MEASUREMENT IS NEVER "NO DRIFT" (the load-bearing one)

Deno.test("graph HTTP 500 is error, NEVER ok and NEVER silently no-drift", () => {
  const v = evaluateSubscriptions(
    { ok: false, httpStatus: 500, body: { error: { message: "boom" } }, rawText: "{}" },
    EXPECTED,
  );
  assertEquals(v.status, "error");
  assertEquals(v.reason, "graph_http_error");
  assert(v.status !== "ok", "a failed measurement must not read as healthy");
});

Deno.test("graph HTTP 400 OAuthException (bad/expired app token) is error, not ok", () => {
  const v = evaluateSubscriptions(
    {
      ok: false,
      httpStatus: 400,
      body: { error: { message: "Invalid OAuth access token.", type: "OAuthException", code: 190 } },
      rawText: "{}",
    },
    EXPECTED,
  );
  assertEquals(v.status, "error");
  assertEquals(v.reason, "graph_http_error");
  assertStringIncludes(v.human, "could NOT be checked");
});

Deno.test("transport failure (DNS/TLS/timeout) is error, not ok", () => {
  const v = evaluateSubscriptions(
    { ok: false, httpStatus: null, body: null, transportError: "error sending request for url" },
    EXPECTED,
  );
  assertEquals(v.status, "error");
  assertEquals(v.reason, "graph_transport_error");
});

Deno.test("HTTP 200 with an unparseable body is error, not ok", () => {
  const v = evaluateSubscriptions({ ok: true, httpStatus: 200, body: null, rawText: "<html>502</html>" }, EXPECTED);
  assertEquals(v.status, "error");
  assertEquals(v.reason, "graph_response_unparseable");
});

Deno.test("HTTP 200 with an EMPTY data array is drift, not ok and not error", () => {
  // Graph answering `{"data":[]}` means: this app has no subscriptions. Inbound is dead.
  const v = evaluateSubscriptions(ok200({ data: [] }), EXPECTED);
  assertEquals(v.status, "drift");
  assertEquals(v.reason, "subscription_missing");
});

Deno.test("no probe shape can produce ok without a matching measured URL", () => {
  const probes: GraphProbe[] = [
    { ok: false, httpStatus: 500, body: null },
    { ok: false, httpStatus: null, body: null, transportError: "x" },
    { ok: true, httpStatus: 200, body: null },
    { ok: true, httpStatus: 200, body: { data: [] } },
    ok200(MEASURED_DRIFT_BODY),
  ];
  for (const p of probes) {
    const v = evaluateSubscriptions(p, EXPECTED);
    assert(v.status !== "ok", `probe wrongly read as ok: ${JSON.stringify(p).slice(0, 80)}`);
  }
  assertEquals(evaluateSubscriptions(ok200(HEALED_BODY), EXPECTED).status, "ok");
});

// ---------------------------------------------------------------- 4. HELPERS

Deno.test("shouldWriteAlert: first alert always writes", () => {
  assert(shouldWriteAlert(null, new Date()));
});

Deno.test("shouldWriteAlert: inside the recheck window it stays silent, outside it fires again", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const insideWindow = new Date(now.getTime() - (ALERT_RECHECK_WINDOW_MINUTES - 5) * 60_000).toISOString();
  const outsideWindow = new Date(now.getTime() - (ALERT_RECHECK_WINDOW_MINUTES + 5) * 60_000).toISOString();
  assertEquals(shouldWriteAlert(insideWindow, now), false);
  assertEquals(shouldWriteAlert(outsideWindow, now), true);
});

Deno.test("shouldWriteAlert: an unreadable timestamp must not swallow the alarm", () => {
  assert(shouldWriteAlert("not-a-date", new Date()));
});

Deno.test("selfhealEnabled: only the exact string 'on' turns self-heal on", () => {
  assertEquals(selfhealEnabled("on"), true);
  assertEquals(selfhealEnabled("ON"), true);
  assertEquals(selfhealEnabled(" on "), true);
  assertEquals(selfhealEnabled("off"), false);
  assertEquals(selfhealEnabled("true"), false);
  assertEquals(selfhealEnabled("1"), false);
  assertEquals(selfhealEnabled(""), false);
  assertEquals(selfhealEnabled(null), false);
  assertEquals(selfhealEnabled(undefined), false);
});

Deno.test("detectedByFor respects the monitoring_alerts CHECK constraint", () => {
  assertEquals(detectedByFor(null), "pg_cron");
  assertEquals(detectedByFor("BA-LR-2026-09"), "mechanism_test");
});

Deno.test("normalizeUrl / urlsMatch", () => {
  assertEquals(normalizeUrl("https://EXAMPLE.com/a/ "), "https://example.com/a");
  assert(urlsMatch("https://a.test/x", "https://a.test/x/"));
  assert(!urlsMatch("https://a.test/x", "https://b.test/x"));
  assert(!urlsMatch(null, "https://a.test/x"));
});
