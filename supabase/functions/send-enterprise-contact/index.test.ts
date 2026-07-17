import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { retiredEnterpriseContactResponse } from "./index.ts";

Deno.test("legacy enterprise contact endpoint is retired without delivery", async () => {
  const response = retiredEnterpriseContactResponse(
    new Request("https://example.invalid", {
      method: "POST",
      body: JSON.stringify({ email: "person@example.com" }),
    }),
  );
  assertEquals(response.status, 410);
  assertEquals(await response.json(), {
    success: false,
    error: "endpoint_retired",
    replacement: "submit-contact-form",
  });
});

Deno.test("legacy enterprise contact preflight remains explicit", () => {
  const response = retiredEnterpriseContactResponse(
    new Request("https://example.invalid", { method: "OPTIONS" }),
  );
  assertEquals(response.status, 204);
  assertEquals(
    response.headers.get("Access-Control-Allow-Methods"),
    "POST, OPTIONS",
  );
});
