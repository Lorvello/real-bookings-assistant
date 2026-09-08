// Offline tests run the actual dispatcher orchestration, replacing only external adapters.
// No SDK loading, environment secrets, network, or database access.
interface Row { detected_by: string; id: string; failure_class: string; details: Record<string, unknown>; notified_at: string | null; created_at: string }
const clone = <T>(x: T): T => structuredClone(x);
function assert(ok: unknown, message = "assertion failed"): asserts ok { if (!ok) throw new Error(message); }
function equal(a: unknown, b: unknown) { assert(JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} != ${JSON.stringify(b)}`); }
function row(heartbeat = false): Row {
  return { detected_by: "mechanism_test", id: "synthetic-alert", failure_class: heartbeat ? "monitor_heartbeat_missing" : "synthetic_failure", details: { reason: heartbeat ? "config_disabled" : "test", nested: { retained: true } }, notified_at: null, created_at: "2026-09-08T12:00:00Z" };
}
function harness(rows: Row[], enabled = true) {
  const state = { rows, enabled, sends: [] as unknown[], updates: [] as Record<string, unknown>[], provider: { data: { id: "provider-message-1" }, error: null } as { data: unknown; error: unknown }, sendThrows: false, updateError: false, zeroRows: false, mutateDuringSend: false };
  const supabase = { from(table: string) {
    let patch: Record<string, unknown> | undefined;
    const filters: Array<(r: Row) => boolean> = [];
    const execute = () => {
      if (table === "monitoring_alert_config") return { data: { enabled: state.enabled, alert_email: "fixture@example.invalid" }, error: null };
      const matches = state.rows.filter(r => filters.every(f => f(r)));
      if (!patch) return { data: clone(matches), error: null };
      state.updates.push(clone(patch));
      if (state.updateError) return { data: null, error: { message: "synthetic write failure" } };
      if (state.zeroRows) return { data: null, error: null };
      for (const r of matches) Object.assign(r, clone(patch));
      return { data: matches[0] ? { id: matches[0].id } : null, error: null };
    };
    const q = {
      select(_columns: string) { return q; }, order(_col: string, _opts: unknown) { return q; }, limit(_n: number) { return q; },
      is(col: string, value: unknown) { filters.push(r => (r as unknown as Record<string, unknown>)[col] === value); return q; },
      eq(col: string, value: unknown) { filters.push(r => col === "details" ? JSON.stringify(r.details) === value : col === "details->>reason" ? r.details?.reason === value : (r as unknown as Record<string, unknown>)[col] === value); return q; },
      update(p: Record<string, unknown>) { patch = p; return q; },
      maybeSingle() { return Promise.resolve(execute()); },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) { return Promise.resolve(execute()).then(resolve, reject); },
    }; return q;
  } };
  const resend = { emails: { send(payload: unknown) {
    state.sends.push(clone(payload));
    if (state.sendThrows) throw new Error("synthetic provider timeout");
    if (state.mutateDuringSend) state.rows[0].details.new_field = "concurrent writer";
    return Promise.resolve(clone(state.provider));
  } } };
  return { state, supabase, resend };
}
async function load(source: string, h: ReturnType<typeof harness>) {
  // Imports and initialized clients are the only replacements; business logic stays intact.
  const key = `__alert_test_${crypto.randomUUID().replaceAll("-", "")}`;
  (globalThis as unknown as Record<string, unknown>)[key] = h;
  const injected = source.replace(/^import .*;\n/gm, "")
    .replace(/^const resend = .*;$/m, `const resend = globalThis["${key}"].resend;`)
    .replace(/^const SERVICE_KEY = .*;$/m, "")
    .replace(/^const supabase = .*;$/m, `const supabase = globalThis["${key}"].supabase;`)
    .replace("serve(handler);", "export { dispatchPendingAlerts };");
  try { return await import(`data:application/typescript;base64,${btoa(injected)}`); }
  finally { delete (globalThis as unknown as Record<string, unknown>)[key]; }
}
const current = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
for (const heartbeat of [false, true]) {
  const route = heartbeat ? "disabled heartbeat" : "normal";
  Deno.test(`${route}: accepted receipt preserved atomically and replay skips`, async () => {
    const h = harness([row(heartbeat)], !heartbeat); const original = clone(h.state.rows[0].details); const mod = await load(current, h);
    equal((await mod.dispatchPendingAlerts()).sent, 1);
    const saved = h.state.rows[0]; const receipt = saved.details.email_provider_receipt as Record<string, unknown>;
    equal(receipt.message_id, "provider-message-1"); equal(receipt.provider, "resend"); equal(receipt.status, "accepted");
    equal(receipt.accepted_at, saved.notified_at); equal(receipt.recipient, "fixture@example.invalid");
    equal(saved.details.reason, original.reason); equal(saved.details.nested, original.nested); assert(!("delivered_at" in receipt));
    equal(h.state.updates.length, 1); equal((await mod.dispatchPendingAlerts()).sent, 0); equal(h.state.sends.length, 1);
  });
  for (const [name, mutate] of [
    ["missing ID", (h: ReturnType<typeof harness>) => h.state.provider.data = {}],
    ["blank ID", (h: ReturnType<typeof harness>) => h.state.provider.data = { id: "  " }],
    ["nonstring ID", (h: ReturnType<typeof harness>) => h.state.provider.data = { id: 12 }],
    ["provider error", (h: ReturnType<typeof harness>) => h.state.provider.error = { message: "rejected" }],
    ["provider throw", (h: ReturnType<typeof harness>) => h.state.sendThrows = true],
  ] as const) {
    Deno.test(`${route}: ${name} fails closed without write`, async () => {
      const h = harness([row(heartbeat)], !heartbeat); mutate(h); const mod = await load(current, h); const result = await mod.dispatchPendingAlerts();
      equal(result.sent, 0); equal(result.failed, 1); equal(h.state.updates.length, 0); equal(h.state.sends.length, 1); equal(h.state.rows[0].notified_at, null);
    });
  }
  for (const mode of ["updateError", "zeroRows", "mutateDuringSend"] as const) {
    Deno.test(`${route}: ${mode} is not successful persistence`, async () => {
      const h = harness([row(heartbeat)], !heartbeat); h.state[mode] = true; const mod = await load(current, h); const result = await mod.dispatchPendingAlerts();
      equal(result.sent, 0); equal(result.failed, 1); equal(h.state.sends.length, 1); equal(h.state.updates.length, 1); equal(h.state.rows[0].notified_at, null);
      assert(!h.state.rows[0].details.email_provider_receipt);
      if (mode === "mutateDuringSend") equal(h.state.rows[0].details.new_field, "concurrent writer");
    });
  }
  Deno.test(`${route}: reserved existing receipt is not overwritten or resent`, async () => {
    const h = harness([row(heartbeat)], !heartbeat); h.state.rows[0].details.email_provider_receipt = { message_id: "old" };
    const mod = await load(current, h); equal((await mod.dispatchPendingAlerts()).failed, 1); equal(h.state.sends.length, 0);
    equal(h.state.rows[0].details.email_provider_receipt, { message_id: "old" });
  });
}
Deno.test("enabled monitoring sends heartbeat once and normal once", async () => {
  const normal = row(); normal.id = "normal";
  const h = harness([row(true), normal]); const mod = await load(current, h);
  equal((await mod.dispatchPendingAlerts()).sent, 2); equal(h.state.sends.length, 2);
});
Deno.test("accepted then failed write can retry: no exactly-once or delivered claim", async () => {
  const h = harness([row()]); h.state.updateError = true; const mod = await load(current, h);
  equal((await mod.dispatchPendingAlerts()).sent, 0);
  h.state.updateError = false; h.state.provider.data = { id: "provider-message-2" };
  equal((await mod.dispatchPendingAlerts()).sent, 1); equal(h.state.sends.length, 2);
  equal((h.state.rows[0].details.email_provider_receipt as Record<string, unknown>).message_id, "provider-message-2");
});
