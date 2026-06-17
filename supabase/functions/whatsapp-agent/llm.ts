// Gemini Flash-Lite tool-calling adapter + agent loop.
// Mathews staande afspraak: V1 draait op Gemini Flash-Lite (snel + goedkoop).
// Provider-agnostisch genoeg om later naar Claude/OpenAI te switchen: alleen
// dit bestand kent het Gemini-wireformat.
//
// Geverifieerd 2026-06-17 tegen de live API: request {system_instruction, contents,
// tools:[{functionDeclarations}], generationConfig}; response part = {functionCall:{name,args}}
// of {text}; functionResponse teruggestuurd als content role 'user' met part
// {functionResponse:{name,response}}.

const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";
const endpoint = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

// POST to Gemini with retry on transient 503 (high demand) / 429 (rate). Other
// statuses fail fast. Returns parsed JSON.
async function postGemini(model: string, key: string, body: unknown): Promise<any> {
  const url = `${endpoint(model)}?key=${key}`;
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

/**
 * Run a tool-calling loop until the model returns a text answer (no more tool
 * calls) or maxSteps is hit. Returns the final assistant text + a trace.
 */
export async function runAgent(opts: {
  system: string;
  contents: Content[];
  tools: ToolDecl[];
  execute: ToolExecutor;
  maxSteps?: number;
  temperature?: number;
}): Promise<AgentResult> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY ontbreekt");

  const contents: Content[] = [...opts.contents];
  const toolCalls: AgentResult["toolCalls"] = [];
  const maxSteps = opts.maxSteps ?? 6;

  for (let step = 0; step < maxSteps; step++) {
    const body: Record<string, unknown> = {
      system_instruction: { parts: [{ text: opts.system }] },
      contents,
      generationConfig: { temperature: opts.temperature ?? 0.4, maxOutputTokens: 800 },
    };
    if (opts.tools.length) body.tools = [{ functionDeclarations: opts.tools }];

    const data = await postGemini(MODEL, key, body);
    const parts: Part[] = data?.candidates?.[0]?.content?.parts ?? [];
    const calls = parts
      .filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } =>
        "functionCall" in p)
      .map((p) => p.functionCall);

    if (calls.length === 0) {
      const text = parts
        .filter((p): p is { text: string } => "text" in p)
        .map((p) => p.text)
        .join("")
        .trim();
      return { text, steps: step + 1, toolCalls };
    }

    // Record the model's tool-call turn, then execute and feed results back.
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
      // Flash-Lite returns empty text unless the tool result is wrapped under
      // `result` (verified 2026-06-17). Always wrap.
      responseParts.push({ functionResponse: { name: c.name, response: { result } } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  // Safety stop: too many tool iterations. Caller decides fallback copy.
  return { text: "", steps: maxSteps, toolCalls };
}
