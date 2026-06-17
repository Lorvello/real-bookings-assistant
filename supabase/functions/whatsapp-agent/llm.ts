// Tool-calling agent loop with a provider switch.
//   LLM_PROVIDER=openai  -> OpenAI Chat Completions (default model gpt-5-nano: fast + cheap)
//   LLM_PROVIDER=gemini  -> Gemini Flash-Lite (original; kept for easy revert)
// Default is gemini unless LLM_PROVIDER is set. Only this file knows the wire formats.

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
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };
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
}

// Provider dispatch.
export async function runAgent(opts: RunOpts): Promise<AgentResult> {
  const provider = (Deno.env.get("LLM_PROVIDER") || "gemini").toLowerCase();
  if (provider === "openai") return runAgentOpenAI(opts);
  return runAgentGemini(opts);
}

// ---------------------------------------------------------------------------
// OpenAI (Chat Completions, tool-calling). Default gpt-5-nano.
// GPT-5 reasoning models: no custom temperature (only default), use
// max_completion_tokens, reasoning_effort=minimal for speed/cost.
// ---------------------------------------------------------------------------
async function postOpenAI(key: string, body: unknown): Promise<any> {
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (resp.ok) return await resp.json();
    lastErr = `OpenAI ${resp.status}: ${(await resp.text()).slice(0, 300)}`;
    if (resp.status === 429 || resp.status >= 500) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    throw new Error(lastErr);
  }
  throw new Error(lastErr || "OpenAI failed after retries");
}

async function runAgentOpenAI(opts: RunOpts): Promise<AgentResult> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY ontbreekt");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-5-nano";
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

  for (let step = 0; step < maxSteps; step++) {
    const body: Record<string, unknown> = { model, messages, max_completion_tokens: 2000, reasoning_effort: "minimal" };
    if (tools) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const data = await postOpenAI(key, body);
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

  const contents: Content[] = [...opts.contents];
  const toolCalls: AgentResult["toolCalls"] = [];
  const maxSteps = opts.maxSteps ?? 6;

  for (let step = 0; step < maxSteps; step++) {
    const body: Record<string, unknown> = {
      system_instruction: { parts: [{ text: opts.system }] },
      contents,
      generationConfig: { temperature: opts.temperature ?? 0.2, maxOutputTokens: 800 },
    };
    if (opts.tools.length) body.tools = [{ functionDeclarations: opts.tools }];

    const data = await postGemini(GEMINI_MODEL, key, body);
    const parts: Part[] = data?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts
      .filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } => "functionCall" in p)
      .map((p) => p.functionCall);

    if (calls.length === 0) {
      const text = parts
        .filter((p): p is { text: string } => "text" in p)
        .map((p) => p.text)
        .join("")
        .trim();
      return { text, steps: step + 1, toolCalls };
    }

    contents.push({ role: "model", parts: calls.map((c) => ({ functionCall: c })) });
    const responseParts: Part[] = [];
    for (const c of calls) {
      let result: unknown;
      try {
        result = await opts.execute(c.name, c.args || {});
      } catch (e) {
        result = { error: String((e as Error)?.message || e) };
      }
      toolCalls.push({ name: c.name, args: c.args || {}, result });
      responseParts.push({ functionResponse: { name: c.name, response: { result } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return { text: "", steps: maxSteps, toolCalls };
}
