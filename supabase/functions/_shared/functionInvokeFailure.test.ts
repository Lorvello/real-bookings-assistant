import { assertEquals } from "jsr:@std/assert@1.0.19";
import { readFunctionInvokeFailure } from "./functionInvokeFailure.ts";

Deno.test("reads cancel_safe from a non-2xx Functions invoke response", async () => {
  const response = new Response(
    JSON.stringify({
      code: "BOOKING_NOT_FOUND",
      booking_disposition: "cancel_safe",
      retryable: false,
    }),
    {
      status: 409,
      headers: { "content-type": "application/json" },
    },
  );
  assertEquals(
    await readFunctionInvokeFailure(null, { context: response }),
    {
      code: "BOOKING_NOT_FOUND",
      booking_disposition: "cancel_safe",
      retryable: false,
    },
  );
});

Deno.test("defaults malformed and non-JSON failures to unknown", async () => {
  assertEquals(
    await readFunctionInvokeFailure(null, {
      context: new Response("bad gateway", { status: 502 }),
    }),
    null,
  );
  assertEquals(
    await readFunctionInvokeFailure(null, new Error("timeout")),
    null,
  );
});

Deno.test("accepts a typed data decision without an HTTP error", async () => {
  assertEquals(
    await readFunctionInvokeFailure({
      code: "BOOKING_PROVIDER_CLEANUP_PENDING",
      booking_disposition: "preserve",
      retryable: true,
    }, null),
    {
      code: "BOOKING_PROVIDER_CLEANUP_PENDING",
      booking_disposition: "preserve",
      retryable: true,
    },
  );
});
