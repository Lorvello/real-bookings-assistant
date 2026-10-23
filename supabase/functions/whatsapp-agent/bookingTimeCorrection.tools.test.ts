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

// Round 1 (B4) asked that the model's own date win over a fresh preview's date; round 3 showed that
// this silently moves a time-only correction to another day. A time-only message says nothing about
// the day, so a disagreement is now asked, unless index.ts established the day deterministically.
Deno.test("R84 review 3 (replaces B4): a model date that differs from the fresh preview's day is asked", async () => {
  const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE), [FRI]: daySlots(FRI) } });
  const out = await run(h, S08, { service_type_id: "S1", date: FRI, time: "14:00", customer_name: "Karim" });
  assertEquals(out.error, "tijd_correctie_welke_dag");
  assert(String(out.message).includes("dinsdag 10 november") && String(out.message).includes("vrijdag 13 november"), String(out.message));
  assertEquals(pendingStart(h), null);
});

Deno.test("R84 review 3 C4/C5: the model's own day with the asked or the old time is asked too", async () => {
  const WED = "2026-11-11";
  for (const time of ["15:00", "14:00"]) {
    const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE), [WED]: daySlots(WED) } });
    const out = await run(h, S08, { service_type_id: "S1", date: WED, time, customer_name: "Karim" });
    assertEquals(out.error, "tijd_correctie_welke_dag", time);
    assertEquals(pendingStart(h), null, time);
  }
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

// R84 review round 2 (independent reviewer, 2026-10-23).
Deno.test("R84 review 2 N6: model date Wed + re-sent Tue time on a fresh Tue preview -> ask which day, withdraw", async () => {
  const WED = "2026-11-11";
  const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE), [WED]: daySlots(WED) } });
  const out = await run(h, S08, { service_type_id: "S1", date: WED, start_time: "2026-11-10T13:00:00+00:00", customer_name: "Karim" });
  assertEquals(out.error, "tijd_correctie_welke_dag");
  assert(String(out.message).includes("dinsdag 10 november") && String(out.message).includes("woensdag 11 november"), String(out.message));
  assertEquals(pendingStart(h), null);
  assertEquals(h.rpcCalls.filter((c) => c.fn === "get_available_slots").length, 0);
});

Deno.test("R84 review 2 N6: a day index.ts established deterministically (relativeDateHintISO) settles the conflict", async () => {
  // The correction grammar only accepts time-only messages, so the hint here comes from the
  // conversation (continuity or carried-forward day), never from a day word in this message.
  const WED = "2026-11-11";
  const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE), [WED]: daySlots(WED) } });
  const out = await createTools(h.client, { ...baseCtx(S08), relativeDateHintISO: WED } as ToolContext)
    .execute("book_appointment", { service_type_id: "S1", date: WED, start_time: "2026-11-10T13:00:00+00:00", customer_name: "Karim" }) as Record<string, unknown>;
  assert(out.error !== "tijd_correctie_welke_dag", String(out.error));
  assertEquals(pendingStart(h), "2026-11-11T14:00:00+00:00");
});

Deno.test("R84 review 2 N4: an open name check never swallows a time correction (tools-level lock)", async () => {
  const ctx0 = pending(60_000) as Record<string, unknown>;
  const pb = ctx0.pending_booking as Record<string, unknown>;
  ctx0.pending_book_verification = { start_time: pb.start_time, customer_name: pb.customer_name, at: Date.now() - 30_000 };
  const h = harness({ context: ctx0, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, {
    ...baseCtx("ok can we do 3 instead"),
    ambiguousConfirm: false,
    bookVerificationAffirmUnresolved: true,
  } as ToolContext).execute("book_appointment", OLD_ISO) as Record<string, unknown>;
  assert(out.error !== "naam_verificatie_nodig", "time correction swallowed by a name re-ask for the old slot");
  assertEquals(pendingStart(h), "2026-11-10T14:00:00+00:00");
});

Deno.test("R84 review 2 N4: the name check still re-asks on a plain yes", async () => {
  const ctx0 = pending(60_000) as Record<string, unknown>;
  const pb = ctx0.pending_booking as Record<string, unknown>;
  ctx0.pending_book_verification = { start_time: pb.start_time, customer_name: pb.customer_name, at: Date.now() - 30_000 };
  const h = harness({ context: ctx0, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, { ...baseCtx("ja"), ambiguousConfirm: false, bookVerificationAffirmUnresolved: true } as ToolContext)
    .execute("book_appointment", OLD_ISO) as Record<string, unknown>;
  assertEquals(out.error, "naam_verificatie_nodig");
});

Deno.test("R84 review 2 N7: a correction on a full day echoes date, service and calendar for the day guard", async () => {
  const allTaken = daySlots(TUE).map((r) => ({ ...r, is_available: false }));
  const h = harness({ context: pending(60_000), slots: { [TUE]: allTaken } });
  const out = await run(h, S08, OLD_ISO);
  assertEquals(out.error, "tijd_correctie_niet_vrij");
  assertEquals([out.date, out.service_type_id, out.calendar_id, out.available_slots], [TUE, "S1", "A", []]);
});

// R84 live probe on staging v35 (2026-10-24, multi-calendar tenant): the model re-sent another
// calendar's service id for the same service; the correction must keep the open preview's own target.
// Narrowed in review round 3: only a call WITHOUT a service takes the open preview's target. A call
// with a different service keeps its own route (next test).
Deno.test("R84 live v35: a time-only correction without a service keeps the open preview's service and calendar", async () => {
  const ctx0 = pending(60_000) as Record<string, unknown>;
  Object.assign(ctx0.pending_booking as Record<string, unknown>, { calendar_id: "B", service_type_id: "S2" });
  const h = harness({ context: ctx0, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, {
    ...baseCtx(S08),
    calendars: [{ id: "A", name: "Iris" }, { id: "B", name: "Sanne" }],
  } as ToolContext).execute("book_appointment", {
    start_time: "2026-11-10T13:00:00+00:00",
    customer_name: "Karim",
  }) as Record<string, unknown>;
  assert(out.error !== "vorige_boeking_nog_open", JSON.stringify(out));
  const pb = h.ctx().pending_booking as Record<string, unknown>;
  assertEquals([pb.start_time, pb.service_type_id, pb.calendar_id], ["2026-11-10T14:00:00+00:00", "S2", "B"]);
  assert(
    h.rpcCalls.some((c) => c.fn === "get_available_slots" && c.args.p_calendar_id === "B"),
    "slot read did not go to the preview's calendar: " + JSON.stringify(h.rpcCalls.map((c) => c.args)),
  );
});

// R84 review round 3 (C1/C2): the customer may have moved on to another service or stylist. A call
// with a DIFFERENT service is never forced onto the open preview; the open-preview guard asks.
const TWO_CAL = (msg: string): ToolContext => ({
  ...baseCtx(msg),
  calendars: [{ id: "A", name: "Iris" }, { id: "B", name: "Sanne (Knippen)" }],
  serviceCalendarMap: { S1: "A", S2: "B" },
} as ToolContext);

Deno.test("R84 review 3 C1/C2: a different service is never forced onto the open preview", async () => {
  for (const customer_name of ["Karim", "Bob"]) {
    const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE) } });
    const out = await createTools(h.client, TWO_CAL(S08)).execute("book_appointment", {
      service_type_id: "S2", date: TUE, time: "15:00", customer_name,
    }) as Record<string, unknown>;
    assertEquals(out.error, "vorige_boeking_nog_open", customer_name);
    const pb = h.ctx().pending_booking as Record<string, unknown>;
    assertEquals([pb.service_type_id, pb.calendar_id, pb.start_time, pb.customer_name], ["S1", "A", "2026-11-10T13:00:00+00:00", "Karim"]);
  }
});

Deno.test("R84 review 3: a time-only correction never changes who the booking is for", async () => {
  const h = harness({ context: pending(60_000), slots: { [TUE]: daySlots(TUE) } });
  await run(h, S08, { ...OLD_ISO, customer_name: "Bob" });
  const pb = h.ctx().pending_booking as Record<string, unknown>;
  assertEquals([pb.start_time, pb.customer_name], ["2026-11-10T14:00:00+00:00", "Karim"]);
});

// R84 live probe on staging v36 (2026-10-24): "knippen bij Sanne" was previewed with another
// stylist's "Knippen" (Sanne only offers "Knippen Dames"/"Knippen Heren").
const BIJ_SANNE = "kan ik dinsdag 10 november om 14:00 knippen bij Sanne? naam is Tom Bakker";

Deno.test("R84 live: a service of another stylist than the one asked for is refused, nothing is previewed", async () => {
  const h = harness({ context: {}, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, TWO_CAL(BIJ_SANNE)).execute("book_appointment", {
    service_type_id: "S1", date: TUE, time: "14:00", customer_name: "Tom Bakker",
  }) as Record<string, unknown>;
  assertEquals(out.error, "dienst_van_andere_medewerker");
  assert(String(out.message).includes("Sanne (Knippen)") && String(out.message).includes("Iris"), String(out.message));
  assertEquals(h.ctx().pending_booking, undefined);
  assertEquals(h.rpcCalls.filter((c) => c.fn === "get_available_slots").length, 0);
});

Deno.test("R84 live: the slot list of another stylist than the one asked for is refused too", async () => {
  const h = harness({ context: {}, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, TWO_CAL(BIJ_SANNE)).execute("get_available_slots", {
    service_type_id: "S1", date: TUE,
  }) as Record<string, unknown>;
  assertEquals(out.error, "dienst_van_andere_medewerker");
  assertEquals(h.rpcCalls.filter((c) => c.fn === "get_available_slots").length, 0);
});

Deno.test("R84 live: the stylist's own service, 'niet bij Sanne' and a name said in passing are not refused", async () => {
  for (const [msg, service] of [
    [BIJ_SANNE, "S2"],
    ["niet bij Sanne maar bij Iris, dinsdag 10 november om 14:00 knippen", "S1"],
    ["Sanne is ziek, kan ik dinsdag 10 november om 14:00 knippen?", "S1"],
  ] as const) {
    const h = harness({ context: {}, slots: { [TUE]: daySlots(TUE) } });
    const out = await createTools(h.client, TWO_CAL(msg)).execute("book_appointment", {
      service_type_id: service, date: TUE, time: "14:00", customer_name: "Tom Bakker",
    }) as Record<string, unknown>;
    assert(out.error !== "dienst_van_andere_medewerker", `${msg}: ${JSON.stringify(out)}`);
  }
});

// R84 review round 4: the staff check across turns, its precision, and the v35 shape.
const SVC = {
  A: [{ id: "S1", name: "Knippen" }],
  B: [{ id: "S2", name: "Manicure" }, { id: "S3", name: "Knippen" }, { id: "S4", name: "Knippen Dames" }],
};
const TWO_CAL_SVC = (msg: string, extra: Partial<ToolContext> = {}): ToolContext => ({
  ...TWO_CAL(msg),
  serviceCalendarMap: { S1: "A", S2: "B", S3: "B", S4: "B" },
  servicesByCalendar: SVC,
  ...extra,
} as ToolContext);

Deno.test("R84 review 4 G3: a staff member asked for in an earlier message still counts", async () => {
  const h = harness({ context: {}, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, TWO_CAL_SVC("dinsdag 10 november om 14:00", { requestedCalendarIds: ["B"] }))
    .execute("book_appointment", { service_type_id: "S1", date: TUE, time: "14:00", customer_name: "Tom Bakker" }) as Record<string, unknown>;
  assertEquals(out.error, "dienst_van_andere_medewerker");
  assertEquals(h.ctx().pending_booking, undefined);
});

Deno.test("R84 review 4: the check stays off when the asked person offers nothing like the chosen service", async () => {
  const h = harness({ context: {}, slots: { [TUE]: daySlots(TUE) } });
  const svc = { A: [{ id: "S1", name: "Balayage" }], B: SVC.B };
  const out = await createTools(h.client, TWO_CAL_SVC("ik was vorige keer bij Sanne, nu balayage dinsdag 10 november 14:00", { servicesByCalendar: svc }))
    .execute("book_appointment", { service_type_id: "S1", date: TUE, time: "14:00", customer_name: "Tom Bakker" }) as Record<string, unknown>;
  assert(out.error !== "dienst_van_andere_medewerker", JSON.stringify(out));
});

Deno.test("R84 review 4 G6: the same service under another stylist's id corrects the open preview (v35 shape)", async () => {
  const ctx0 = pending(60_000) as Record<string, unknown>;
  Object.assign(ctx0.pending_booking as Record<string, unknown>, { calendar_id: "B", service_type_id: "S3" });
  const h = harness({ context: ctx0, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, TWO_CAL_SVC(S08)).execute("book_appointment", {
    service_type_id: "S1", start_time: "2026-11-10T13:00:00+00:00", customer_name: "Karim",
  }) as Record<string, unknown>;
  assert(out.error !== "vorige_boeking_nog_open", JSON.stringify(out));
  const pb = h.ctx().pending_booking as Record<string, unknown>;
  assertEquals([pb.service_type_id, pb.calendar_id, pb.start_time], ["S3", "B", "2026-11-10T14:00:00+00:00"]);
});

Deno.test("R84 review 4: a different service still keeps its own route with names known (C1 stays safe)", async () => {
  const ctx0 = pending(60_000) as Record<string, unknown>;
  Object.assign(ctx0.pending_booking as Record<string, unknown>, { calendar_id: "B", service_type_id: "S3" });
  const h = harness({ context: ctx0, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, TWO_CAL_SVC(S08)).execute("book_appointment", {
    service_type_id: "S2", date: TUE, time: "15:00", customer_name: "Karim",
  }) as Record<string, unknown>;
  assertEquals(out.error, "vorige_boeking_nog_open");
});

// R84 review round 5.
Deno.test("R84 review 5: after 'kan het ook bij Iris?' a same-named service is a deliberate switch, not a correction", async () => {
  const ctx0 = pending(60_000) as Record<string, unknown>;
  Object.assign(ctx0.pending_booking as Record<string, unknown>, { calendar_id: "B", service_type_id: "S3" });
  const h = harness({ context: ctx0, slots: { [TUE]: daySlots(TUE) } });
  const out = await createTools(h.client, TWO_CAL_SVC(S08, { requestedCalendarIds: ["A"] })).execute("book_appointment", {
    service_type_id: "S1", date: TUE, time: "15:00", customer_name: "Karim",
  }) as Record<string, unknown>;
  assertEquals(out.error, "vorige_boeking_nog_open");
  const pb = h.ctx().pending_booking as Record<string, unknown>;
  assertEquals([pb.service_type_id, pb.calendar_id, pb.start_time], ["S3", "B", "2026-11-10T13:00:00+00:00"]);
});

Deno.test("R84 review 5: unit words never make two services alike ('15 min' and '60 min')", async () => {
  const h = harness({ context: {}, slots: { [TUE]: daySlots(TUE) } });
  const svc = { A: [{ id: "S1", name: "Baardtrim 15 min" }], B: [{ id: "S2", name: "Massage 60 min" }] };
  const out = await createTools(h.client, TWO_CAL_SVC("kan ik een baardtrim bij Sanne dinsdag 10 november om 14:00?", { servicesByCalendar: svc }))
    .execute("book_appointment", { service_type_id: "S1", date: TUE, time: "14:00", customer_name: "Tom Bakker" }) as Record<string, unknown>;
  assert(out.error !== "dienst_van_andere_medewerker", JSON.stringify(out));
});
