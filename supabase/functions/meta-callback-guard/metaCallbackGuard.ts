// LAUNCH-RUN 2026-09 / R1 "DE INGANG" - pure verdict logic for the Meta callback watchdog.
//
// WHY THIS FILE EXISTS SEPARATELY FROM index.ts
// The verdict is the part that can be wrong in a way nobody notices, so it lives here with no
// network, no Deno.env and no database, and is proven by metaCallbackGuard.test.ts. index.ts only
// does I/O around it.
//
// THE ONE RULE THAT SHAPES EVERYTHING BELOW
// A failed measurement is not a green light. If the Graph call did not come back with a parseable
// 200, the verdict is "error" - never "ok". A watchdog whose no-evidence case reads as healthy is
// a receipt, not a gate. (Bookings Assistant doctrine: a gate whose no-evidence case passes is not
// a gate; an alarm must report the CAUSE, not the consequence.)
//
// WHAT WENT WRONG BEFORE, AND WHAT THIS FIXES
// The Meta `messages` callback has been hijacked back to Luciano's n8n three times (2026-06-17,
// 2026-06-24, and the state measured on 2026-09-05/06). The existing monitor_heartbeat_missing
// alarm fired every day for 54 days and never once named the cause: it only ever said "no
// heartbeat". This guard names the cause in the alert payload: the URL Meta actually holds, next
// to the URL it should hold.

export const TARGET_OBJECT = "whatsapp_business_account";
export const TARGET_FIELD = "messages";

/** failure_class written into public.monitoring_alerts when the callback points somewhere else. */
export const DRIFT_FAILURE_CLASS = "meta_callback_drift";
/** failure_class written when the CHECK ITSELF could not be performed (never treated as "ok"). */
export const CHECK_FAILED_FAILURE_CLASS = "meta_callback_check_failed";
/** failure_class written after a self-heal attempt, carrying the read-back result. */
export const SELFHEAL_FAILURE_CLASS = "meta_callback_selfheal";

/**
 * Same shape as scan_monitoring_heartbeat's `recheck_window`: one alert per condition per window,
 * so a persistent fault cannot turn into 288 e-mails a day.
 */
export const ALERT_RECHECK_WINDOW_MINUTES = 60;

export type GuardStatus = "ok" | "drift" | "error";

export type GuardReason =
  | "callback_matches_expected"
  | "callback_url_mismatch"
  | "subscription_missing"
  | "messages_field_missing"
  | "subscription_inactive"
  | "graph_transport_error"
  | "graph_http_error"
  | "graph_response_unparseable";

/** What index.ts hands in after doing the HTTPS GET. No Response object, so this stays testable. */
export interface GraphProbe {
  /** transport succeeded AND status was 2xx */
  ok: boolean;
  httpStatus: number | null;
  /** already JSON.parse'd; null when the body was absent or not JSON */
  body: unknown;
  /** set when fetch() itself threw (DNS, TLS, timeout) */
  transportError?: string | null;
  /** raw body text, kept for the evidence payload; truncated by the caller */
  rawText?: string | null;
}

export interface GuardVerdict {
  status: GuardStatus;
  reason: GuardReason;
  /** the URL Meta actually holds for object/field, or null when we could not read one */
  measuredUrl: string | null;
  expectedUrl: string;
  /** one sentence that names the CAUSE, meant to be read in an e-mail at 3am */
  human: string;
  evidence: Record<string, unknown>;
}

/** Trailing-slash and whitespace differences are not drift. Case of the host is not drift either. */
export function normalizeUrl(raw: string): string {
  const trimmed = String(raw).trim().replace(/\/+$/, "");
  try {
    const u = new URL(trimmed);
    u.hostname = u.hostname.toLowerCase();
    u.protocol = u.protocol.toLowerCase();
    return u.toString().replace(/\/+$/, "");
  } catch {
    return trimmed;
  }
}

export function urlsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  return normalizeUrl(a) === normalizeUrl(b);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * The whole verdict, from a Graph /{app-id}/subscriptions probe.
 *
 * Graph shape we key on (v21.0):
 *   {"data":[{"object":"whatsapp_business_account",
 *             "callback_url":"https://...",
 *             "active":true,
 *             "fields":[{"name":"messages","version":"v23.0"}]}, ...]}
 * Note that callback_url hangs on the OBJECT, not on the field. An earlier parser in this run read
 * it off the field and reported `callback_url=None`, which looked like a missing subscription when
 * the subscription was simply pointing at n8n. That mislabel is the reason this function returns
 * the raw entry in `evidence`.
 */
export function evaluateSubscriptions(probe: GraphProbe, expectedUrl: string): GuardVerdict {
  const base = { expectedUrl, measuredUrl: null as string | null };

  if (probe.transportError) {
    return {
      ...base,
      status: "error",
      reason: "graph_transport_error",
      human:
        "The Meta callback could NOT be checked: the Graph call failed before an answer came back " +
        `(${probe.transportError}). This is not proof that the callback is healthy.`,
      evidence: { transportError: probe.transportError, httpStatus: probe.httpStatus },
    };
  }

  if (!probe.ok || probe.httpStatus === null || probe.httpStatus < 200 || probe.httpStatus >= 300) {
    return {
      ...base,
      status: "error",
      reason: "graph_http_error",
      human:
        `The Meta callback could NOT be checked: Graph answered HTTP ${probe.httpStatus}. ` +
        "This is not proof that the callback is healthy.",
      evidence: { httpStatus: probe.httpStatus, body: probe.body ?? probe.rawText ?? null },
    };
  }

  if (!isRecord(probe.body) || !Array.isArray((probe.body as Record<string, unknown>).data)) {
    return {
      ...base,
      status: "error",
      reason: "graph_response_unparseable",
      human:
        "The Meta callback could NOT be checked: Graph answered 200 but the body had no `data` " +
        "array. This is not proof that the callback is healthy.",
      evidence: { httpStatus: probe.httpStatus, body: probe.body ?? probe.rawText ?? null },
    };
  }

  const entries = (probe.body as Record<string, unknown>).data as unknown[];
  const objectNames = entries.map((e) => (isRecord(e) ? String(e.object ?? "") : ""));
  const entry = entries.find((e) => isRecord(e) && e.object === TARGET_OBJECT) as
    | Record<string, unknown>
    | undefined;

  if (!entry) {
    return {
      ...base,
      status: "drift",
      reason: "subscription_missing",
      human:
        `Meta has NO \`${TARGET_OBJECT}\` subscription at all, so no incoming WhatsApp message can ` +
        `reach ${expectedUrl}. Objects present: ${objectNames.join(", ") || "(none)"}.`,
      evidence: { objectsInResponse: objectNames, denominator: entries.length },
    };
  }

  const fields = Array.isArray(entry.fields) ? (entry.fields as unknown[]) : [];
  const fieldNames = fields.map((f) => (isRecord(f) ? String(f.name ?? "") : String(f)));
  const hasMessages = fieldNames.includes(TARGET_FIELD);
  const measuredUrl = typeof entry.callback_url === "string" ? entry.callback_url : null;

  if (!hasMessages) {
    return {
      status: "drift",
      reason: "messages_field_missing",
      measuredUrl,
      expectedUrl,
      human:
        `Meta's \`${TARGET_OBJECT}\` subscription does not carry the \`${TARGET_FIELD}\` field, so ` +
        "no incoming WhatsApp message is delivered anywhere. " +
        `Fields present: ${fieldNames.join(", ") || "(none)"}.`,
      evidence: { entry, fieldNames, objectsInResponse: objectNames },
    };
  }

  if (entry.active === false) {
    return {
      status: "drift",
      reason: "subscription_inactive",
      measuredUrl,
      expectedUrl,
      human:
        `Meta's \`${TARGET_OBJECT}\`/\`${TARGET_FIELD}\` subscription exists but is INACTIVE, so no ` +
        "incoming WhatsApp message is delivered.",
      evidence: { entry, objectsInResponse: objectNames },
    };
  }

  if (!urlsMatch(measuredUrl, expectedUrl)) {
    return {
      status: "drift",
      reason: "callback_url_mismatch",
      measuredUrl,
      expectedUrl,
      human:
        `Meta delivers every incoming WhatsApp message to ${measuredUrl ?? "(no callback_url)"} ` +
        `instead of ${expectedUrl}. The Bookings Assistant agent therefore never sees them. ` +
        "This is the CAUSE; a missing heartbeat is only the consequence.",
      evidence: { entry, objectsInResponse: objectNames },
    };
  }

  return {
    status: "ok",
    reason: "callback_matches_expected",
    measuredUrl,
    expectedUrl,
    human: `Meta delivers incoming WhatsApp messages to ${expectedUrl}, which is correct.`,
    evidence: { entry, objectsInResponse: objectNames },
  };
}

/**
 * Rate-limit for alert rows, mirroring scan_monitoring_heartbeat's recheck_window.
 * `lastAlertAt` must already be scoped to the same failure_class AND the same marker-ness, so a
 * marked test row can never silence a real production alert.
 */
export function shouldWriteAlert(
  lastAlertAt: string | Date | null | undefined,
  now: Date = new Date(),
  windowMinutes: number = ALERT_RECHECK_WINDOW_MINUTES,
): boolean {
  if (!lastAlertAt) return true;
  const last = lastAlertAt instanceof Date ? lastAlertAt : new Date(lastAlertAt);
  if (Number.isNaN(last.getTime())) return true; // unreadable timestamp -> do not swallow the alarm
  return now.getTime() - last.getTime() >= windowMinutes * 60_000;
}

/** Self-heal only when the secret says exactly "on". Anything else (absent, "off", "true") is off. */
export function selfhealEnabled(raw: string | null | undefined): boolean {
  return typeof raw === "string" && raw.trim().toLowerCase() === "on";
}

/** monitoring_alerts.detected_by has a CHECK constraint: in_turn | pg_cron | mechanism_test. */
export function detectedByFor(runMarker: string | null | undefined): "pg_cron" | "mechanism_test" {
  return runMarker ? "mechanism_test" : "pg_cron";
}
