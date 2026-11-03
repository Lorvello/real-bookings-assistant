import { assertEquals } from "jsr:@std/assert@1.0.19";
import { classifyOwnerEscalationClaim } from "./ownerEscalationClassifier.ts";
import { classifyBusinessDataGrounding } from "./businessDataGuard.ts";

// No network permission is needed: both real classifiers share this abort-aware fake transport.
async function runBoth(delayMs: number, reply: unknown, status = 200, override?: string, finishReason: unknown = "stop") {
  const originalFetch = globalThis.fetch;
  const previousOverride = Deno.env.get("CLASSIFIER_TIMEOUT_MS");
  if (override === undefined) Deno.env.delete("CLASSIFIER_TIMEOUT_MS");
  else Deno.env.set("CLASSIFIER_TIMEOUT_MS", override);
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve(new Response(JSON.stringify({ choices: [{ message: { content: reply }, finish_reason: finishReason }] }), { status }));
      }, delayMs);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("aborted", "AbortError"));
      }, { once: true });
    })) as typeof fetch;
  try {
    const [owner, grounding] = await Promise.all([
      classifyOwnerEscalationClaim("Proefantwoord", "synthetic-test-key"),
      classifyBusinessDataGrounding("Proefantwoord", "Proefgegevens", "synthetic-test-key"),
    ]);
    return [
      { unsafe: owner.isEscalationClaim, reason: owner.reason },
      { unsafe: grounding.isUngroundedClaim, reason: grounding.reason },
    ];
  } finally {
    globalThis.fetch = originalFetch;
    if (previousOverride === undefined) Deno.env.delete("CLASSIFIER_TIMEOUT_MS");
    else Deno.env.set("CLASSIFIER_TIMEOUT_MS", previousOverride);
  }
}

Deno.test("classifier answer: only an unambiguous NO counts as safe", async () => {
  for (const text of ["NO", "no.", " NO! "]) {
    assertEquals(await runBoth(1, text), [
      { unsafe: false, reason: "no" }, { unsafe: false, reason: "no" },
    ], `clear ${JSON.stringify(text)}`);
  }
  for (const text of ["NOT SURE", "NO YES", "NO, but YES", "", "NO\u200b"]) {
    assertEquals(await runBoth(1, text), [
      { unsafe: true, reason: "empty_or_unparseable" },
      { unsafe: true, reason: "empty_or_unparseable" },
    ], `ambiguous ${JSON.stringify(text)}`);
  }
  for (const value of [["NO"], null, { answer: "NO" }, 0]) {
    assertEquals(await runBoth(1, value), [
      { unsafe: true, reason: "empty_or_unparseable" },
      { unsafe: true, reason: "empty_or_unparseable" },
    ], `invalid content type ${JSON.stringify(value)}`);
  }
  for (const finish of ["length", "content_filter", "tool_calls", null, Symbol("missing")]) {
    assertEquals(await runBoth(1, "NO", 200, undefined, finish), [
      { unsafe: true, reason: "empty_or_unparseable" },
      { unsafe: true, reason: "empty_or_unparseable" },
    ], `unfinished response ${String(finish)}`);
  }
  assertEquals(await runBoth(1, "NO", 200, undefined, "stop"), [
    { unsafe: false, reason: "no" }, { unsafe: false, reason: "no" },
  ]);
  for (const text of ["YES", "YES, unsafe"]) {
    assertEquals(await runBoth(1, text), [
      { unsafe: true, reason: "yes" }, { unsafe: true, reason: "yes" },
    ], `unsafe ${JSON.stringify(text)}`);
  }
});

Deno.test("classifier answer: diagnostics identify finish status without logging reply text", async () => {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (...items: unknown[]) => { warnings.push(items.map(String).join(" ")); };
  try {
    await runBoth(1, "NO PRIVATE_FIXTURE_TEXT", 200, undefined, "length");
    assertEquals(warnings.length, 2);
    for (const warning of warnings) {
      assertEquals(warning.includes("type=string") && warning.includes("finish=length"), true);
      assertEquals(warning.includes("PRIVATE_FIXTURE_TEXT"), false);
    }
  } finally {
    console.warn = originalWarn;
  }
});

Deno.test("D02 R2: a 1.7-second NO reaches both classifiers", async () => {
  assertEquals(await runBoth(1700, "NO"), [
    { unsafe: false, reason: "no" }, { unsafe: false, reason: "no" },
  ]);
});

Deno.test("D02 R2: a 1.7-second YES remains unsafe for both classifiers", async () => {
  assertEquals(await runBoth(1700, "YES"), [
    { unsafe: true, reason: "yes" }, { unsafe: true, reason: "yes" },
  ]);
});

Deno.test("D02 R2: a 2.7-second NO times out and stays fail-closed", async () => {
  assertEquals(await runBoth(2700, "NO"), [
    { unsafe: true, reason: "timeout" }, { unsafe: true, reason: "timeout" },
  ]);
});

Deno.test("D02 R2: failed or unparseable answers stay fail-closed", async () => {
  assertEquals(await runBoth(1, "NO", 500), [
    { unsafe: true, reason: "error" }, { unsafe: true, reason: "error" },
  ]);
  assertEquals(await runBoth(1, "UNKNOWN"), [
    { unsafe: true, reason: "empty_or_unparseable" },
    { unsafe: true, reason: "empty_or_unparseable" },
  ]);
});

Deno.test("D02 R2: an explicit shorter environment timeout still takes precedence", async () => {
  assertEquals(await runBoth(250, "NO", 200, "100"), [
    { unsafe: true, reason: "timeout" }, { unsafe: true, reason: "timeout" },
  ]);
});

Deno.test("D02 R2: headers do not stop timeout while the response body is still pending", async () => {
  const originalFetch = globalThis.fetch;
  const previousOverride = Deno.env.get("CLASSIFIER_TIMEOUT_MS");
  Deno.env.delete("CLASSIFIER_TIMEOUT_MS");
  globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    const fakeResponse = {
      ok: true,
      json: () => new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ choices: [{ message: { content: "NO" } }] }), 2700);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("body aborted", "AbortError"));
        }, { once: true });
      }),
    };
    return Promise.resolve(fakeResponse as Response);
  }) as typeof fetch;
  try {
    const [owner, grounding] = await Promise.all([
      classifyOwnerEscalationClaim("Proefantwoord", "synthetic-test-key"),
      classifyBusinessDataGrounding("Proefantwoord", "Proefgegevens", "synthetic-test-key"),
    ]);
    assertEquals([owner.isEscalationClaim, owner.reason, grounding.isUngroundedClaim, grounding.reason],
      [true, "timeout", true, "timeout"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousOverride === undefined) Deno.env.delete("CLASSIFIER_TIMEOUT_MS");
    else Deno.env.set("CLASSIFIER_TIMEOUT_MS", previousOverride);
  }
});

Deno.test("D02 R2: an uncooperative body cannot hold the classifier beyond the deadline", async () => {
  const originalFetch = globalThis.fetch;
  const previousOverride = Deno.env.get("CLASSIFIER_TIMEOUT_MS");
  Deno.env.set("CLASSIFIER_TIMEOUT_MS", "100");
  globalThis.fetch = (() => Promise.resolve({
    ok: true,
    json: () => new Promise((resolve) => setTimeout(
      () => resolve({ choices: [{ message: { content: "NO" } }] }), 250,
    )),
  } as Response)) as typeof fetch;
  try {
    const [owner, grounding] = await Promise.all([
      classifyOwnerEscalationClaim("Proefantwoord", "synthetic-test-key"),
      classifyBusinessDataGrounding("Proefantwoord", "Proefgegevens", "synthetic-test-key"),
    ]);
    assertEquals([owner.isEscalationClaim, owner.reason, grounding.isUngroundedClaim, grounding.reason],
      [true, "timeout", true, "timeout"]);
    // Let the deliberately uncooperative fake finish so Deno's timer sanitizer stays meaningful.
    await new Promise((resolve) => setTimeout(resolve, 200));
  } finally {
    globalThis.fetch = originalFetch;
    if (previousOverride === undefined) Deno.env.delete("CLASSIFIER_TIMEOUT_MS");
    else Deno.env.set("CLASSIFIER_TIMEOUT_MS", previousOverride);
  }
});

Deno.test("D02 R2: a blocked event loop cannot convert an overdue response into a safe NO", async () => {
  const originalFetch = globalThis.fetch;
  const previousOverride = Deno.env.get("CLASSIFIER_TIMEOUT_MS");
  Deno.env.set("CLASSIFIER_TIMEOUT_MS", "100");
  globalThis.fetch = (() => Promise.resolve({
    ok: true,
    json: () => {
      const until = performance.now() + 130;
      while (performance.now() < until) { /* model a temporarily blocked event loop */ }
      return Promise.resolve({ choices: [{ message: { content: "NO" } }] });
    },
  } as Response)) as typeof fetch;
  try {
    const owner = await classifyOwnerEscalationClaim("Proefantwoord", "synthetic-test-key");
    const grounding = await classifyBusinessDataGrounding("Proefantwoord", "Proefgegevens", "synthetic-test-key");
    assertEquals([owner.isEscalationClaim, owner.reason, grounding.isUngroundedClaim, grounding.reason],
      [true, "timeout", true, "timeout"]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousOverride === undefined) Deno.env.delete("CLASSIFIER_TIMEOUT_MS");
    else Deno.env.set("CLASSIFIER_TIMEOUT_MS", previousOverride);
  }
});
