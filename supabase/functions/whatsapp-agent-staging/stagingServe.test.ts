// Offline callback tests: no HTTP listener, secrets, network permission or external imports.
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

Deno.test("stagingServe actual callback preserves build stamp and safety behavior", async (t) => {
  const originalGet = Deno.env.get;
  const originalServe = Object.getOwnPropertyDescriptor(Deno, "serve")!;
  const originalFetch = globalThis.fetch;
  const env: Record<string, string> = { INTERNAL_FUNCTION_SECRET: "local-test-only" };
  Deno.env.get = (key: string) => env[key];
  let callback: (req: Request) => Promise<Response>;
  Object.defineProperty(Deno, "serve", { configurable: true,
    value: (handler: typeof callback) => { callback = handler; } });
  try {
    const { stagingServe } = await import("./stagingServe.ts");
    const flag = await import("./stagingFlag.ts");
    const { hmacHex } = await import("./overrideAuth.ts");
    async function signed(payload: Record<string, unknown>) {
      const encoded = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60, ...payload }));
      return `${encoded}.${await hmacHex(env.INTERNAL_FUNCTION_SECRET, encoded)}`;
    }
    function request(header?: string) {
      return new Request("https://local.invalid/", { method: "POST",
        headers: header ? { "x-agent-override": header } : {} });
    }
    await t.step("normal JSON carries explicit ID, marker and no-send counters", async () => {
      stagingServe(async () => Response.json({ reply: "Hoi" }));
      const response = await callback!(request());
      const body = await response.json();
      equal(body.staging.staging_build_id, flag.STAGING_BUILD_ID);
      equal(Object.hasOwn(body.staging, "staging_build_id"), true);
      equal(body.staging.staging_build, true);
      equal(body.staging.record_only, true);
      equal(body.staging.meta_send_allowed_total, 0);
      equal(body.staging.meta_send_attempts_this_request, 0);
      equal(body.staging.run_marker, flag.RUN_MARKER);
    });
    await t.step("whoami reports same source identity", async () => {
      stagingServe(async () => { throw new Error("whoami must not call handler"); });
      const body = await (await callback!(request(await signed({ op: "whoami" })))).json();
      equal(Object.hasOwn(body, "staging_build_id"), true);
      equal(body.staging_build_id, flag.STAGING_BUILD_ID);
    });
    await t.step("invalid signed override remains refused without handler", async () => {
      let called = false;
      stagingServe(async () => { called = true; return Response.json({}); });
      const response = await callback!(request("bad.signature"));
      equal(response.status, 401);
      equal(called, false);
      const body = await response.json();
      equal(body.staging.staging_build_id, flag.STAGING_BUILD_ID);
      equal(Object.hasOwn(body.staging, "staging_build_id"), true);
    });
    await t.step("signed override still reaches handler and restores environment", async () => {
      stagingServe(async () => Response.json({ provider: Deno.env.get("LLM_PROVIDER") }));
      const body = await (await callback!(request(await signed({ provider: "groq", model: "local-model" })))).json();
      equal(body.provider, "groq");
      equal(body.staging.staging_build_id, flag.STAGING_BUILD_ID);
      equal(Deno.env.get("LLM_PROVIDER"), undefined);
    });
    await t.step("shell failure retains identity", async () => {
      stagingServe(async () => { throw new Error("local intentional failure"); });
      const response = await callback!(request());
      equal(response.status, 500);
      const body = await response.json();
      equal(Object.hasOwn(body.staging, "staging_build_id"), true);
      equal(body.staging.staging_build_id, flag.STAGING_BUILD_ID);
    });
  } finally {
    Deno.env.get = originalGet;
    Object.defineProperty(Deno, "serve", originalServe);
    globalThis.fetch = originalFetch;
  }
});
