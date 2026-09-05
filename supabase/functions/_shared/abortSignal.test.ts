import { assertEquals } from "jsr:@std/assert@1.0.19";
import { composeAbortSignal } from "./abortSignal.ts";

Deno.test("provider signal aborts immediately with its parent", () => {
  const parent = new AbortController();
  const composed = composeAbortSignal(parent.signal, 10_000);
  parent.abort();
  assertEquals(composed.signal.aborted, true);
  composed.dispose();
});

Deno.test("provider signal enforces its own shorter timeout", async () => {
  const composed = composeAbortSignal(undefined, 10);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assertEquals(composed.signal.aborted, true);
  composed.dispose();
});
