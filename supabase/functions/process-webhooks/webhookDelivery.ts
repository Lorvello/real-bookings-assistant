export interface ProcessWebhookRequest {
  source?: string;
  calendarId?: string;
  eventId?: string;
  retryFailed: boolean;
  batchSize: number;
}

export interface WebhookClaim {
  delivery_id: string;
  delivery_claim_token: string;
  event_id: string;
  endpoint_id: string;
  endpoint_url: string;
  event_type: string;
  event_payload: unknown;
  calendar_id: string;
  event_created_at: string;
  delivery_attempt: number;
}

export interface WebhookDeliveryResult {
  success: boolean;
  httpStatus: number | null;
  errorCode: string | null;
}

export type DnsRecordType = "A" | "AAAA";
export type DnsResolver = (
  hostname: string,
  recordType: DnsRecordType,
) => Promise<string[]>;
export type WebhookFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface WebhookEgressProxyConfig {
  url: string;
  token: string;
  contractVersion: string;
}

export const WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION = "ba-webhook-egress-v1";
export const MAX_WEBHOOK_EGRESS_ENVELOPE_BYTES = 256 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_SOURCE_PATTERN = /^[a-zA-Z0-9_.:-]{1,80}$/;
const ALLOWED_REQUEST_KEYS = new Set([
  "source",
  "calendar_id",
  "event_id",
  "retry_failed",
  "batch_size",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseProcessWebhookRequest(
  value: unknown,
): ProcessWebhookRequest {
  if (!isRecord(value)) {
    throw new Error("invalid_request");
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_REQUEST_KEYS.has(key)) {
      throw new Error("unknown_field");
    }
  }

  const source = value.source;
  if (
    source !== undefined &&
    (typeof source !== "string" || !SAFE_SOURCE_PATTERN.test(source))
  ) {
    throw new Error("invalid_source");
  }

  const calendarId = value.calendar_id;
  if (
    calendarId !== undefined &&
    (typeof calendarId !== "string" || !UUID_PATTERN.test(calendarId))
  ) {
    throw new Error("invalid_calendar_id");
  }

  const eventId = value.event_id;
  if (
    eventId !== undefined &&
    (typeof eventId !== "string" || !UUID_PATTERN.test(eventId))
  ) {
    throw new Error("invalid_event_id");
  }

  const retryFailed = value.retry_failed ?? false;
  if (typeof retryFailed !== "boolean") {
    throw new Error("invalid_retry_flag");
  }
  if (retryFailed && calendarId === undefined && eventId === undefined) {
    throw new Error("retry_scope_required");
  }

  const batchSize = value.batch_size ?? 25;
  if (
    typeof batchSize !== "number" ||
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 50
  ) {
    throw new Error("invalid_batch_size");
  }

  return {
    source,
    calendarId,
    eventId,
    retryFailed,
    batchSize,
  };
}

export function isWebhookClaim(value: unknown): value is WebhookClaim {
  if (!isRecord(value)) return false;

  return (
    typeof value.delivery_id === "string" &&
    UUID_PATTERN.test(value.delivery_id) &&
    typeof value.delivery_claim_token === "string" &&
    UUID_PATTERN.test(value.delivery_claim_token) &&
    typeof value.event_id === "string" &&
    UUID_PATTERN.test(value.event_id) &&
    typeof value.endpoint_id === "string" &&
    UUID_PATTERN.test(value.endpoint_id) &&
    typeof value.endpoint_url === "string" &&
    typeof value.event_type === "string" &&
    "event_payload" in value &&
    typeof value.calendar_id === "string" &&
    UUID_PATTERN.test(value.calendar_id) &&
    typeof value.event_created_at === "string" &&
    typeof value.delivery_attempt === "number" &&
    Number.isInteger(value.delivery_attempt) &&
    value.delivery_attempt >= 1
  );
}

function parseIpv4(address: string): number[] | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return null;
  const octets = address.split(".").map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
}

function parseIpv6(address: string): number[] | null {
  let normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!normalized || normalized.includes("%")) return null;

  const dottedTail = normalized.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dottedTail) {
    const ipv4 = parseIpv4(dottedTail[1]);
    if (!ipv4) return null;
    const high = ((ipv4[0] << 8) | ipv4[1]).toString(16);
    const low = ((ipv4[2] << 8) | ipv4[3]).toString(16);
    normalized = normalized.slice(0, -dottedTail[1].length) + `${high}:${low}`;
  }

  if (!/^[0-9a-f:]+$/.test(normalized)) return null;
  const compression = normalized.indexOf("::");
  if (compression !== normalized.lastIndexOf("::")) return null;

  const parseSide = (side: string): number[] | null => {
    if (!side) return [];
    const parts = side.split(":");
    if (parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
    return parts.map((part) => Number.parseInt(part, 16));
  };

  if (compression === -1) {
    const words = parseSide(normalized);
    return words?.length === 8 ? words : null;
  }

  const left = parseSide(normalized.slice(0, compression));
  const right = parseSide(normalized.slice(compression + 2));
  if (!left || !right || left.length + right.length >= 8) return null;
  return [
    ...left,
    ...Array(8 - left.length - right.length).fill(0),
    ...right,
  ];
}

function canonicalNetworkAddress(address: string): string | null {
  const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4 = parseIpv4(normalized);
  if (ipv4) return ipv4.join(".");

  const ipv6 = parseIpv6(normalized);
  return ipv6
    ? ipv6.map((word) => word.toString(16).padStart(4, "0")).join(":")
    : null;
}

export function isPublicNetworkAddress(address: string): boolean {
  const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4 = parseIpv4(normalized);

  if (ipv4) {
    const [a, b, c] = ipv4;
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 0 && c === 0) return false;
    if (a === 192 && b === 0 && c === 2) return false;
    if (a === 192 && b === 168) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 198 && b === 51 && c === 100) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    if (a >= 224) return false;
    return true;
  }

  const ipv6 = parseIpv6(normalized);
  if (ipv6) {
    const [a, b, c, d, e, f, g, h] = ipv6;
    if (ipv6.every((word) => word === 0)) return false;
    if (
      a === 0 && b === 0 && c === 0 && d === 0 && e === 0 && f === 0 &&
      g === 0 && h === 1
    ) {
      return false;
    }

    // Reject every non-native/translated IPv4 form. The controlled proxy must
    // connect to a native globally routable address; accepting transition
    // formats makes private IPv4 ranges reachable through NAT64/6to4 gateways.
    if (
      a === 0 && b === 0 && c === 0 && d === 0 && e === 0 &&
      (f === 0 || f === 0xffff)
    ) {
      return false;
    }

    // A conservative allow rule is safer than trying to enumerate every
    // special-purpose IPv6 prefix. Native global unicast is 2000::/3.
    if ((a & 0xe000) !== 0x2000) return false;

    // IANA special-purpose ranges that sit inside 2000::/3.
    if (a === 0x2001 && b <= 0x01ff) return false; // protocol assignments
    if (a === 0x2001 && b === 0x0db8) return false; // documentation
    if (a === 0x2002) return false; // deprecated 6to4 embeds IPv4
    if (a === 0x3fff && (b & 0xf000) === 0) return false; // documentation
    return true;
  }

  return false;
}

export function validateWebhookEgressProxyConfig(
  config: WebhookEgressProxyConfig | undefined,
): WebhookEgressProxyConfig {
  if (
    !config || config.token.trim().length < 32 ||
    config.contractVersion !== WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION
  ) {
    throw new Error("egress_proxy_unconfigured");
  }

  const proxyUrl = parseSafeWebhookUrl(config.url);
  if (proxyUrl.search) throw new Error("egress_proxy_query_forbidden");
  return {
    url: proxyUrl.toString(),
    token: config.token.trim(),
    contractVersion: config.contractVersion,
  };
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

export function parseSafeWebhookUrl(rawUrl: string): URL {
  if (rawUrl.length < 1 || rawUrl.length > 2048) {
    throw new Error("invalid_url_length");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("invalid_url");
  }

  if (parsed.protocol !== "https:") throw new Error("https_required");
  if (parsed.username || parsed.password) {
    throw new Error("credentials_forbidden");
  }
  if (parsed.hash) throw new Error("fragment_forbidden");

  const hostname = normalizeHostname(parsed.hostname);
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("private_host_forbidden");
  }

  const literalIpv4 = parseIpv4(hostname);
  if (
    (literalIpv4 || hostname.includes(":")) && !isPublicNetworkAddress(hostname)
  ) {
    throw new Error("private_address_forbidden");
  }

  return parsed;
}

async function defaultDnsResolver(
  hostname: string,
  recordType: DnsRecordType,
): Promise<string[]> {
  return await Deno.resolveDns(hostname, recordType);
}

function timeoutAbortError(): DOMException {
  return new DOMException("webhook delivery deadline exceeded", "AbortError");
}

async function withAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  if (!signal) return await promise;
  if (signal.aborted) throw timeoutAbortError();

  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(timeoutAbortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export async function assertPublicWebhookDestination(
  url: URL,
  resolver: DnsResolver = defaultDnsResolver,
  signal?: AbortSignal,
): Promise<string[]> {
  const hostname = normalizeHostname(url.hostname);
  if (parseIpv4(hostname) || hostname.includes(":")) {
    if (!isPublicNetworkAddress(hostname)) {
      throw new Error("private_address_forbidden");
    }
    return [canonicalNetworkAddress(hostname)!];
  }

  const resolutions = await Promise.allSettled([
    withAbort(
      Promise.resolve().then(() => resolver(hostname, "A")),
      signal,
    ),
    withAbort(
      Promise.resolve().then(() => resolver(hostname, "AAAA")),
      signal,
    ),
  ]);
  if (signal?.aborted) throw timeoutAbortError();
  const addresses = resolutions.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  if (addresses.length === 0) throw new Error("dns_resolution_failed");
  if (addresses.some((address) => !isPublicNetworkAddress(address))) {
    throw new Error("private_address_forbidden");
  }
  return [...new Set(addresses.map(canonicalNetworkAddress))].filter(
    (address): address is string => address !== null,
  );
}

function deliveryPayload(claim: WebhookClaim): Record<string, unknown> {
  return {
    event_id: claim.event_id,
    event_type: claim.event_type,
    occurred_at: claim.event_created_at,
    data: claim.event_payload,
    delivery: {
      id: claim.delivery_id,
      attempt: claim.delivery_attempt,
    },
  };
}

export function assertWebhookEgressEnvelopeSize(envelope: string): void {
  if (
    new TextEncoder().encode(envelope).byteLength >
      MAX_WEBHOOK_EGRESS_ENVELOPE_BYTES
  ) {
    throw new Error("webhook_payload_too_large");
  }
}

export async function deliverWebhook(
  claim: WebhookClaim,
  options: {
    fetcher?: WebhookFetch;
    resolver?: DnsResolver;
    timeoutMs?: number;
    egressProxy?: WebhookEgressProxyConfig;
  } = {},
): Promise<WebhookDeliveryResult> {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    return {
      success: false,
      httpStatus: null,
      errorCode: "invalid_timeout",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const deadline = Date.now() + timeoutMs;
  let deliveryStarted = false;

  try {
    const proxyConfig = validateWebhookEgressProxyConfig(options.egressProxy);
    const proxyUrl = new URL(proxyConfig.url);
    const url = parseSafeWebhookUrl(claim.endpoint_url);

    // One total deadline covers both DNS lookups and the proxy request. The
    // proxy is configured by the operator; the customer target is still
    // resolved here and independently by the proxy contract.
    await assertPublicWebhookDestination(
      proxyUrl,
      options.resolver,
      controller.signal,
    );
    const approvedAddresses = await assertPublicWebhookDestination(
      url,
      options.resolver,
      controller.signal,
    );
    if (controller.signal.aborted) throw timeoutAbortError();

    const forwardedHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Bookings-Assistant-Webhook/1.0",
      "X-Webhook-Event-ID": claim.event_id,
      "X-Webhook-Delivery-ID": claim.delivery_id,
      "X-Delivery-Attempt": String(claim.delivery_attempt),
      "X-Event-Type": claim.event_type,
      "X-Calendar-ID": claim.calendar_id,
    };
    const envelope = JSON.stringify({
      contract_version: proxyConfig.contractVersion,
      target_url: url.toString(),
      target_host: normalizeHostname(url.hostname),
      approved_addresses: approvedAddresses,
      upstream_timeout_ms: Math.max(1, deadline - Date.now()),
      method: "POST",
      headers: forwardedHeaders,
      body: JSON.stringify(deliveryPayload(claim)),
    });
    assertWebhookEgressEnvelopeSize(envelope);

    deliveryStarted = true;
    const response = await fetcher(proxyUrl, {
      method: "POST",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${proxyConfig.token}`,
        "X-BA-Egress-Contract": proxyConfig.contractVersion,
        "User-Agent": "Bookings-Assistant-Webhook-Egress/1.0",
      },
      body: envelope,
    });

    const responseContract = response.headers.get("x-ba-egress-contract");
    const connectedAddress = canonicalNetworkAddress(
      response.headers.get("x-ba-connected-ip") ?? "",
    );
    const upstreamStatusValue = response.headers.get("x-ba-upstream-status");
    const upstreamStatus = upstreamStatusValue === null
      ? Number.NaN
      : Number(upstreamStatusValue);

    try {
      await response.body?.cancel();
    } catch {
      // The response body is deliberately not logged or retained.
    }

    // Never trust attacker-controlled-looking metadata on an outer proxy
    // error. This closes the 401 + spoofed upstream-200 false-success path.
    if (!response.ok) {
      return {
        success: false,
        httpStatus: null,
        errorCode: `egress_proxy_http_${response.status}`,
      };
    }

    if (responseContract !== WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION) {
      return {
        success: false,
        httpStatus: null,
        errorCode: "egress_proxy_contract_mismatch",
      };
    }

    if (
      connectedAddress === null ||
      !isPublicNetworkAddress(connectedAddress) ||
      !approvedAddresses.includes(connectedAddress)
    ) {
      return {
        success: false,
        httpStatus: null,
        errorCode: "egress_proxy_unpinned_response",
      };
    }

    if (
      !Number.isInteger(upstreamStatus) || upstreamStatus < 100 ||
      upstreamStatus > 599
    ) {
      return {
        success: false,
        httpStatus: null,
        errorCode: "egress_proxy_invalid_response",
      };
    }

    return upstreamStatus >= 200 && upstreamStatus < 300
      ? { success: true, httpStatus: upstreamStatus, errorCode: null }
      : {
        success: false,
        httpStatus: upstreamStatus,
        errorCode: `http_${upstreamStatus}`,
      };
  } catch (error) {
    const timedOut = controller.signal.aborted ||
      (error instanceof DOMException && error.name === "AbortError");
    return {
      success: false,
      httpStatus: null,
      errorCode: timedOut
        ? "timeout"
        : deliveryStarted
        ? "network_error"
        : error instanceof Error
        ? error.message
        : "invalid_destination",
    };
  } finally {
    clearTimeout(timeout);
  }
}
