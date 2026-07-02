// Tool-calling agent loop with a provider switch.
//   LLM_PROVIDER=groq    -> Groq LPU, OpenAI-compatible (default model openai/gpt-oss-20b: fastest+cheapest)
//   LLM_PROVIDER=openai  -> OpenAI Chat Completions (default model gpt-5-nano: fast + cheap)
//   LLM_PROVIDER=gemini  -> Gemini Flash-Lite (original; kept for easy revert)
// Default is gemini unless LLM_PROVIDER is set. groq + openai share runAgentOpenAI (Chat
// Completions wire format) parameterized by {baseUrl, key, model}. Only this file knows the formats.
// LIVE (Supabase secrets, 2026-06-23 A1c): LLM_PROVIDER=groq, GROQ_MODEL=openai/gpt-oss-20b
// -> production runs Groq gpt-oss-20b (paid Dev tier). Proven on the §6 gate testpad: warm p50
// ~2.2s, no turn >5s (hits the <3s gate gpt-4.1-mini missed at ~4s), all hard gates green
// (two-phase book+cancel, name-gate, NL/EN), ~5x cheaper per token. SAFE-REVERT = LLM_PROVIDER=openai
// (OPENAI_MODEL=gpt-4.1-mini, the prior live default, kept as fallback). Watch-item: gpt-oss-20b
// once called get_business_data for opening hours instead of answering from injected <business_data>.
// (Prior context) The System-Overhaul W1 latency measurement showed gpt-4.1-mini
// is both FASTER (p50 ~4s vs gpt-5-mini's ~6-8s on 2-tool turns; no >10s) AND more tool-compliant
// (it calls book/reschedule DIRECTLY on the first pass — gpt-5-mini stalled with an "ik check even"
// announce and needed a server nudge), while preserving every hard gate (two-phase book/cancel,
// name gate, double-book guard, closed-day refusal, NL/EN/DE language fidelity) — verified E2E on
// the §6 testpad with DB checks. gpt-4.1-mini is a NON-reasoning model: the isReasoning branch
// below sends temperature (not reasoning_effort) for it. Safe-revert: OPENAI_MODEL=gpt-5-mini, or
// LLM_PROVIDER=gemini. The gemini/gpt-5-nano defaults above are the revert path, NOT what runs live.
//
// B1 GEMINI EVAL (2026-06-21, Phase-2) + A1 RE-EVAL (2026-06-23): Mathew directed a proper migration
// to gemini-3.5-flash (latency p50 <3s warm). The 3.x function-calling format is now FULLY IMPLEMENTED
// in runAgentGemini below: each functionCall part carries an `id` + a sibling `thoughtSignature`; the
// model turn echoes BOTH back exactly, and every functionResponse carries the matching `id`+`name`
// (verified via a direct generateContent probe — the 2-turn round-trip 200s and replies correctly).
// thinkingLevel is pinned to "minimal" for 3.x (env GEMINI_THINKING_LEVEL) because the default "medium"
// is slow. ADOPTION-GATE VERDICT (empirical, 2026-06-23): gemini-3.5-flash STILL FAILS the <3s gate by
// ~15x — direct-API warm p50 ~24s for a single tool-call turn (range 17.5-29s), ~45s for a 2-call book
// turn, with frequent 503 "high demand". Even at thinkingLevel:minimal it spends ~80 thought tokens and
// is far over budget. So LLM_PROVIDER stays "openai" (gpt-4.1-mini) live. This 3.x path is now CORRECT
// and dormant — a flip to gemini will work functionally (no more 400s) the moment Google's latency
// improves; re-run the §6 testpad before adopting. GEMINI_MODEL secret = gemini-3.5-flash (harmless
// while provider=openai; the code below handles it correctly now).

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";
const geminiEndpoint = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

export interface ToolDecl {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema (object)
}
export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<unknown>;

type Part =
  | { text: string }
  // Gemini 3.x: a functionCall part carries an `id` and a SIBLING `thoughtSignature` that
  // MUST be echoed back unchanged in the next model turn (else "400: missing thought_signature").
  | { functionCall: { name: string; args: Record<string, unknown>; id?: string }; thoughtSignature?: string }
  // Gemini 3.x: the functionResponse MUST repeat the matching functionCall `id` + exact `name`.
  | { functionResponse: { name: string; id?: string; response: Record<string, unknown> } };
type FunctionCallPart = Extract<Part, { functionCall: unknown }>;
export interface Content {
  role: "user" | "model";
  parts: Part[];
}

export interface AgentResult {
  text: string;
  steps: number;
  toolCalls: { name: string; args: Record<string, unknown>; result: unknown }[];
}

export interface RunOpts {
  system: string;
  contents: Content[];
  tools: ToolDecl[];
  execute: ToolExecutor;
  maxSteps?: number;
  temperature?: number;
  // B1 (2e-LLM-call collapse): when a tool result this step satisfies this predicate, STOP the
  // loop and return empty text instead of making the follow-up model call that composes the prose.
  // The caller (index.ts) passes the "successful book/cancel/reschedule COMMIT" predicate so a
  // committed mutation skips call 2 (~2-2.5s saved) and the caller builds a deterministic
  // confirmation from the tool result. Provider-agnostic: llm.ts knows nothing about booking
  // semantics, only "if this fires, don't ask the model to write the reply".
  stopOnToolResult?: (name: string, result: unknown) => boolean;
}

// Provider dispatch.
export async function runAgent(opts: RunOpts): Promise<AgentResult> {
  const provider = (Deno.env.get("LLM_PROVIDER") || "gemini").toLowerCase();
  // Groq = OpenAI-compatible Chat Completions on the LPU (sub-100ms TTFT). Reuses the OpenAI
  // path with a different base URL + key + model. A1 RE-EVAL (2026-06-23): direct-probe warm
  // p50 ~0.3s/tool-turn + ~0.6-0.75s/book-turn on openai/gpt-oss-20b, ~5-13x faster than
  // gpt-4.1-mini AND cheaper ($0.075/$0.30 per 1M). Groq is behind Cloudflare (postOpenAI sends
  // a Mozilla UA so a Deno UA isn't 403'd with code 1010).
  if (provider === "groq") {
    return runAgentOpenAI(opts, {
      baseUrl: "https://api.groq.com/openai/v1",
      key: Deno.env.get("GROQ_API_KEY") ?? "",
      model: Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b",
    });
  }
  if (provider === "openai") {
    return runAgentOpenAI(opts, {
      baseUrl: "https://api.openai.com/v1",
      key: Deno.env.get("OPENAI_API_KEY") ?? "",
      model: Deno.env.get("OPENAI_MODEL") || "gpt-5-nano",
    });
  }
  return runAgentGemini(opts);
}

// ---------------------------------------------------------------------------
// OpenAI (Chat Completions, tool-calling). Default gpt-5-nano.
// GPT-5 reasoning models: no custom temperature (only default), use
// max_completion_tokens, reasoning_effort=minimal for speed/cost.
// ---------------------------------------------------------------------------
async function postOpenAI(baseUrl: string, key: string, body: unknown): Promise<any> {
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      // Mozilla UA: Groq sits behind Cloudflare, which 403s (code 1010) a default Deno UA.
      // Harmless for OpenAI. Same WAF-evasion pattern as the Supabase Mgmt-API helper.
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify(body),
    });
    if (resp.ok) return await resp.json();
    lastErr = `LLM ${resp.status}: ${(await resp.text()).slice(0, 300)}`;
    if (resp.status === 429 || resp.status >= 500) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    throw new Error(lastErr);
  }
  throw new Error(lastErr || "OpenAI failed after retries");
}

async function runAgentOpenAI(
  opts: RunOpts,
  cfg: { baseUrl: string; key: string; model: string },
): Promise<AgentResult> {
  const { baseUrl, model } = cfg;
  const key = cfg.key;
  if (!key) throw new Error("LLM API key ontbreekt (OPENAI_API_KEY / GROQ_API_KEY)");
  const maxSteps = opts.maxSteps ?? 6;
  const toolCalls: AgentResult["toolCalls"] = [];

  // System + text history (history from the caller is text-only; tool turns are added below).
  const messages: Array<Record<string, unknown>> = [{ role: "system", content: opts.system }];
  for (const c of opts.contents) {
    const text = (c.parts.find((p) => "text" in p) as { text: string } | undefined)?.text ?? "";
    if (!text) continue;
    messages.push({ role: c.role === "model" ? "assistant" : "user", content: text });
  }

  const tools = opts.tools.length
    ? opts.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }))
    : undefined;

  // GPT-5 / o-series are reasoning models (reasoning_effort, no custom temperature).
  // gpt-4.1* / gpt-4o* are NOT — they reject reasoning_effort and DO take temperature.
  // Detect from the model id so OPENAI_MODEL can be flipped to a faster non-reasoning
  // model for the latency test without a 400.
  const isReasoning = /^(gpt-5|o\d)/i.test(model);
  // T3-LATENCY-RETRY (R21): gpt-oss-20b (the LIVE Groq model) is ALSO a reasoning model, but the
  // regex above never matched it (its id is "openai/gpt-oss-20b", not "gpt-5*"/"o\d*"), so it fell
  // into the temperature-only branch and NEVER got a reasoning_effort sent, meaning Groq applied
  // its own uncapped default. Direct-probe measurement (10+10 calls, varied prompts, real-size
  // system prompt): baseline reasoning_tokens ranged ~85-216 per call (one isolated repro spiked to
  // 1998, exhausting the entire max_completion_tokens budget on hidden reasoning and costing ~3s for
  // that ONE step alone); with reasoning_effort:"low" it consistently stayed ~11-19 tokens. Chained
  // across runAgent's multi-step loop (2-4 sequential Groq calls in one turn, occasionally doubled by
  // index.ts's stall-retry nudge) this reasoning-token variance is what stretched some turns from the
  // normal ~2s to 6-11s, not extra retries or a slow DB/tool call (individually fast, ~30-150ms).
  // Groq's gpt-oss only accepts reasoning_effort "low"/"medium"/"high" (NOT OpenAI's "minimal"/"none",
  // both rejected with a 400 on a live probe), so this gets its OWN branch rather than reusing
  // isReasoning's "minimal". gpt-4.1-mini (the safe-revert OPENAI_MODEL) is unaffected: it fails the
  // isGroqReasoning test below and keeps the existing temperature-only path.
  const isGroqReasoning = /gpt-oss/i.test(model);
  for (let step = 0; step < maxSteps; step++) {
    const body: Record<string, unknown> = { model, messages, max_completion_tokens: 2000 };
    if (isReasoning) body.reasoning_effort = "minimal";
    else if (isGroqReasoning) { body.reasoning_effort = "low"; body.temperature = opts.temperature ?? 0.2; }
    else body.temperature = opts.temperature ?? 0.2;
    if (tools) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const data = await postOpenAI(baseUrl, key, body);
    const msg = data?.choices?.[0]?.message;
    if (!msg) return { text: "", steps: step + 1, toolCalls };

    const tcs: Array<{ id: string; function: { name: string; arguments: string } }> = msg.tool_calls ?? [];
    if (tcs.length === 0) {
      return { text: String(msg.content ?? "").trim(), steps: step + 1, toolCalls };
    }

    // Record the assistant's tool-call turn, then execute + feed results back.
    messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: tcs });
    for (const tc of tcs) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function?.arguments || "{}");
      } catch {
        args = {};
      }
      let result: unknown;
      try {
        result = await opts.execute(tc.function.name, args);
      } catch (e) {
        result = { error: String((e as Error)?.message || e) };
      }
      toolCalls.push({ name: tc.function.name, args, result });
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }

    // B1: if a tool this step committed a mutation the caller can confirm deterministically,
    // stop now and skip the compose model-call (call 2). Empty text -> caller templates the reply.
    if (opts.stopOnToolResult && toolCalls.some((t) => opts.stopOnToolResult!(t.name, t.result))) {
      return { text: "", steps: step + 1, toolCalls };
    }
  }

  return { text: "", steps: maxSteps, toolCalls };
}

// ---------------------------------------------------------------------------
// Gemini Flash-Lite (original). functionResponse wrapped as {result:...} (verified).
// ---------------------------------------------------------------------------
async function postGemini(model: string, key: string, body: unknown): Promise<any> {
  const url = `${geminiEndpoint(model)}?key=${key}`;
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (resp.ok) return await resp.json();
    lastErr = `Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}`;
    if (resp.status === 503 || resp.status === 429) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    throw new Error(lastErr);
  }
  throw new Error(lastErr || "Gemini failed after retries");
}

async function runAgentGemini(opts: RunOpts): Promise<AgentResult> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY ontbreekt");
  const model = GEMINI_MODEL;
  // Gemini 3.x are THINKING models: default thinking is slow + they require the functionCall
  // `thoughtSignature` to be echoed back. Detect 3.x to (a) send thinkingLevel and (b) round-trip
  // the signature. 2.x models (flash-lite) carry neither id nor thoughtSignature, so the same code
  // path is a no-op for them: the verbatim part-echo carries nothing extra and the `if (c.id)`
  // guard below never fires.
  const is3x = /gemini-3/.test(model);
  const thinkingLevel = Deno.env.get("GEMINI_THINKING_LEVEL") || "minimal";

  const contents: Content[] = [...opts.contents];
  const toolCalls: AgentResult["toolCalls"] = [];
  const maxSteps = opts.maxSteps ?? 6;

  for (let step = 0; step < maxSteps; step++) {
    const generationConfig: Record<string, unknown> = {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: 800,
    };
    // Pin the lowest thinking for latency on 3.x (default "medium" is far too slow for a chat
    // agent). 2.x models reject/ignore thinkingLevel, so only send it for 3.x.
    if (is3x) generationConfig.thinkingConfig = { thinkingLevel };

    const body: Record<string, unknown> = {
      system_instruction: { parts: [{ text: opts.system }] },
      contents,
      generationConfig,
    };
    if (opts.tools.length) body.tools = [{ functionDeclarations: opts.tools }];

    const data = await postGemini(model, key, body);
    const parts: Part[] = data?.candidates?.[0]?.content?.parts ?? [];
    // Keep the FULL functionCall parts (with id + sibling thoughtSignature), not just the inner
    // functionCall — the model turn must replay them verbatim or 3.x returns
    // "400: Function call is missing a thought_signature".
    const callParts = parts.filter((p): p is FunctionCallPart => "functionCall" in p);

    if (callParts.length === 0) {
      const text = parts
        .filter((p): p is { text: string } => "text" in p)
        .map((p) => p.text)
        .join("")
        .trim();
      return { text, steps: step + 1, toolCalls };
    }

    // Echo the model's tool-call turn VERBATIM (preserves each part's id + thoughtSignature).
    contents.push({ role: "model", parts: callParts });
    const responseParts: Part[] = [];
    for (const p of callParts) {
      const c = p.functionCall;
      let result: unknown;
      try {
        result = await opts.execute(c.name, c.args || {});
      } catch (e) {
        result = { error: String((e as Error)?.message || e) };
      }
      toolCalls.push({ name: c.name, args: c.args || {}, result });
      // 3.x: the functionResponse must repeat the matching call `id` + exact `name`.
      const fr: { name: string; id?: string; response: Record<string, unknown> } = {
        name: c.name,
        response: { result },
      };
      if (c.id) fr.id = c.id;
      responseParts.push({ functionResponse: fr });
    }
    contents.push({ role: "user", parts: responseParts });

    // B1 (parity with the OpenAI/Groq path): stop after a caller-confirmable commit, skipping
    // the compose model-call. Dormant while provider != gemini, kept identical for a clean flip.
    if (opts.stopOnToolResult && toolCalls.some((t) => opts.stopOnToolResult!(t.name, t.result))) {
      return { text: "", steps: step + 1, toolCalls };
    }
  }

  return { text: "", steps: maxSteps, toolCalls };
}
