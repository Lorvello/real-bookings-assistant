// R84: tool-level tests for the time-only correction in book_appointment (S08), built from the
// independent reviewer's probes of 2026-10-23. In-memory fake Supabase client; no network, no database.
// Run: deno test bookingTimeCorrection.tools.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { createTools, type ToolContext } from "./tools.ts";

type Rows = Array<{ slot_start: string; slot_end: string; is_available: boolean }>;

// Tuesday 2026-11-10 and Friday 2026-11-13, CET (UTC+1). Slots 09:00..16:30 every 30 min.
function daySlots(date: string, taken: string[] = []): Rows {
  const out: Rows = [];
  for (let h = 9; h < 17; h++) {
    for (const m of [0, 30]) {
      const local = `${String(h).padStart(2, "0")}:${m === 0 ? "00" : "30"}`;
      const startUtc = new Date(`${date}T${local}:00+01:00`).toISOString().replace(".000Z", "+00:00");
      const endUtc = new Date(new Date(`${date}T${local}:00+01:00`).getTime() + 30 * 60000).toISOString().replace(".000Z", "+00:00");
      out.push({ slot_start: startUtc, slot_end: endUtc, is_available: !taken.includes(local) });
    }
  }
  return out;
}

function harness(opts: {
  context: Record<string, unknown>;
  slots: Record<string, Rows | "error">;
}) {
  let context = structuredClone(opts.context);
  const writes: Array<{ table: string; op: string; payload: unknown }> = [];
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const read = (table: string, one: boolean) => {
    const single = (row: unknown) => ({ data: row, error: null });
    switch (table) {
      case "whatsapp_conversations":
        return one ? single({ context }) : { data: [{ context }], error: null };
      case "calendar_settings":
        return single({ allow_cancellations: true, cancellation_deadline_hours: 24, max_bookings_per_day: null, booking_window_days: 60, minimum_notice_hours: 0 });
      case "service_types":
        return single({ id: "S1", name: "Knippen", duration: 30, price: 30, supply_type: "in_person", tax_enabled: false, tax_code: null, installments_enabled: false, custom_installment_plan: null, calendar_id: "A" });
      case "payment_settings":
        return single({ secure_payments_enabled: false, payment_required_for_booking: false, allowed_payment_timing: ["pay_on_site"] });
      case "users":
        return single({ installments_enabled: false });
      case "calendars":
        return single({ slug: "iris" });
      default:
        return one ? { data: null, error: null } : { data: [], error: null, count: 0 };
    }
  };
  const client = {
    from(table: string) {
      let op = "select";
      let payload: unknown = undefined;
      let one = false;
      // deno-lint-ignore no-explicit-any
      const q: any = {};
      for (const m of ["select", "eq", "neq", "in", "gt", "gte", "lt", "lte", "order", "limit", "or", "is", "not", "filter", "match", "ilike", "like", "contains", "range"]) {
        q[m] = () => q;
      }
      for (const m of ["update", "insert", "upsert", "delete"]) {
        q[m] = (p: unknown) => {
          op = m;
          payload = p;
          return q;
        };
      }
      q.maybeSingle = () => ((one = true), q);
      q.single = () => ((one = true), q);
      q.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
        if (op !== "select") {
          writes.push({ table, op, payload });
          if (table === "whatsapp_conversations" && op === "update") {
            context = structuredClone((payload as { context: Record<string, unknown> }).context);
          }
          return Promise.resolve({ data: op === "insert" ? [{ id: "new-row" }] : null, error: null }).then(res, rej);
        }
        return Promise.resolve(read(table, one)).then(res, rej);
      };
      return q;
    },
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      if (fn === "get_available_slots") {
        const rows = opts.slots[String(args.p_date)];
        if (rows === "error") return Promise.resolve({ data: null, error: { message: "boom" } });
        return Promise.resolve({ data: rows ?? [], error: null });
      }
      if (fn === "validate_booking_security") return Promise.resolve({ data: { valid: true, errors: [] }, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    functions: { invoke: () => { throw new Error("INVOKE TRAP"); } },
  };
  return { client: client as unknown as Parameters<typeof createTools>[0], writes, rpcCalls, ctx: () => context };
}

const TUE = "2026-11-10";
const FRI = "2026-11-13";
const pending = (atMsAgo: number) => ({
  pending_booking: {
    service_type_id: "S1",
    start_time: "2026-11-10T13:00:00+00:00", // Tuesday 14:00 Amsterdam
    end_time: "2026-11-10T13:30:00+00:00",
    customer_name: "Karim",
    calendar_id: "A",
    at: Date.now() - atMsAgo,
    originator_name: "Karim",
  },
});
const baseCtx = (msg: string): ToolContext => ({
  calendarId: "A",
  calendars: [{ id: "A", name: "Iris" }],
  phone: "31600000999",
  businessUserId: "owner",
  conversationId: "conv",
  userMessage: msg,
  knownSelfName: "Karim",
  ambiguousConfirm: true,
} as ToolContext);

const S08 = "yeah fine. can we do 3 instead tho?";
const pendingStart = (h: ReturnType<typeof harness>) =>
  (h.ctx().pending_booking as { start_time?: string } | undefined)?.start_time ?? null;


const run = (h: ReturnType<typeof harness>, msg: string, args: Record<string, unknown>) =>
  createTools(h.client, baseCtx(msg)).execute("book_appointment", args) as Promise<Record<string, unknown>>;
const OLD_ISO = { service_type_id: "S1", start_time: "2026-11-10T13:00:00+00:00", customer_name: "Karim" };

Deno.test("R84 S08: old ISO re-sent, 15:00 free -> new preview at 15:00", async () => {
  const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE) } });
  const out = await run(h, S08, OLD_ISO);
  assertEquals(out.error, undefined);
  assertEquals(pendingStart(h), "2026-11-10T14:00:00+00:00");
});

Deno.test("R84 S08: 15:00 taken -> own error code, pending withdrawn, free times offered", async () => {
  const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE, ["15:00"]) } });
  const out = await run(h, S08, OLD_ISO);
  assertEquals(out.error, "tijd_correctie_niet_vrij");
  assertEquals(pendingStart(h), null);
  assert(/ingetrokken/.test(String(out.message)) && /14:30/.test(String(out.message)), String(out.message));
});

Deno.test("R84 S08: availability read fails -> own error code, pending withdrawn", async () => {
  const h = harness({ context: pending(60_000), slots: { [TUE]: "error" } });
  const out = await run(h, S08, OLD_ISO);
  assertEquals(out.error, "tijd_correctie_onleesbaar");
  assertEquals(pendingStart(h), null);
});

Deno.test("R84 S08: both readings free -> ask which, pending withdrawn", async () => {
  const both = daySlots(TUE);
  both.unshift({ slot_start: "2026-11-10T02:00:00+00:00", slot_end: "2026-11-10T02:30:00+00:00", is_available: true });
  const h = harness({ context: pending(60_000), slots: { [TUE]: both } });
  const out = await run(h, S08, OLD_ISO);
  assertEquals(out.error, "tijd_correctie_kies");
  assertEquals(pendingStart(h), null);
});

Deno.test("R84 review B4: the model's own date wins over the pending preview's date", async () => {
  const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE), [FRI]: daySlots(FRI) } });
  await run(h, S08, { service_type_id: "S1", date: FRI, time: "14:00", customer_name: "Karim" });
  assert(pendingStart(h)?.startsWith(FRI), "expected a Friday preview, got " + pendingStart(h));
  assertEquals(pendingStart(h), "2026-11-13T14:00:00+00:00");
});

Deno.test("R84 review B5: a stale pending preview (2 h) never binds the date", async () => {
  const h = harness({ context: pending(2 * 3600_000), slots: { [TUE]: daySlots(TUE), [FRI]: daySlots(FRI) } });
  await run(h, S08, { service_type_id: "S1", start_time: "2026-11-13T13:00:00+00:00", customer_name: "Karim" });
  assertEquals(pendingStart(h), "2026-11-13T14:00:00+00:00");
});

Deno.test("R84 S08: after a withdrawal a bare yes cannot commit", async () => {
  const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE, ["15:00"]) } });
  await run(h, S08, OLD_ISO);
  await createTools(h.client, { ...baseCtx("yes"), confirmBook: true, hardConfirm: true, ambiguousConfirm: false } as ToolContext)
    .execute("book_appointment", { confirmed: true, only_confirming_previous: true });
  assert(!h.writes.some((w) => w.table === "bookings" && w.op === "insert"), "bare yes committed after withdrawal");
});
