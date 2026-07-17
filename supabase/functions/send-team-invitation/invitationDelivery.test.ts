import {
  assertEquals,
  assertFalse,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildTeamInvitationEmail,
  deliverTeamInvitation,
  parseTeamInvitationRequest,
  resolveTeamInvitationDeliveryConfig,
  type TeamInvitationClaim,
} from "./invitationDelivery.ts";

const claim: TeamInvitationClaim = {
  claimed: true,
  status: "sending",
  claim_token: "00000000-0000-4000-8000-000000000001",
  request_id: "00000000-0000-4000-8000-000000000002",
  invitation_id: "00000000-0000-4000-8000-000000000003",
  recipient_email: "invitee@example.com",
  invitee_name: '<img src=x onerror="alert(1)">',
  role: "editor",
  invitation_token: "safe_token_12345678901234567890",
  business_name: "Studio\r\nBcc: attacker@example.com<script>",
  calendar_name: "Agenda <iframe>",
  locale: "en",
  app_base_url: "https://bookingsassistant.example",
  attempt_count: 1,
};

Deno.test("team invitation request parsing is strict and normalizes email", () => {
  assertEquals(
    parseTeamInvitationRequest({
      request_id: claim.request_id,
      calendar_id: "00000000-0000-4000-8000-000000000004",
      email: "  INVITEE@Example.com ",
      full_name: "  Alex  ",
      role: "viewer",
    }),
    {
      request_id: claim.request_id,
      calendar_id: "00000000-0000-4000-8000-000000000004",
      email: "invitee@example.com",
      full_name: "Alex",
      role: "viewer",
    },
  );
  assertRejects(
    async () =>
      parseTeamInvitationRequest({
        request_id: claim.request_id,
        calendar_id: "00000000-0000-4000-8000-000000000004",
        email: "invitee@example.com",
        full_name: "Alex",
        role: "viewer",
        admin: true,
      }),
  );
});

Deno.test("record-only invitation delivery is local/test only", () => {
  assertEquals(
    resolveTeamInvitationDeliveryConfig({
      APP_ENV: "test",
      APP_URL: "http://127.0.0.1:3000",
      TEAM_INVITATION_DELIVERY_MODE: "record-only",
    }),
    {
      mode: "record-only",
      appEnv: "test",
      appBaseUrl: "http://127.0.0.1:3000",
    },
  );
  assertRejects(
    async () =>
      resolveTeamInvitationDeliveryConfig({
        APP_ENV: "production",
        APP_URL: "https://bookingsassistant.com",
        TEAM_INVITATION_DELIVERY_MODE: "record-only",
      }),
  );
});

Deno.test("invitation template escapes HTML and header injection", () => {
  const email = buildTeamInvitationEmail(claim);
  assertFalse(email.html.includes("<script>"));
  assertFalse(email.html.includes("<iframe>"));
  assertFalse(email.html.includes("<img src=x"));
  assertFalse(email.subject.includes("\n"));
  assertFalse(email.fromName.includes("<"));
  assertStringIncludes(email.html, "Agenda &lt;iframe&gt;");
  assertStringIncludes(email.text, encodeURIComponent(claim.invitation_token));
});

Deno.test("provider delivery uses stable idempotency and a bounded payload", async () => {
  const email = buildTeamInvitationEmail({
    ...claim,
    invitee_name: "Alex",
    business_name: "Studio",
    calendar_name: "Calendar",
  });
  let observedKey = "";
  let observedBody: Record<string, unknown> = {};
  const result = await deliverTeamInvitation(
    {
      mode: "send",
      appBaseUrl: claim.app_base_url,
      apiKey: "test-key",
      fromEmail: "noreply@example.com",
    },
    email,
    async (_url, init) => {
      observedKey = String(
        new Headers(init?.headers).get("Idempotency-Key") ?? "",
      );
      observedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ id: "provider-message-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );

  assertEquals(observedKey, `team-invitation/${claim.request_id}`);
  assertEquals(observedBody.to, [claim.recipient_email]);
  assertFalse(JSON.stringify(observedBody).includes("test-key"));
  assertEquals(result, {
    mode: "send",
    providerMessageId: "provider-message-1",
  });
});

Deno.test("provider timeout fails with a bounded error code", async () => {
  const email = buildTeamInvitationEmail(claim);
  await assertRejects(
    () =>
      deliverTeamInvitation(
        {
          mode: "send",
          appBaseUrl: claim.app_base_url,
          apiKey: "test-key",
          fromEmail: "noreply@example.com",
        },
        email,
        async (_url, init) => {
          await new Promise<void>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")));
          });
          return new Response(null, { status: 200 });
        },
        5,
      ),
    Error,
    "provider_timeout",
  );
});
