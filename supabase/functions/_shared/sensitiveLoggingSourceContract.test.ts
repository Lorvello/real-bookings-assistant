import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const root = new URL("../../", import.meta.url);

const sources = [
  "functions/create-account-session/index.ts",
  "functions/send-password-reset/index.ts",
  "functions/customer-portal/index.ts",
  "functions/stripe-connect-onboard/index.ts",
  "functions/whatsapp-agent/index.ts",
] as const;

Deno.test("launch-critical server logs do not print bearer-like or direct-contact values", async () => {
  const violations: string[] = [];

  for (const relative of sources) {
    const text = await Deno.readTextFile(new URL(relative, root));
    const logCalls =
      text.match(/console\.(?:log|info|warn|error)\([^;]+\);/gs) ?? [];
    for (const call of logCalls) {
      if (
        /client_secret|actionLink|finalLink|portalSession\.(?:url|id)|user\.email|phoneForBg|stripeAccount\.id/
          .test(
            call,
          )
      ) {
        violations.push(
          `${relative}: ${call.replace(/\s+/g, " ").slice(0, 180)}`,
        );
      }
    }
  }

  assertEquals(violations, []);
});

Deno.test("password reset source never logs generated reset links", async () => {
  const text = await Deno.readTextFile(
    new URL("functions/send-password-reset/index.ts", root),
  );
  assert(
    !/console\.(?:log|info|warn|error)\([^;]*(?:action_link|actionLink|finalLink)/s
      .test(text),
  );
});
