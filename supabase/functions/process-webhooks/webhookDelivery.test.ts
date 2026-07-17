import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertPublicWebhookDestination,
  assertWebhookEgressEnvelopeSize,
  deliverWebhook,
  isPublicNetworkAddress,
  MAX_WEBHOOK_EGRESS_ENVELOPE_BYTES,
  parseProcessWebhookRequest,
  parseSafeWebhookUrl,
  validateWebhookEgressProxyConfig,
  WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION,
  type WebhookClaim,
} from "./webhookDelivery.ts";

const claim: WebhookClaim = {
  delivery_id: "00000000-0000-4000-8000-000000000001",
  delivery_claim_token: "00000000-0000-4000-8000-000000000002",
  event_id: "00000000-0000-4000-8000-000000000003",
  endpoint_id: "00000000-0000-4000-8000-000000000004",
  endpoint_url: "https://hooks.example.com/booking",
  event_type: "booking.created",
  event_payload: { booking_id: "booking-1" },
  calendar_id: "00000000-0000-4000-8000-000000000005",
  event_created_at: "2026-07-17T00:00:00.000Z",
  delivery_attempt: 1,
};

const egressProxy = {
  url: "https://egress.example.net/v1/webhooks",
  token: "x".repeat(32),
  contractVersion: WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION,
};

const successfulProxyHeaders = {
  "x-ba-egress-contract": WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION,
  "x-ba-connected-ip": "8.8.8.8",
  "x-ba-upstream-status": "200",
};

Deno.test("process request parser is strict and bounded", () => {
  assertEquals(
    parseProcessWebhookRequest({
      source: "manual.retry",
      calendar_id: "00000000-0000-4000-8000-000000000005",
      retry_failed: true,
      batch_size: 10,
    }),
    {
      source: "manual.retry",
      calendarId: "00000000-0000-4000-8000-000000000005",
      eventId: undefined,
      retryFailed: true,
      batchSize: 10,
    },
  );
});

Deno.test("process request parser rejects unknown or unscoped retry input", () => {
  assertRejects(
    async () => parseProcessWebhookRequest({ force: true }),
    Error,
    "unknown_field",
  );
  assertRejects(
    async () => parseProcessWebhookRequest({ retry_failed: true }),
    Error,
    "retry_scope_required",
  );
});

Deno.test("network classifier blocks local and reserved addresses", () => {
  for (
    const address of [
      "127.0.0.1",
      "10.1.2.3",
      "169.254.169.254",
      "172.16.0.1",
      "192.168.1.1",
      "::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "::7f00:1",
      "::ffff:0:7f00:1",
      "64:ff9b::7f00:1",
      "64:ff9b:1::7f00:1",
      "2002:7f00:1::",
      "fec0::1",
      "fd00::1",
      "2001:db8::1",
    ]
  ) {
    assertEquals(isPublicNetworkAddress(address), false, address);
  }
  assertEquals(isPublicNetworkAddress("8.8.8.8"), true);
  assertEquals(isPublicNetworkAddress("2606:4700:4700::1111"), true);
});

Deno.test("egress proxy configuration requires the exact audited contract", () => {
  assertEquals(validateWebhookEgressProxyConfig(egressProxy), egressProxy);
  assertRejects(
    async () =>
      validateWebhookEgressProxyConfig({
        ...egressProxy,
        contractVersion: "unreviewed-proxy-v2",
      }),
    Error,
    "egress_proxy_unconfigured",
  );
});

Deno.test("URL parser requires HTTPS and rejects embedded credentials", () => {
  assertRejects(
    async () => parseSafeWebhookUrl("http://hooks.example.com"),
    Error,
    "https_required",
  );
  assertRejects(
    async () => parseSafeWebhookUrl("https://user:pass@hooks.example.com"),
    Error,
    "credentials_forbidden",
  );
  assertRejects(
    async () => parseSafeWebhookUrl("https://127.0.0.1/hook"),
    Error,
    "private_address_forbidden",
  );
  assertRejects(
    async () => parseSafeWebhookUrl("https://[::ffff:7f00:1]/hook"),
    Error,
    "private_address_forbidden",
  );
});

Deno.test("DNS preflight rejects a hostname resolving to a private address", async () => {
  await assertRejects(
    () =>
      assertPublicWebhookDestination(
        new URL("https://hooks.example.com/path"),
        async (_hostname, type) => type === "A" ? ["10.0.0.8"] : [],
      ),
    Error,
    "private_address_forbidden",
  );
});

Deno.test("delivery fails closed before fetch when the controlled egress proxy is absent", async () => {
  let fetchCalls = 0;
  let resolverCalls = 0;
  const result = await deliverWebhook(claim, {
    resolver: async (_hostname, type) => {
      resolverCalls += 1;
      return type === "A" ? ["8.8.8.8"] : [];
    },
    fetcher: async () => {
      fetchCalls += 1;
      return new Response(null, { status: 200 });
    },
  });
  assertEquals(result, {
    success: false,
    httpStatus: null,
    errorCode: "egress_proxy_unconfigured",
  });
  assertEquals(fetchCalls, 0);
  assertEquals(resolverCalls, 0);
});

Deno.test("delivery sends a stable bounded payload only through controlled egress", async () => {
  let observedProxyUrl = "";
  let observedProxyAuthorization = "";
  let observedEnvelope: Record<string, unknown> = {};
  let observedRedirect = "";
  let observedContract = "";
  const result = await deliverWebhook(claim, {
    egressProxy,
    resolver: async (_hostname, type) => type === "A" ? ["8.8.8.8"] : [],
    fetcher: async (input, init) => {
      observedProxyUrl = String(input);
      observedProxyAuthorization =
        new Headers(init?.headers).get("authorization") ?? "";
      observedEnvelope = JSON.parse(String(init?.body ?? "{}"));
      observedRedirect = String(init?.redirect ?? "");
      observedContract = new Headers(init?.headers).get(
        "x-ba-egress-contract",
      ) ?? "";
      return new Response("provider body must be ignored", {
        status: 200,
        headers: successfulProxyHeaders,
      });
    },
  });

  assertEquals(result, {
    success: true,
    httpStatus: 200,
    errorCode: null,
  });
  assertEquals(observedProxyUrl, egressProxy.url);
  assertEquals(observedProxyUrl === claim.endpoint_url, false);
  assertEquals(observedProxyAuthorization, `Bearer ${egressProxy.token}`);
  assertEquals(observedContract, WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION);
  assertEquals(observedRedirect, "manual");
  assertEquals(
    observedEnvelope.contract_version,
    WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION,
  );
  assertEquals(observedEnvelope.target_url, claim.endpoint_url);
  assertEquals(observedEnvelope.target_host, "hooks.example.com");
  assertEquals(observedEnvelope.approved_addresses, ["8.8.8.8"]);
  assertEquals(
    typeof observedEnvelope.upstream_timeout_ms === "number" &&
      observedEnvelope.upstream_timeout_ms > 0,
    true,
  );
  assertEquals(observedEnvelope.method, "POST");
  const forwardedBody = JSON.parse(String(observedEnvelope.body));
  assertEquals(
    String(observedEnvelope.body).includes(claim.endpoint_url),
    false,
  );
  assertEquals(forwardedBody, {
    event_id: claim.event_id,
    event_type: claim.event_type,
    occurred_at: claim.event_created_at,
    data: claim.event_payload,
    delivery: { id: claim.delivery_id, attempt: 1 },
  });
});

Deno.test("redirects are failures and are never followed", async () => {
  const result = await deliverWebhook(claim, {
    egressProxy,
    resolver: async (_hostname, type) => type === "A" ? ["8.8.8.8"] : [],
    fetcher: async () =>
      new Response(null, {
        status: 200,
        headers: {
          ...successfulProxyHeaders,
          "x-ba-upstream-status": "302",
        },
      }),
  });
  assertEquals(result, {
    success: false,
    httpStatus: 302,
    errorCode: "http_302",
  });
});

Deno.test("an outer proxy failure cannot spoof a successful upstream status", async () => {
  const result = await deliverWebhook(claim, {
    egressProxy,
    resolver: async (_hostname, type) => type === "A" ? ["8.8.8.8"] : [],
    fetcher: async () =>
      new Response(null, {
        status: 401,
        headers: successfulProxyHeaders,
      }),
  });
  assertEquals(result, {
    success: false,
    httpStatus: null,
    errorCode: "egress_proxy_http_401",
  });
});

Deno.test("proxy response must attest the exact contract and pinned address", async () => {
  const wrongContract = await deliverWebhook(claim, {
    egressProxy,
    resolver: async (_hostname, type) => type === "A" ? ["8.8.8.8"] : [],
    fetcher: async () =>
      new Response(null, {
        status: 200,
        headers: {
          ...successfulProxyHeaders,
          "x-ba-egress-contract": "unknown-contract",
        },
      }),
  });
  assertEquals(wrongContract.errorCode, "egress_proxy_contract_mismatch");

  const wrongAddress = await deliverWebhook(claim, {
    egressProxy,
    resolver: async (_hostname, type) => type === "A" ? ["8.8.8.8"] : [],
    fetcher: async () =>
      new Response(null, {
        status: 200,
        headers: {
          ...successfulProxyHeaders,
          "x-ba-connected-ip": "1.1.1.1",
        },
      }),
  });
  assertEquals(wrongAddress.errorCode, "egress_proxy_unpinned_response");
});

Deno.test("delivery timeout returns only a bounded error code", async () => {
  const result = await deliverWebhook(claim, {
    egressProxy,
    resolver: async (_hostname, type) => type === "A" ? ["8.8.8.8"] : [],
    timeoutMs: 5,
    fetcher: async (_input, init) => {
      await new Promise<void>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("aborted", "AbortError"));
        });
      });
      return new Response(null, { status: 200 });
    },
  });
  assertEquals(result, {
    success: false,
    httpStatus: null,
    errorCode: "timeout",
  });
});

Deno.test("one total deadline includes DNS resolution", async () => {
  let fetchCalls = 0;
  const result = await deliverWebhook(claim, {
    egressProxy,
    timeoutMs: 5,
    resolver: async () => await new Promise<string[]>(() => {}),
    fetcher: async () => {
      fetchCalls += 1;
      return new Response(null, { status: 200 });
    },
  });
  assertEquals(result, {
    success: false,
    httpStatus: null,
    errorCode: "timeout",
  });
  assertEquals(fetchCalls, 0);
});

Deno.test("egress envelope byte limit is exact and blocks fetch", async () => {
  assertWebhookEgressEnvelopeSize(
    "a".repeat(MAX_WEBHOOK_EGRESS_ENVELOPE_BYTES),
  );
  await assertRejects(
    async () =>
      assertWebhookEgressEnvelopeSize(
        "a".repeat(MAX_WEBHOOK_EGRESS_ENVELOPE_BYTES + 1),
      ),
    Error,
    "webhook_payload_too_large",
  );

  let fetchCalls = 0;
  const result = await deliverWebhook({
    ...claim,
    event_payload: {
      oversized: "x".repeat(MAX_WEBHOOK_EGRESS_ENVELOPE_BYTES),
    },
  }, {
    egressProxy,
    resolver: async (_hostname, type) => type === "A" ? ["8.8.8.8"] : [],
    fetcher: async () => {
      fetchCalls += 1;
      return new Response(null, {
        status: 200,
        headers: successfulProxyHeaders,
      });
    },
  });
  assertEquals(result.errorCode, "webhook_payload_too_large");
  assertEquals(fetchCalls, 0);
});

Deno.test("Edge handler validates egress configuration before claiming", async () => {
  const source = await Deno.readTextFile(
    new URL("./index.ts", import.meta.url),
  );
  const activation = source.indexOf('Deno.env.get("WEBHOOK_EGRESS_ENABLED")');
  const validation = source.indexOf("validateWebhookEgressProxyConfig({");
  const claim = source.indexOf('"claim_webhook_deliveries"');
  assertEquals(
    activation >= 0 && validation > activation && claim > validation,
    true,
  );
  assertEquals(
    source.includes('Deno.env.get("WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION")'),
    true,
  );
  assertEquals(source.includes("webhook_egress_proxy_unavailable"), true);
  assertEquals(source.includes("webhook_egress_not_enabled"), true);
  assertEquals(source.includes("Promise.all(claims.map"), false);
});
