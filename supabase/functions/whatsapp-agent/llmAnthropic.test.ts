// R84: the Claude Haiku 5.5 provider. Offline: a fake client records every request body.
// Run: deno test --allow-env llmAnthropic.test.ts
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1.0.19";
import type Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { ALREADY_SENT_NOTE, type AnthropicMessages, effectiveAnthropicEffort, runAgentAnthropic, systemBlocks, toAnthropicMessages, WINDOW_START_NOTE, effectiveAnthropicThinking } from "./llmAnthropic.ts";
import { type Content, runAgent, type RunOpts } from "./llm.ts";
import { buildSystemPrompt } from "./prompt.ts";

type Block = Anthropic.ContentBlock;

function reply(content: Block[], stop: Anthropic.StopReason, extra: Partial<Anthropic.Message> = {}): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content,
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    ...extra,
  } as Anthropic.Message;
}
const text = (t: string) => ({ type: "text", text: t, citations: null }) as Block;
const thinking = () => ({ type: "thinking", thinking: "", signature: "sig-abc" }) as Block;
const toolUse = (id: string, name: string, input: Record<string, unknown>) =>
  ({ type: "tool_use", id, name, input }) as Block;

// Deep snapshot of each request, because the loop keeps appending to the same messages array.
function fakeClient(replies: Anthropic.Message[]) {
  const bodies: Array<Record<string, unknown>> = [];
  const client: AnthropicMessages = {
    messages: {
      create(body) {
        bodies.push(structuredClone(body) as unknown as Record<string, unknown>);
        const next = replies.shift();
        if (!next) throw new Error("fake client: no reply left");
        return Promise.resolve(next);
      },
    },
  };
  return { client, bodies };
}

const user = (t: string): Content => ({ role: "user", parts: [{ text: t }] });
const model = (t: string): Content => ({ role: "model", parts: [{ text: t }] });

function opts(over: Partial<RunOpts> = {}): RunOpts {
  return {
    system: "<role>\nX\n</role>\n\n<tools>\nT\n</tools>\n\n<context>\nnu 22:15\n</context>\n",
    contents: [user("hoi, kan ik dinsdag knippen?")],
    tools: [{
      name: "get_available_slots",
      description: "vrije tijden",
      parameters: { type: "object", properties: { date: { type: "string" } }, required: ["date"] },
    }],
    execute: () => Promise.resolve({ slots: ["09:00", "09:30"] }),
    maxSteps: 6,
    temperature: 0.2,
    ...over,
  };
}
const cfg = (client: AnthropicMessages) => ({ key: "", model: "claude-haiku-5-5", effort: "low" as const, timeoutMs: 25_000, client });

Deno.test("R84 Haiku: request shape follows the Haiku 5.5 rules", async () => {
  const { client, bodies } = fakeClient([reply([thinking(), text("Hoi! Welke dienst?")], "end_turn")]);
  const r = await runAgentAnthropic(opts(), cfg(client));
  // Text is read by block type: the leading thinking block is not the answer.
  assertEquals(r, { text: "Hoi! Welke dienst?", steps: 1, toolCalls: [] });
  const b = bodies[0];
  assertEquals(b.model, "claude-haiku-5-5");
  assertEquals(b.output_config, { effort: "low" });
  assertEquals(b.cache_control, { type: "ephemeral" });
  assertEquals(b.max_tokens, 4096);
  for (const banned of ["temperature", "top_p", "top_k", "thinking"]) assert(!(banned in b), `${banned} must not be sent`);
  assertEquals(b.messages, [{ role: "user", content: "hoi, kan ik dinsdag knippen?" }]);
  assertEquals(b.tools, [{
    name: "get_available_slots",
    description: "vrije tijden",
    input_schema: { type: "object", properties: { date: { type: "string" } }, required: ["date"] },
  }]);
});

Deno.test("R84 Haiku: tool loop echoes the assistant turn unchanged and returns results in one user turn", async () => {
  const first = [thinking(), text("Even kijken."), toolUse("tu_1", "get_available_slots", { date: "2026-10-27" })];
  const { client, bodies } = fakeClient([
    reply(first, "tool_use"),
    reply([text("Dinsdag kan om 09:00 of 09:30.")], "end_turn"),
  ]);
  const seen: Array<[string, Record<string, unknown>]> = [];
  const r = await runAgentAnthropic(
    opts({ execute: (n, a) => (seen.push([n, a]), Promise.resolve({ slots: ["09:00", "09:30"] })) }),
    cfg(client),
  );
  assertEquals(seen, [["get_available_slots", { date: "2026-10-27" }]]);
  assertEquals(r.text, "Dinsdag kan om 09:00 of 09:30.");
  assertEquals(r.steps, 2);
  assertEquals(r.toolCalls, [{ name: "get_available_slots", args: { date: "2026-10-27" }, result: { slots: ["09:00", "09:30"] } }]);
  const msgs = bodies[1].messages as Array<{ role: string; content: unknown }>;
  assertEquals(msgs.length, 3);
  assertEquals(msgs[1], { role: "assistant", content: first });
  assertEquals(msgs[2], {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: "tu_1", content: JSON.stringify({ slots: ["09:00", "09:30"] }) }],
  });
});

Deno.test("R84 Haiku: two tool calls in one turn are both executed, results in order, one user turn", async () => {
  const { client, bodies } = fakeClient([
    reply([toolUse("a", "get_available_slots", { date: "2026-10-27" }), toolUse("b", "get_available_slots", { date: "2026-10-28" })], "tool_use"),
    reply([text("klaar")], "end_turn"),
  ]);
  const r = await runAgentAnthropic(opts({ execute: (_n, a) => Promise.resolve({ for: a.date }) }), cfg(client));
  assertEquals(r.toolCalls.map((t) => t.args.date), ["2026-10-27", "2026-10-28"]);
  const last = (bodies[1].messages as Array<{ role: string; content: Array<{ tool_use_id: string }> }>).at(-1)!;
  assertEquals(last.role, "user");
  assertEquals(last.content.map((c) => c.tool_use_id), ["a", "b"]);
});

Deno.test("R84 Haiku: a committed mutation stops the loop without a compose call (B1 parity)", async () => {
  const { client, bodies } = fakeClient([
    reply([toolUse("c1", "book_appointment", { confirmed: true })], "tool_use"),
    reply([text("must never be requested")], "end_turn"),
  ]);
  const r = await runAgentAnthropic(
    opts({
      execute: () => Promise.resolve({ success: true, booked: true }),
      stopOnToolResult: (name, result) => name === "book_appointment" && (result as { booked?: boolean }).booked === true,
    }),
    cfg(client),
  );
  assertEquals(bodies.length, 1);
  assertEquals(r.text, "");
  assertEquals(r.steps, 1);
  assertEquals(r.toolCalls[0].name, "book_appointment");
});

Deno.test("R84 Haiku: a tool call cut off by max_tokens is never executed", async () => {
  const { client } = fakeClient([reply([toolUse("x", "book_appointment", { confirmed: true })], "max_tokens")]);
  let executed = false;
  const r = await runAgentAnthropic(opts({ execute: () => ((executed = true), Promise.resolve({})) }), cfg(client));
  assertEquals(executed, false);
  assertEquals(r, { text: "", steps: 1, toolCalls: [] });
});

Deno.test("R84 Haiku: a refusal gives empty text and runs no tool", async () => {
  const { client } = fakeClient([
    reply([text("I can't help with that."), toolUse("y", "cancel_appointment", {})], "refusal", {
      stop_details: { type: "refusal", category: "general_harms", explanation: null },
    } as Partial<Anthropic.Message>),
  ]);
  let executed = false;
  const r = await runAgentAnthropic(opts({ execute: () => ((executed = true), Promise.resolve({})) }), cfg(client));
  assertEquals(executed, false);
  assertEquals(r.text, "");
});

Deno.test("R84 Haiku: a throwing tool becomes an is_error result, like the other providers' {error}", async () => {
  const { client, bodies } = fakeClient([
    reply([toolUse("e1", "get_available_slots", { date: "2026-10-27" })], "tool_use"),
    reply([text("Er ging iets mis bij het ophalen.")], "end_turn"),
  ]);
  const r = await runAgentAnthropic(opts({ execute: () => Promise.reject(new Error("db down")) }), cfg(client));
  assertEquals(r.toolCalls[0].result, { error: "db down" });
  const last = (bodies[1].messages as Array<{ content: unknown }>).at(-1)!;
  assertEquals(last.content, [{ type: "tool_result", tool_use_id: "e1", content: JSON.stringify({ error: "db down" }), is_error: true }]);
});

Deno.test("R84 Haiku: the loop stops at maxSteps with empty text", async () => {
  const loop = () => reply([toolUse("l", "get_available_slots", { date: "2026-10-27" })], "tool_use");
  const { client, bodies } = fakeClient([loop(), loop(), loop()]);
  const r = await runAgentAnthropic(opts({ maxSteps: 3 }), cfg(client));
  assertEquals(bodies.length, 3);
  assertEquals(r.text, "");
  assertEquals(r.steps, 3);
  assertEquals(r.toolCalls.length, 3);
});

Deno.test("R84 Haiku: history mapping keeps every turn and makes first and last turns user turns", () => {
  // The 12-message window starting on our own reply (a reminder) is the common case.
  assertEquals(toAnthropicMessages([model("Herinnering: morgen 10:00"), user("kan het later?")]), [
    { role: "user", content: WINDOW_START_NOTE },
    { role: "assistant", content: "Herinnering: morgen 10:00" },
    { role: "user", content: "kan het later?" },
  ]);
  // Two customer messages crossed our reply: the history ends on that reply.
  assertEquals(toAnthropicMessages([user("a"), user("b"), model("antwoord op a")]), [
    { role: "user", content: "a" },
    { role: "user", content: "b" },
    { role: "assistant", content: "antwoord op a" },
    { role: "user", content: ALREADY_SENT_NOTE },
  ]);
  // Empty and whitespace-only turns are skipped, as the OpenAI path skips empty ones.
  assertEquals(toAnthropicMessages([user("hoi"), model(""), model("   "), user("ja")]), [
    { role: "user", content: "hoi" },
    { role: "user", content: "ja" },
  ]);
  // The index.ts nudge retry (model text + [systeem] user turn) passes through as is.
  assertEquals(toAnthropicMessages([user("ja"), model("ik check even"), user("[systeem] doe het nu")]).length, 3);
});

Deno.test("R84 Haiku: no history means no call", async () => {
  const { client, bodies } = fakeClient([]);
  const r = await runAgentAnthropic(opts({ contents: [model("")] }), cfg(client));
  assertEquals(bodies.length, 0);
  assertEquals(r, { text: "", steps: 0, toolCalls: [] });
});

Deno.test("R84 Haiku: the real system prompt splits at its static part, losing and changing nothing", () => {
  const services = [{ id: "svc-1", name: "Knippen", durationMin: 30, price: 25 }];
  const a = buildSystemPrompt({
    businessName: "Salon Iris",
    currentTimeNL: "22:15 dinsdag 27 oktober 2026",
    todayISO: "2026-10-27",
    customerFirstName: "Karim",
    services,
  } as Parameters<typeof buildSystemPrompt>[0]);
  const b = buildSystemPrompt({
    businessName: "Salon Iris",
    currentTimeNL: "09:02 woensdag 28 oktober 2026",
    todayISO: "2026-10-28",
    customerFirstName: "Sophie",
    services,
    isFirstContact: true,
    welcomeMessage: "Welkom bij Salon Iris!",
  } as Parameters<typeof buildSystemPrompt>[0]);
  const [aStable, aRest] = systemBlocks(a);
  const [bStable, bRest] = systemBlocks(b);
  assertEquals(aStable.text + aRest.text, a);
  assertEquals(bStable.text + bRest.text, b);
  assert(aStable.text.endsWith("</tools>\n"), "the stable block must end at the static part's </tools>");
  assertEquals(aStable.text, bStable.text);
  assertEquals(aStable.cache_control, { type: "ephemeral" });
  assertEquals(aRest.cache_control, undefined);
  assert(aRest.text !== bRest.text);
  assert(!aStable.text.includes("Karim") && !aStable.text.includes("22:15"), "per-turn data leaked into the cached prefix");
});

Deno.test("R84 Haiku: a prompt without the marker stays one cached block", () => {
  assertEquals(systemBlocks("geen tools blok"), [{ type: "text", text: "geen tools blok", cache_control: { type: "ephemeral" } }]);
});

Deno.test("R84 Haiku review 3: a whitespace-only tail stays on the stable block, so nothing is lost", () => {
  const prompt = "<role>\nX\n</role>\n<tools>\nT\n</tools>\n \n";
  const blocks = systemBlocks(prompt);
  assertEquals(blocks.map((b) => b.text).join(""), prompt);
  assertEquals(blocks.length, 1);
});

Deno.test("R84 Haiku review 3: separate text blocks are joined with a line break, never glued", async () => {
  const { client } = fakeClient([reply([text("Hoi!"), text("Welke dienst wil je?")], "end_turn")]);
  const r = await runAgentAnthropic(opts(), cfg(client));
  assertEquals(r.text, "Hoi!\nWelke dienst wil je?");
});

Deno.test("R84 Haiku review 3: effectiveAnthropicEffort is what is actually sent", () => {
  assertEquals(effectiveAnthropicEffort(undefined), "low");
  assertEquals(effectiveAnthropicEffort(""), "low");
  assertEquals(effectiveAnthropicEffort("MEDIUM"), "medium");
  assertEquals(effectiveAnthropicEffort("turbo"), "low");
});

Deno.test("R84 Haiku thinking off: thinking disabled is sent next to the same effort", async () => {
  const { client, bodies } = fakeClient([reply([text("Hoi!")], "end_turn")]);
  const r = await runAgentAnthropic(opts(), { ...cfg(client), thinking: "off" as const });
  assertEquals(r.text, "Hoi!");
  assertEquals(bodies[0].thinking, { type: "disabled" });
  assertEquals(bodies[0].output_config, { effort: "low" });
});

Deno.test("R84 Haiku thinking off at xhigh or max is refused before any call", async () => {
  for (const effort of ["xhigh", "max"] as const) {
    const { client, bodies } = fakeClient([reply([text("x")], "end_turn")]);
    await assertRejects(() => runAgentAnthropic(opts(), { ...cfg(client), effort, thinking: "off" as const }), Error, "high or below");
    assertEquals(bodies.length, 0);
  }
});

Deno.test("R84 Haiku: effectiveAnthropicThinking only turns 'off' into off", () => {
  assertEquals(effectiveAnthropicThinking(undefined), "adaptive");
  assertEquals(effectiveAnthropicThinking(""), "adaptive");
  assertEquals(effectiveAnthropicThinking("OFF"), "off");
  assertEquals(effectiveAnthropicThinking("disabled"), "adaptive");
});

Deno.test("R84 Haiku: ANTHROPIC_THINKING reaches the adapter through llm.ts", async () => {
  const keys = ["LLM_PROVIDER", "ANTHROPIC_API_KEY", "ANTHROPIC_THINKING", "ANTHROPIC_EFFORT"];
  const saved = keys.map((k) => [k, Deno.env.get(k)] as const);
  try {
    Deno.env.set("LLM_PROVIDER", "anthropic");
    Deno.env.delete("ANTHROPIC_API_KEY");
    Deno.env.set("ANTHROPIC_THINKING", "off");
    Deno.env.set("ANTHROPIC_EFFORT", "max");
    // The thinking check runs before the key check, so this message proves llm.ts passed thinking on.
    await assertRejects(() => runAgent(opts()), Error, "high or below");
  } finally {
    for (const [k, v] of saved) v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v);
  }
});

Deno.test("R84 Haiku: LLM_PROVIDER=anthropic reaches this adapter and fails closed without a key", async () => {
  const saved = ["LLM_PROVIDER", "ANTHROPIC_API_KEY"].map((k) => [k, Deno.env.get(k)] as const);
  try {
    Deno.env.set("LLM_PROVIDER", "anthropic");
    Deno.env.delete("ANTHROPIC_API_KEY");
    await assertRejects(() => runAgent(opts()), Error, "ANTHROPIC_API_KEY");
  } finally {
    for (const [k, v] of saved) v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v);
  }
});
