# Webhook egress proxy contract

`process-webhooks` does not connect to customer-controlled URLs directly. A
separately deployed, authenticated egress service must implement the exact
contract `ba-webhook-egress-v1`. Until that service is provisioned, the Edge
function returns HTTP 503 **before claiming deliveries**.

## Server-only Edge secrets

Configure these only as Supabase Edge Function secrets. They do not belong in
the Vite `.env` file or any client bundle.

- `WEBHOOK_EGRESS_PROXY_URL`: fixed HTTPS endpoint, with no query string.
- `WEBHOOK_EGRESS_PROXY_TOKEN`: random, rotatable bearer secret of at least 32
  characters.
- `WEBHOOK_EGRESS_PROXY_CONTRACT_VERSION`: exact value
  `ba-webhook-egress-v1`.
- `WEBHOOK_EGRESS_ENABLED`: keep unset or `false` until every proxy canary has
  passed; set to the exact value `true` only as the final activation step.

## Required proxy behaviour

The reviewed proxy implementation must:

1. Accept only authenticated POST requests carrying the exact contract in
   both `X-BA-Egress-Contract` and `contract_version`.
2. Parse the target as HTTPS only; reject credentials, fragments, local names,
   oversized URLs, and malformed IP literals.
3. Independently resolve all A and AAAA records within the supplied remaining
   timeout. Reject the destination if any answer is non-global, translated,
   mapped, private, loopback, link-local, multicast, documentation, reserved,
   NAT64, 6to4, or otherwise special-purpose.
4. Select an address that is also present in `approved_addresses`, connect to
   that exact pinned address, preserve the original hostname for SNI and the
   HTTP Host header, and perform normal certificate-chain and hostname
   verification. A second unpinned DNS lookup at connect time is forbidden.
5. Use manual redirect handling and reject every 3xx response. It must never
   follow an upstream redirect.
6. Enforce the smaller of its own hard limit and `upstream_timeout_ms` across
   DNS, connect, TLS, upload, and response headers. Reject request envelopes
   above 256 KiB, apply a strict response-header limit, and discard the
   upstream body.
7. Return a 2xx proxy response only after the attempt is complete, with all of:
   `X-BA-Egress-Contract: ba-webhook-egress-v1`,
   `X-BA-Connected-IP: <canonical pinned address>`, and
   `X-BA-Upstream-Status: <100..599>`. Never copy these values from the target.
8. Never log or retain the bearer token, complete target URL or query string,
   forwarded headers, customer payload, or upstream response body. Runtime,
   reverse-proxy, tracing, error-reporting and platform access logs must redact
   these fields before ingestion. Operational logs may contain only bounded
   opaque delivery/event IDs, the canonical connected IP, bounded status/error
   codes and timing. Backups and dead-letter records follow the same rule.

The Edge caller rejects outer non-2xx responses before inspecting any of these
headers, and rejects a connected address not present in its own DNS preflight.

## Human production gate

Before enabling customer webhook delivery:

1. Disable every webhook scheduler/cron trigger and verify no claim invocation
   is in flight. Keep `WEBHOOK_EGRESS_ENABLED` unset.
2. Security-review, deploy and health-check the concrete proxy source and
   configuration against every rule above, before changing the Edge function.
3. Run isolated proxy canaries for: a normal public HTTPS target; `127.0.0.1` and
   RFC1918; IPv4-mapped/translated IPv6; NAT64; 6to4; DNS rebinding; a redirect
   to a private address; a hanging resolver; an invalid certificate; an
   oversized body; and an outer 401 carrying spoofed success headers.
4. Verify every hostile canary is rejected without reaching its private target,
   the positive canary reports the actual pinned public address, and searches
   across proxy/platform/tracing logs find none of the unique canary token,
   query secret, forwarded secret header or customer-payload marker.
5. Deploy the Edge function while activation remains disabled. Set URL, token
   and contract-version secrets; verify it still returns 503 before claiming.
6. Set `WEBHOOK_EGRESS_ENABLED=true`, manually verify an empty queue returns
   `no_claimable_deliveries`, then run one isolated TEST delivery and prove it
   reaches only the canary endpoint exactly once.
7. Re-enable the scheduler only after the manual verification passes. Rotate
   the bearer token after any suspected disclosure and at the normal
   secret-rotation interval.

Rollback in reverse order: disable the scheduler first, unset
`WEBHOOK_EGRESS_ENABLED`, verify 503 occurs before the claim RPC, then roll back
the Edge function or proxy and remove the remaining secrets. This preserves
pending delivery state and retry budgets. Do not point the URL at an unreviewed
generic forward proxy as a temporary workaround.
