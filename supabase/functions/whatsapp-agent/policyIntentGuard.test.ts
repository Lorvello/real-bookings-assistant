import { createTools, type ToolContext } from "./tools.ts";
import { isCancellationPolicyQuestion } from "./policyIntentGuard.ts";

function assert(value: unknown, message = "assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
const inbound = "hoe lang van te voren moet ik afzeggen anders betaal ik toch?";
const context: ToolContext = {
  calendarId: "A",
  calendars: [{ id: "A", name: "Iris" }, { id: "B", name: "Bram" }],
  phone: "31600000303",
  businessUserId: "owner",
  conversationId: "conversation",
  userMessage: inbound,
};
const booking = {
  id: "booking-B",
  calendar_id: "B",
  customer_phone: context.phone,
  start_time: "2099-09-10T08:00:00Z",
  end_time: "2099-09-10T08:45:00Z",
  customer_name: "Klant S03",
  status: "confirmed",
  service_types: { name: "Nagels" },
};
function fixture(
  options: {
    bookings?: typeof booking[];
    policy?: unknown;
    policyError?: boolean;
    bookingError?: boolean;
  } = {},
) {
  const reads: Array<
    { table: string; filters: Array<[string, string, unknown]> }
  > = [];
  const writes: string[] = [];
  const client = {
    from(table: string) {
      const filters: Array<[string, string, unknown]> = [];
      reads.push({ table, filters });
      const query: Record<string, unknown> = {};
      for (
        const method of [
          "select",
          "eq",
          "in",
          "gt",
          "order",
          "limit",
          "maybeSingle",
          "single",
        ]
      ) {
        query[method] = (...args: unknown[]) => {
          filters.push([method, String(args[0]), args[1]]);
          return query;
        };
      }
      for (const method of ["update", "insert", "upsert", "delete"]) {
        query[method] = () => {
          writes.push(`${table}.${method}`);
          throw new Error("WRITE TRAP");
        };
      }
      query.then = (resolve: (v: unknown) => unknown) => {
        let data: unknown;
        let error: unknown = null;
        if (table === "bookings") {
          let rows = options.bookings ?? [booking];
          for (const [op, key, value] of filters) {
            if (op === "eq") {
              rows = rows.filter((r) =>
                (r as Record<string, unknown>)[key] === value
              );
            }
            if (op === "in") {
              rows = rows.filter((r) =>
                (value as unknown[]).includes(
                  (r as Record<string, unknown>)[key],
                )
              );
            }
          }
          data = rows;
          error = options.bookingError ? { message: "unavailable" } : null;
        } else if (table === "calendar_settings") {
          data = Object.hasOwn(options, "policy") ? options.policy : {
            allow_cancellations: true,
            cancellation_deadline_hours: filters.some((f) => f[2] === "B")
              ? "48.00"
              : "24.00",
          };
          error = options.policyError ? { message: "unavailable" } : null;
        } else if (table === "whatsapp_conversations") data = { context: {} };
        else throw new Error(`Unexpected read: ${table}`);
        return Promise.resolve(resolve({ data, error }));
      };
      return query;
    },
    rpc() {
      writes.push("rpc");
      throw new Error("RPC TRAP");
    },
    functions: {
      invoke() {
        writes.push("invoke");
        throw new Error("INVOKE TRAP");
      },
    },
  };
  return {
    client: client as unknown as Parameters<typeof createTools>[0],
    reads,
    writes,
  };
}

Deno.test("R21-S03 declarations offer only read-only policy lookup", () => {
  const tools = createTools(fixture().client, context);
  assert(
    tools.decls.length === 1 && tools.decls[0].name === "get_my_appointments",
  );
});

for (
  const name of [
    "get_my_appointments",
    "get_business_data",
    "cancel_appointment",
    "reschedule_appointment",
    "book_appointment",
    "update_booking_name",
    "update_lead",
  ]
) {
  Deno.test(`R21-S03 actual executor ${name} returns B policy without writes`, async () => {
    const f = fixture();
    const out = await createTools(f.client, {
      ...context,
      hardConfirm: true,
      confirmCancel: true,
    }).execute(name, {
      confirmed: true,
      only_confirming_previous: true,
    }) as Record<string, unknown>;
    assert(f.writes.length === 0, JSON.stringify(f.writes));
    assert(
      out.policy_only === true && out.cancellation_deadline_hours === 48,
      JSON.stringify(out),
    );
    assert(String(out.message).includes("48 uur"));
    assert(
      !JSON.stringify(out).includes("Klant S03"),
      "Policy lookup must not disclose identity",
    );
    assert(
      f.reads.some((r) =>
        r.table === "bookings" &&
        r.filters.some((x) =>
          x[0] === "eq" && x[1] === "customer_phone" && x[2] === context.phone
        )
      ),
    );
    assert(
      f.reads.filter((r) => r.table === "calendar_settings").every((r) =>
        r.filters.some((x) => x[1] === "calendar_id" && x[2] === "B")
      ),
    );
  });
}

for (
  const [label, options] of Object.entries({
    no_bookings: { bookings: [] },
    multiple: {
      bookings: [booking, { ...booking, id: "other", calendar_id: "A" }],
    },
    foreign_tenant: { bookings: [{ ...booking, calendar_id: "foreign" }] },
    different_phone: { bookings: [{ ...booking, customer_phone: "other" }] },
    missing: { policy: null },
    null_deadline: {
      policy: { allow_cancellations: true, cancellation_deadline_hours: null },
    },
    empty_deadline: {
      policy: { allow_cancellations: true, cancellation_deadline_hours: "" },
    },
    boolean_deadline: {
      policy: { allow_cancellations: true, cancellation_deadline_hours: false },
    },
    invalid: {
      policy: {
        allow_cancellations: true,
        cancellation_deadline_hours: "oops",
      },
    },
    failed_policy_read: { policyError: true },
    failed_booking_read: { bookingError: true },
  })
) {
  Deno.test(`R21 safe clarification ${label}`, async () => {
    const f = fixture(options);
    const out = await createTools(f.client, context).execute(
      "cancel_appointment",
      { confirmed: true },
    ) as Record<string, unknown>;
    assert(f.writes.length === 0);
    assert(
      out.policy_only === true &&
        !Object.hasOwn(out, "cancellation_deadline_hours"),
      JSON.stringify(out),
    );
    assert(!/24|48|kosteloos|Klant S03/.test(String(out.message)));
    if (label === "multiple" || label === "no_bookings") {
      assert(String(out.message).includes("?"));
    }
  });
}

Deno.test("R21 disabled cancellation is not described as free", async () => {
  const f = fixture({
    policy: { allow_cancellations: false, cancellation_deadline_hours: 48 },
  });
  const out = await createTools(f.client, context).execute(
    "get_my_appointments",
    {},
  ) as Record<string, unknown>;
  assert(
    out.allow_cancellations === false &&
      !String(out.message).includes("kosteloos"),
  );
});

for (
  const message of [
    inbound,
    "Wanneer moet ik afzeggen?",
    "Kun je uitleggen hoeveel annuleren kost?",
    "Wat kost het als ik wil annuleren?",
    "Tot wanneer kan ik kosteloos afzeggen?",
    "Wat is jullie annuleringsbeleid?",
    "How much notice do I need to cancel?",
    "Can I cancel for free?",
    "What is the cancellation fee?",
    "Ik wil niet annuleren. Wat is jullie annuleringsbeleid?",
  ]
) {
  Deno.test(`R21 recognizes policy: ${message}`, () =>
    assert(isCancellationPolicyQuestion(message)));
}
for (
  const message of [
    "Annuleer mijn afspraak",
    "Graag mijn afspraak annuleren. Wat kost dat?",
    "Ik moet helaas mijn afspraak afzeggen. Wat kost dat?",
    "Kun je mijn afspraak annuleren?",
    "Ik wil mijn afspraak afzeggen, wat kost dat?",
    "Wat is het annuleringsbeleid? Annuleer hem maar.",
    "Please cancel my appointment. What is the fee?",
    "Can you cancel my appointment?",
    "Hoe lang kan ik afzeggen? En boek mij morgen in.",
    "ja",
    "nee",
    "Ik ben Eva",
    "Wat heb ik geboekt?",
  ]
) {
  Deno.test(`R21 preserves action/nonpolicy: ${message}`, () => {
    assert(!isCancellationPolicyQuestion(message));
    assert(
      createTools(fixture().client, { ...context, userMessage: message }).decls
        .some((d) => d.name === "cancel_appointment"),
    );
  });
}

Deno.test("R21 explicit cancellation still reaches existing identity gate", async () => {
  const f = fixture();
  let trapped = false;
  try {
    await createTools(f.client, {
      ...context,
      userMessage: "Annuleer mijn afspraak",
    }).execute("cancel_appointment", {});
  } catch (error) {
    trapped = error instanceof Error && error.message === "WRITE TRAP";
  }
  assert(
    trapped && f.writes.includes("whatsapp_conversations.update"),
    "Existing identity marker workflow must remain reachable",
  );
  assert(!f.writes.includes("bookings.update"));
});

Deno.test("R21 English policy and zero deadline use known settings", async () => {
  const f = fixture({
    policy: { allow_cancellations: true, cancellation_deadline_hours: 0 },
  });
  const out = await createTools(f.client, {
    ...context,
    userMessage: "Can I cancel for free?",
    customerLocale: "en",
  }).execute("get_my_appointments", {}) as Record<string, unknown>;
  assert(
    out.cancellation_deadline_hours === 0 &&
      String(out.message).includes("before its start time"),
  );
});

for (
  const message of [
    "Kun je me uitleggen wat annuleren kost?",
    "Kun je mij vertellen hoeveel annuleren kost?",
    "Zou je mij misschien kunnen uitleggen wanneer ik kosteloos kan annuleren?",
    "Kun je me het annuleringsbeleid uitleggen?",
    "Ik zou graag willen weten wat annuleren kost.",
    "Could you please tell me how much it costs if I cancel?",
    "Can you explain the cancellation policy to me?",
    "I would like to know how much cancelling costs.",
    "Kun je me uitleggen hoeveel verzetten en annuleren kost?",
    "Can you explain what happens if I cancel and then rebook?",
    "Can you explain what happens if I cancel and book another appointment?",
  ]
) {
  Deno.test(`R21-FIX1 informational governing verb: ${message}`, async () => {
    const f = fixture();
    const t = createTools(f.client, { ...context, userMessage: message });
    assert(t.decls.length === 1 && t.decls[0].name === "get_my_appointments");
    const out = await t.execute("cancel_appointment", {
      confirmed: true,
    }) as Record<string, unknown>;
    assert(f.writes.length === 0 && out.policy_only === true);
    assert(out.cancellation_deadline_hours === 48);
  });
}

for (
  const [message, tool] of [
    [
      "Wat kost annuleren? Kun je mijn afspraak verzetten naar vrijdag?",
      "reschedule_appointment",
    ],
    [
      "Ik zou graag mijn afspraak annuleren. Wat zijn de kosten?",
      "cancel_appointment",
    ],
    [
      "Zou je mijn afspraak willen afzeggen? Wat kost dat?",
      "cancel_appointment",
    ],
    [
      "Ik zou mijn afspraak graag willen verzetten. Wat kost annuleren?",
      "reschedule_appointment",
    ],
    [
      "What is the cancellation fee? Could you reschedule my appointment to Friday?",
      "reschedule_appointment",
    ],
    [
      "I would like to cancel my appointment. What are the costs?",
      "cancel_appointment",
    ],
    [
      "Kun je uitleggen wat annuleren kost en annuleer mijn afspraak daarna.",
      "cancel_appointment",
    ],
    [
      "Can you tell me the cancellation policy and cancel my appointment?",
      "cancel_appointment",
    ],
    [
      "Can you cancel my appointment and explain the cancellation fee?",
      "cancel_appointment",
    ],
  ]
) {
  Deno.test(`R21-FIX1 explicit action precedence: ${message}`, async () => {
    const f = fixture();
    const t = createTools(f.client, { ...context, userMessage: message });
    assert(!isCancellationPolicyQuestion(message));
    assert(t.decls.some((d) => d.name === tool));
    if (tool === "cancel_appointment") {
      let trapped = false;
      try {
        await t.execute(tool, {});
      } catch (e) {
        trapped = e instanceof Error && e.message === "WRITE TRAP";
      }
      assert(
        trapped && f.writes.includes("whatsapp_conversations.update"),
        "Existing cancellation identity preview remains reachable",
      );
      assert(!f.writes.includes("bookings.update"));
    }
  });
}

// FIX2: keep the governing explanation's dependent scope across coordination.
for (const message of [
  "Kun je uitleggen hoe ik mijn afspraak moet annuleren en mijn afspraak opnieuw moet boeken?",
  "Kun je uitleggen hoe ik mijn afspraak moet annuleren, en mijn afspraak opnieuw moet boeken?",
  "Kun je uitleggen hoe ik mijn afspraak kan annuleren en mijn afspraak verzetten naar vrijdag?",
  "Kun je uitleggen of ik mijn afspraak moet annuleren en mijn afspraak opnieuw moet boeken?",
  "Kun je uitleggen wat er gebeurt als ik annuleer en mijn afspraak verzet naar vrijdag?",
  "Can you explain how to cancel and book my appointment again?",
  "Can you explain how I should cancel, and reschedule my appointment to Friday?",
  "Could you explain whether I should cancel and reschedule my appointment to Friday?",
  "Can you explain what happens if I cancel, and reschedule my appointment to Friday?",
  "How do I cancel and reschedule my appointment?",
  "Kun je uitleggen wat annuleren kost en mijn afspraak niet verzetten naar vrijdag?",
  "Can you explain the cancellation fee and please do not cancel my appointment?",
  "Kun je uitleggen wat annuleren kost en annuleer mijn afspraak niet?",
  "Can you explain the cancellation fee and could you not cancel my appointment?",
]) {
  Deno.test(`R21-FIX2 dependent or negated clause stays read-only: ${message}`, async () => {
    const f = fixture();
    const t = createTools(f.client, { ...context, userMessage: message, hardConfirm: true, confirmCancel: true });
    assert(isCancellationPolicyQuestion(message));
    assert(t.decls.length === 1 && t.decls[0].name === "get_my_appointments");
    for (const tool of ["cancel_appointment", "reschedule_appointment"]) {
      const out = await t.execute(tool, { confirmed: true, only_confirming_previous: true, date: "2099-09-11" }) as Record<string, unknown>;
      assert(out.policy_only === true && out.cancellation_deadline_hours === 48);
      assert(f.writes.length === 0, `Pure explanation reached mutation: ${f.writes}`);
    }
  });
}
for (const [message, tool] of [
  ["Kun je uitleggen wat annuleren kost en mijn afspraak verzetten naar vrijdag?", "reschedule_appointment"],
  ["Kun je uitleggen wat annuleren kost, en mijn afspraak verzetten naar vrijdag om 16:00?", "reschedule_appointment"],
  ["Kun je uitleggen wat annuleren kost en mijn afspraak annuleren voor vrijdag?", "cancel_appointment"],
  ["Kun je uitleggen hoe ik kan annuleren en kun je mijn afspraak verzetten naar vrijdag?", "reschedule_appointment"],
  ["Kun je uitleggen wat er gebeurt als ik annuleer en kun je mijn afspraak annuleren?", "cancel_appointment"],
  ["Can you explain the cancellation fee and reschedule my appointment to Friday?", "reschedule_appointment"],
  ["Can you explain how to cancel and could you reschedule my appointment to Friday?", "reschedule_appointment"],
  ["Can you explain what happens if I cancel and can you cancel my appointment?", "cancel_appointment"],
]) {
  Deno.test(`R21-FIX2 independent action and destination retain guarded flow: ${message}`, async () => {
    const f = fixture();
    const t = createTools(f.client, { ...context, userMessage: message });
    assert(!isCancellationPolicyQuestion(message));
    assert(t.decls.some((d) => d.name === tool));
    let out: Record<string, unknown> | undefined;
    try {
      out = await t.execute(tool, { date: "2099-09-11" }) as Record<string, unknown>;
    } catch (e) {
      assert(e instanceof Error && e.message === "WRITE TRAP");
      assert(f.writes.includes("whatsapp_conversations.update"));
    }
    assert(out?.policy_only !== true);
    assert(f.reads.some((r) => r.table === "bookings"), "Normal scoped booking lookup remains reachable");
    assert(!f.writes.includes("bookings.update"), "Existing confirmation gate must remain before booking mutation");
  });
}

// R25: contrast resets only a standalone instruction, not procedural coordination.
for (const message of [
  "Kun je uitleggen hoe ik mijn afspraak moet annuleren, maar verzet mijn afspraak naar vrijdag.",
  "Can you explain how to cancel, but please reschedule my appointment to Friday?",
]) Deno.test(`R25 contrastive instruction keeps existing identity flow: ${message}`, async () => {
  const f = fixture();
  const t = createTools(f.client, { ...context, userMessage: message });
  assert(!isCancellationPolicyQuestion(message));
  assert(t.decls.some(d => d.name === "reschedule_appointment"));
  let trapped = false;
  try { await t.execute("reschedule_appointment", { date: "2099-09-11" }); }
  catch (e) { trapped = e instanceof Error && e.message === "WRITE TRAP"; }
  assert(trapped && f.writes.length === 1 && f.writes[0] === "whatsapp_conversations.update");
});

// FIX1: explanation owns an embedded question even with previously unseen wording.
for (const message of [
  "Can you explain what happens when I cancel and reschedule my appointment?",
  "Can you explain why I should cancel and reschedule my appointment?",
  "Kun je uitleggen waarom ik mijn afspraak moet annuleren en mijn afspraak verzetten naar vrijdag?",
  "Can you explain where I can cancel and reschedule my appointment?",
  "Kun je uitleggen wat ik moet doen om te annuleren en mijn afspraak verzetten naar vrijdag?",
  "Can you explain why cancellation costs money and reschedule my appointment?",
  "Can you explain the consequences of cancelling and reschedule my appointment?",
]) Deno.test(`R25 FIX1 embedded explanation retains read-only executor: ${message}`, async () => {
  const f=fixture();const t=createTools(f.client,{...context,userMessage:message,hardConfirm:true,confirmCancel:true});
  assert(isCancellationPolicyQuestion(message));
  assert(t.decls.length===1 && t.decls[0].name==="get_my_appointments");
  for (const tool of ["cancel_appointment","reschedule_appointment","unadvertised_mutation"]) {
    const out=await t.execute(tool,{confirmed:true,date:"2099-09-11"}) as Record<string,unknown>;
    assert(f.writes.length===0 && out.policy_only===true && out.cancellation_deadline_hours===48);
  }
});
Deno.test("R25 FIX1 leading polite modal retains identity gate", async () => {
  const message="Please could you reschedule my appointment? What is the cancellation fee?";
  const f=fixture();const t=createTools(f.client,{...context,userMessage:message});
  assert(!isCancellationPolicyQuestion(message));
  let trapped=false;
  try {await t.execute("reschedule_appointment",{date:"2099-09-11"});}
  catch(e){trapped=e instanceof Error && e.message==="WRITE TRAP";}
  assert(trapped && f.writes.length===1 && f.writes[0]==="whatsapp_conversations.update");
});
