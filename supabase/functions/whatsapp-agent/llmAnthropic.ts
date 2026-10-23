// Anthropic (Claude) provider for the agent loop: LLM_PROVIDER=anthropic.
//
// R84 (2026-10-23): Mathieu asked for an honest side-by-side of the live Groq gpt-oss-20b and Claude
// Haiku 5.5 on low effort. This file is the only place that knows the Anthropic wire format; llm.ts
// dispatches here and its Groq/OpenAI/Gemini paths stay untouched. Production stays on Groq until a
// measured bake-off says otherwise. Defaults: ANTHROPIC_MODEL=claude-haiku-5-5, ANTHROPIC_EFFORT=low.
//
// Rules of Claude Haiku 5.5 that this adapter enforces (Anthropic's Haiku 5.5 migration guide):
// - temperature/top_p/top_k with a non-default value return a 400, so opts.temperature is ignored;
// - the first turn must be a user turn (an assistant first turn is a 400) and so must the last one
//   (an assistant last turn is a prefill, also a 400);
// - adaptive thinking is on by default, so a response can start with thinking blocks: text is read
//   by block type, and the assistant turn is echoed back unchanged together with the tool results;
// - effort lives in output_config, not at the top level.
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import type { AgentResult, Content, RunOpts } from "./llm.ts";

export type AnthropicEffort = "low" | "medium" | "high" | "xhigh" | "max";
export const ANTHROPIC_EFFORTS: readonly AnthropicEffort[] = ["low", "medium", "high", "xhigh", "max"];

// The one place that turns the ANTHROPIC_EFFORT setting into what is actually sent: unset or an
// unknown value means low. llm.ts and the staging label both read it here, so they cannot drift.
export function effectiveAnthropicEffort(raw: string | null | undefined): AnthropicEffort {
  const asked = (raw || "low").toLowerCase();
  return (ANTHROPIC_EFFORTS as readonly string[]).includes(asked) ? asked as AnthropicEffort : "low";
}

// Room for adaptive thinking plus a WhatsApp-sized reply or a tool call. Thinking counts toward this cap.
const MAX_TOKENS = 4096;

// The model sees only the last 12 messages (index.ts), so the window often starts with one of our own
// replies. Anthropic rejects an assistant first turn; this note goes in front instead of dropping that
// reply, which would lose what the customer is answering (a reminder, a proposed time).
export const WINDOW_START_NOTE = "[systeem] Begin van het zichtbare gesprek; eerdere berichten zijn weggelaten.";
// A history that ends on our own reply happens when two customer messages cross a reply. The other
// providers then simply continue; here that would be a prefill (400), so a short note asks the same.
export const ALREADY_SENT_NOTE =
  "[systeem] Het bericht hierboven is al naar de klant verstuurd. Is het laatste klantbericht daarmee nog niet volledig beantwoord, help dan verder; herhaal niets wat al gezegd is.";

// prompt.ts builds the system prompt as a STATIC PART (constant per tenant) followed by blocks that
// change per turn; the static part ends with its </tools> block. Marking that stable prefix as a cache
// breakpoint keeps it warm across turns while the tail changes. Caching never changes what the model
// reads, only the price and the latency: if the marker is missing, the whole prompt is one block.
const STABLE_PREFIX_END = "\n</tools>\n";

export function systemBlocks(system: string): Anthropic.TextBlockParam[] {
  const at = system.indexOf(STABLE_PREFIX_END);
  if (at < 0) return [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
  const cut = at + STABLE_PREFIX_END.length;
  const rest = system.slice(cut);
  // A whitespace-only tail cannot be its own block (the API rejects blank text), so it stays on
  // the stable block: the joined blocks are always exactly the original prompt.
  if (!rest.trim()) return [{ type: "text", text: system, cache_control: { type: "ephemeral" } }];
  return [
    { type: "text", text: system.slice(0, cut), cache_control: { type: "ephemeral" } },
    { type: "text", text: rest },
  ];
}

export function toAnthropicMessages(contents: Content[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const c of contents) {
    const text = (c.parts.find((p) => "text" in p) as { text: string } | undefined)?.text ?? "";
    // The API rejects empty text blocks; the OpenAI path skips empty turns as well.
    if (!text.trim()) continue;
    messages.push({ role: c.role === "model" ? "assistant" : "user", content: text });
  }
  if (messages.length && messages[0].role === "assistant") {
    messages.unshift({ role: "user", content: WINDOW_START_NOTE });
  }
  if (messages.length && messages[messages.length - 1].role === "assistant") {
    messages.push({ role: "user", content: ALREADY_SENT_NOTE });
  }
  return messages;
}

// The one call this loop makes; tests pass a fake with the same shape.
export interface AnthropicMessages {
  messages: { create(body: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> };
}

export interface AnthropicConfig {
  key: string;
  model: string;
  effort: AnthropicEffort;
  timeoutMs: number;
  client?: AnthropicMessages;
}

export async function runAgentAnthropic(opts: RunOpts, cfg: AnthropicConfig): Promise<AgentResult> {
  if (!cfg.client && !cfg.key) throw new Error("LLM API key ontbreekt (ANTHROPIC_API_KEY)");
  const client: AnthropicMessages = cfg.client ?? new Anthropic({
    apiKey: cfg.key,
    // Same bound as postOpenAI: a hung call must throw inside the isolate so index.ts can send its
    // fallback reply. The SDK retries 408/409/429/5xx and connection errors twice (3 attempts).
    timeout: cfg.timeoutMs,
    maxRetries: 2,
    // Always the CURRENT global fetch: the staging build wraps fetch (netGuard) after module load.
    fetch: (input: string | URL | Request, init?: RequestInit) => globalThis.fetch(input, init),
  });
  const maxSteps = opts.maxSteps ?? 6;
  const toolCalls: AgentResult["toolCalls"] = [];
  const messages = toAnthropicMessages(opts.contents);
  if (!messages.length) return { text: "", steps: 0, toolCalls };
  const system = systemBlocks(opts.system);
  const tools: Anthropic.Tool[] | undefined = opts.tools.length
    ? opts.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool.InputSchema,
    }))
    : undefined;

  for (let step = 0; step < maxSteps; step++) {
    const body: Anthropic.MessageCreateParamsNonStreaming = {
      model: cfg.model,
      max_tokens: MAX_TOKENS,
      system,
      messages,
      output_config: { effort: cfg.effort },
      // Automatic breakpoint on the last block: the next step of this same turn reads everything
      // before its new tool turn from cache. Together with the explicit breakpoint on the stable
      // system prefix this is the agent-loop pattern from Anthropic's prompt-caching guide.
      cache_control: { type: "ephemeral" },
    };
    if (tools) body.tools = tools;

    const callT0 = Date.now();
    const resp = await client.messages.create(body);
    // Explicit block types on purpose. Without a lock file the SDK's optional zod peer can resolve
    // to _shared's zod@3.23.8 (the SDK wants ^3.25 || ^4), and `deno check index.ts` then saw the
    // SDK types as any (measured 2026-10-23); with the repo's deno.lock the review of 2026-10-24
    // found them strict. Runtime is unaffected either way: zod is only loaded by the SDK's zod
    // helper, which this file never imports.
    const toolUses = resp.content.filter((b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use"
    );
    // Same observability line as the Groq path, with Anthropic's own usage fields. Log-only.
    try {
      const u = resp.usage;
      const read = u.cache_read_input_tokens ?? 0;
      const write = u.cache_creation_input_tokens ?? 0;
      console.log(
        `[llm-usage] model=${cfg.model} effort=${cfg.effort} step=${step} ms=${Date.now() - callT0}` +
          ` prompt_tok=${u.input_tokens + read + write} uncached_tok=${u.input_tokens}` +
          ` cached_tok=${read} cache_write_tok=${write} completion_tok=${u.output_tokens}` +
          ` stop=${resp.stop_reason}` +
          (resp.stop_reason === "refusal" ? ` refusal_category=${resp.stop_details?.category ?? "-"}` : "") +
          ` tool_calls=${toolUses.length}`,
      );
    } catch (_) { /* observability must never break the turn */ }

    // A safety refusal carries no reply for the customer; empty text sends index.ts down its own
    // no-answer path. Any stop other than tool_use ends the loop. That includes max_tokens with a
    // tool_use block: its input may be cut off, so it is never executed.
    if (resp.stop_reason === "refusal") return { text: "", steps: step + 1, toolCalls };
    if (resp.stop_reason !== "tool_use" || toolUses.length === 0) {
      // Separate text blocks are separate pieces of the answer: join them with a line break, never
      // glue them ("Hoi!Welke dienst wil je?", review round 3).
      const text = resp.content
        .filter((b: Anthropic.ContentBlock): b is Anthropic.TextBlock => b.type === "text")
        .map((b: Anthropic.TextBlock) => b.text.trim())
        .filter(Boolean)
        .join("\n");
      return { text, steps: step + 1, toolCalls };
    }

    // Echo the assistant turn unchanged (thinking blocks included), then all results in ONE user turn.
    messages.push({ role: "assistant", content: resp.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const args = (tu.input && typeof tu.input === "object" ? tu.input : {}) as Record<string, unknown>;
      let result: unknown;
      let failed = false;
      try {
        result = await opts.execute(tu.name, args);
      } catch (e) {
        result = { error: String((e as Error)?.message || e) };
        failed = true;
      }
      toolCalls.push({ name: tu.name, args, result });
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(result) ?? "null",
        ...(failed ? { is_error: true } : {}),
      });
    }
    messages.push({ role: "user", content: results });

    // B1 parity: a committed mutation skips the compose call; index.ts templates the confirmation.
    if (opts.stopOnToolResult && toolCalls.some((t) => opts.stopOnToolResult!(t.name, t.result))) {
      return { text: "", steps: step + 1, toolCalls };
    }
  }

  return { text: "", steps: maxSteps, toolCalls };
}
